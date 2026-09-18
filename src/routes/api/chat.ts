import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  CHAT_MODEL,
  RESPONSES_PROVIDER_OPTIONS,
  createLovableResponsesProvider,
  describeAiError,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
  LOVABLE_AIG_RUN_ID_HEADER,
} from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = [
  "You are the AI Workplace Productivity Assistant: a practical, professional helper for workplace tasks such as writing, planning, meetings, analysis, communication, prioritisation and problem-solving.",
  "Respond directly to the user's actual message and the conversation so far. Be concise, structured and specific; use short markdown headings or bullet lists only when they aid clarity.",
  "Ask a brief clarifying question when the request is genuinely ambiguous. Never fabricate facts, statistics or sources; say when you are unsure.",
].join(" ");

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let messages: UIMessage[];
        try {
          const body = (await request.json()) as { messages?: UIMessage[] };
          messages = Array.isArray(body.messages) ? body.messages : [];
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }
        if (messages.length === 0) {
          return Response.json({ error: "Please enter a message first." }, { status: 400 });
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        let lovable: ReturnType<typeof createLovableResponsesProvider>;
        try {
          lovable = createLovableResponsesProvider(initialRunId);
        } catch (error) {
          return Response.json({ error: describeAiError(error) }, { status: 500 });
        }

        const result = streamText({
          model: lovable.responses(CHAT_MODEL),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          providerOptions: RESPONSES_PROVIDER_OPTIONS,
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          onError: (error) => describeAiError(error),
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { [LOVABLE_AIG_RUN_ID_HEADER]: initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, lovable);
      },
    },
  },
});
