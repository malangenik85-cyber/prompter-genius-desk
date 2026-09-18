import { createServerFn } from "@tanstack/react-start";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const EmailInput = z.object({
  purpose: z.string().trim().min(1).max(2000),
  recipient: z.string().trim().max(2000),
  details: z.string().trim().max(6000),
  tone: z.enum(["Formal", "Friendly", "Persuasive"]),
});

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EmailInput.parse(input))
  .handler(async ({ data }): Promise<AiResult<{ email: string }>> => {
    const { createLovableResponsesProvider, CHAT_MODEL, RESPONSES_PROVIDER_OPTIONS, describeAiError } =
      await import("./ai-gateway.server");
    try {
      const lovable = createLovableResponsesProvider();
      const result = streamText({
        model: lovable.responses(CHAT_MODEL),
        system: [
          "You are an expert workplace communication assistant. Write one complete, ready-to-send professional email.",
          "Output plain text only: first line 'Subject: ...', a blank line, then the greeting, body and sign-off.",
          "Do not include markdown, commentary, options, or placeholders other than [Your Name] where a signature is needed.",
          "Base every sentence on the user's actual purpose, recipient context and details. Do not invent facts, dates or figures that were not provided.",
          "Keep it concise: usually 80-220 words.",
        ].join(" "),
        prompt: [
          `Task: write an email.`,
          `Tone: ${data.tone}.`,
          `Purpose: ${data.purpose}`,
          `Recipient / context: ${data.recipient || "Not specified"}`,
          `Key details to include: ${data.details || "None provided beyond the purpose"}`,
        ].join("\n"),
        providerOptions: RESPONSES_PROVIDER_OPTIONS,
      });
      const email = (await result.text).trim();
      if (!email) return { ok: false, error: "The AI returned an empty response. Please try again." };
      return { ok: true, data: { email } };
    } catch (error) {
      console.error("generateEmail failed", error);
      return { ok: false, error: describeAiError(error) };
    }
  });

const ResearchInput = z.object({
  mode: z.enum(["topic", "url"]),
  input: z.string().trim().min(1).max(4000),
});

const ResearchSchema = z.object({
  summary: z.string(),
  keyInsights: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const MAX_PAGE_CHARS = 40_000;

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|p|div|li|h[1-6]|tr|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

async function fetchArticle(rawUrl: string): Promise<{ ok: true; text: string; title: string } | { ok: false; error: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl.match(/^https?:\/\//i) ? rawUrl : `https://${rawUrl}`);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL. Please check it and try again." };
  }
  if (!/^https?:$/.test(url.protocol)) return { ok: false, error: "Only http and https links are supported." };

  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WorkplaceAssistant/1.0; research summarizer)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
    });
    if (!res.ok) {
      return { ok: false, error: `The page could not be accessed (HTTP ${res.status}). It may be private, blocked, or no longer available.` };
    }
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) {
      return { ok: false, error: `The link returned "${type.split(";")[0] || "unknown content"}", which this tool cannot read. Only web pages and plain-text articles are supported.` };
    }
    const html = await res.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const text = type.includes("text/plain") ? html.trim() : htmlToText(html);
    if (text.length < 200) {
      return { ok: false, error: "The page was reached but contained almost no readable text (it may require JavaScript or a login). Paste the article text as a topic instead." };
    }
    return { ok: true, text: text.slice(0, MAX_PAGE_CHARS), title };
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, error: "The page took too long to respond (over 15 seconds). Please try again or use a different link." };
    }
    return { ok: false, error: "The page could not be reached. Check that the link is public and correct." };
  }
}

export const researchTopic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ResearchInput.parse(input))
  .handler(async ({ data }): Promise<AiResult<z.infer<typeof ResearchSchema> & { source?: string }>> => {
    const { createLovableResponsesProvider, CHAT_MODEL, RESPONSES_PROVIDER_OPTIONS, describeAiError } =
      await import("./ai-gateway.server");

    let prompt: string;
    let source: string | undefined;
    if (data.mode === "url") {
      const page = await fetchArticle(data.input);
      if (!page.ok) return { ok: false, error: page.error };
      source = page.title || data.input;
      prompt = [
        `Analyze the following article fetched from ${data.input}.`,
        page.title ? `Page title: ${page.title}` : "",
        "Base the summary, insights and recommendations strictly on this content. If the content looks truncated, incomplete, or is not an article (e.g. a login page or error), say so explicitly in the summary rather than guessing.",
        "--- ARTICLE CONTENT START ---",
        page.text,
        "--- ARTICLE CONTENT END ---",
      ]
        .filter(Boolean)
        .join("\n");
    } else {
      prompt = [
        `Research topic or question: ${data.input}`,
        "Provide a research briefing on exactly this topic for a workplace audience. If the topic is ambiguous, state the interpretation you used. If you are uncertain about specific facts, say so rather than inventing details.",
      ].join("\n");
    }

    try {
      const lovable = createLovableResponsesProvider();
      const result = streamText({
        model: lovable.responses(CHAT_MODEL),
        system: [
          "You are a rigorous research analyst for busy professionals.",
          "Return a summary (1-3 short paragraphs of plain text), 4-7 key insights (each one clear sentence), and 3-6 actionable recommendations (each one sentence).",
          "No markdown formatting inside strings. Be specific to the provided topic or article; never produce generic filler.",
        ].join(" "),
        output: Output.object({ schema: ResearchSchema }),
        prompt,
        providerOptions: RESPONSES_PROVIDER_OPTIONS,
      });
      const output = await result.output;
      return { ok: true, data: { ...output, source } };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        console.error("researchTopic: malformed output", error.text);
        return { ok: false, error: "The AI response could not be structured into sections. Please try again." };
      }
      console.error("researchTopic failed", error);
      return { ok: false, error: describeAiError(error) };
    }
  });
