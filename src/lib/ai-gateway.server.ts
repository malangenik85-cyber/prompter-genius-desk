import { createOpenAI } from "@ai-sdk/openai";

export const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";
export const CHAT_MODEL = "openai/gpt-6-astra";

export const RESPONSES_PROVIDER_OPTIONS = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let runIdResolved = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });

  const publishRunId = (value?: string) => {
    const nextRunId = value?.trim() || undefined;
    if (!runId && nextRunId) runId = nextRunId;
    if (!runIdResolved) {
      runIdResolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publishRunId(runId);

  return {
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      try {
        const response = await fetch(input, { ...init, headers });
        publishRunId(response.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publishRunId(undefined);
        throw error;
      }
    }) as typeof fetch,
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  };
}

/** Responses-API provider for openai/* models via Lovable AI Gateway. */
export function createLovableResponsesProvider(initialRunId?: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return Object.assign(provider, {
    getRunId: runIdFetch.getRunId,
    waitForRunId: runIdFetch.waitForRunId,
  });
}

export function getLovableAiGatewayRunId(request: Request) {
  return request.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
}

export function getLovableAiGatewayResponseHeaders(providerHeaders: HeadersInit | undefined, init?: HeadersInit) {
  const headers = new Headers(init);
  const exposed = new Set(
    (headers.get("Access-Control-Expose-Headers") ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean),
  );
  new Headers(providerHeaders).forEach((value, name) => {
    if (name.toLowerCase().startsWith("x-lovable-aig-")) {
      headers.set(name, value);
      exposed.add(name);
    }
  });
  headers.forEach((_, name) => {
    if (name.toLowerCase().startsWith("x-lovable-aig-")) exposed.add(name);
  });
  if (exposed.size > 0) headers.set("Access-Control-Expose-Headers", Array.from(exposed).join(", "));
  return headers;
}

export async function withLovableAiGatewayRunIdHeader(
  response: Response,
  gateway: { getRunId: () => string | undefined; waitForRunId: () => Promise<string | undefined> },
  init?: HeadersInit,
) {
  if (!response.body) {
    const runId = gateway.getRunId();
    const headers = getLovableAiGatewayResponseHeaders(undefined, response.headers);
    new Headers(init).forEach((v, n) => headers.set(n, v));
    if (runId) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  const reader = response.body.getReader();
  const firstChunk = reader.read();
  const runId = await gateway.waitForRunId();
  const headers = getLovableAiGatewayResponseHeaders(undefined, response.headers);
  new Headers(init).forEach((v, n) => headers.set(n, v));
  if (runId) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);

  const body = new ReadableStream({
    async start(controller) {
      try {
        const first = await firstChunk;
        if (first.done) {
          controller.close();
          return;
        }
        controller.enqueue(first.value);
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          controller.enqueue(chunk.value);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason?: unknown) {
      return reader.cancel(reason);
    },
  });

  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

/** Map gateway/SDK failures to a clear, user-facing message. */
export function describeAiError(error: unknown): string {
  const err = error as { statusCode?: number; status?: number; responseBody?: string; message?: string } | null;
  const status = err?.statusCode ?? err?.status;
  let upstream = "";
  if (typeof err?.responseBody === "string") {
    try {
      const parsed = JSON.parse(err.responseBody) as { error?: { message?: string } | string; message?: string };
      upstream =
        (typeof parsed.error === "object" ? parsed.error?.message : parsed.error) ?? parsed.message ?? "";
    } catch {
      /* ignore */
    }
  }
  switch (status) {
    case 400:
      return `The AI service rejected this request${upstream ? `: ${upstream}` : "."} Try shortening or simplifying your input.`;
    case 401:
      return "The AI service is not configured correctly (missing or invalid API key).";
    case 402:
      return upstream || "AI credits are exhausted. The workspace owner needs to add credits before the assistant can respond.";
    case 403:
      return upstream || "AI access is blocked by workspace policy. A workspace admin needs to enable it.";
    case 429:
      return "The AI service is busy right now (rate limited). Please wait a moment and try again.";
    default:
      if (status && status >= 500) return "The AI service had a temporary problem. Please try again in a moment.";
      return err?.message ? `AI request failed: ${err.message}` : "AI request failed. Please try again.";
  }
}
