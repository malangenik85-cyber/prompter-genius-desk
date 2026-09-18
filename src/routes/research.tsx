import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search, Link2, Eraser } from "lucide-react";
import { useState } from "react";
import { CopyButton, Disclaimer, EditableOutput, ErrorBanner, Page, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { researchTopic } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "AI Research Assistant · AI Workplace Productivity Assistant" },
      { name: "description", content: "Enter a topic or paste an article URL to get an AI-generated summary, key insights and recommendations." },
      { property: "og:title", content: "AI Research Assistant" },
      { property: "og:description", content: "Summaries, key insights and recommendations from any topic or accessible article link." },
    ],
  }),
  component: ResearchPage,
});

type Mode = "topic" | "url";
const EMPTY = { summary: "", insights: "", recommendations: "" };

function ResearchPage() {
  const [mode, setMode] = useState<Mode>("topic");
  const [input, setInput] = useState("");
  const [out, setOut] = useState(EMPTY);
  const [source, setSource] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const run = useServerFn(researchTopic);
  const mutation = useMutation({
    mutationFn: run,
    onSuccess: (res) => {
      if (res.ok) {
        setOut({
          summary: res.data.summary,
          insights: res.data.keyInsights.map((s) => `• ${s}`).join("\n"),
          recommendations: res.data.recommendations.map((s, i) => `${i + 1}. ${s}`).join("\n"),
        });
        setSource(res.data.source);
        setError(null);
      } else setError(res.error);
    },
    onError: (e: Error) => setError(e.message || "Something went wrong while contacting the AI."),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      setError(mode === "url" ? "Please paste a link first." : "Please enter a topic or question first.");
      return;
    }
    setError(null);
    mutation.mutate({ data: { mode, input } });
  };

  const hasOutput = Boolean(out.summary || out.insights || out.recommendations);
  const combined = [`Summary\n${out.summary}`, `Key Insights\n${out.insights}`, `Recommendations\n${out.recommendations}`].join("\n\n");
  const clearResults = () => {
    setOut(EMPTY);
    setSource(undefined);
  };

  return (
    <Page>
      <PageHeader title="AI Research Assistant" description="Ask about a topic or paste a public article link. The assistant reads it and returns a summary, key insights and recommendations." />

      <form onSubmit={submit} className="card-surface flex flex-col gap-4 p-5 sm:p-6">
        <div role="tablist" aria-label="Input type" className="grid w-full max-w-xs grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(["topic", "url"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "topic" ? <Search className="size-3.5" /> : <Link2 className="size-3.5" />}
              {m === "topic" ? "Topic / question" : "Article URL"}
            </button>
          ))}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="research-input">{mode === "topic" ? "Topic or question" : "Website or article URL"}</Label>
          {mode === "topic" ? (
            <Textarea id="research-input" value={input} onChange={(e) => setInput(e.target.value)} rows={3} maxLength={4000} placeholder="e.g. How should a small team run effective asynchronous stand-ups?" className="resize-y bg-background" />
          ) : (
            <Input id="research-input" type="url" inputMode="url" value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} placeholder="https://example.com/article" />
          )}
          {mode === "url" && <p className="text-xs text-muted-foreground">Only publicly accessible pages can be read. If a page is blocked or unreadable, you'll be told rather than given invented content.</p>}
        </div>

        <ErrorBanner message={error} />

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={mutation.isPending} className="min-w-40">
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {mutation.isPending ? (mode === "url" ? "Reading & analysing..." : "Researching...") : "Analyse"}
          </Button>
          <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => { setInput(""); setError(null); clearResults(); }}>
            Clear
          </Button>
        </div>
      </form>

      <section className="card-surface flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Results</h2>
            <p className="text-xs text-muted-foreground">{source ? `Source: ${source}` : "Each section is editable."}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <CopyButton text={hasOutput ? combined : ""} label="Copy all" />
            <Button type="button" variant="ghost" size="sm" onClick={clearResults} disabled={!hasOutput}>
              <Eraser className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <EditableOutput label="Summary" value={out.summary} onChange={(v) => setOut((o) => ({ ...o, summary: v }))} rows={9} loading={mutation.isPending} loadingText="Summarising..." placeholder="A concise summary will appear here." />
          <EditableOutput label="Key Insights" value={out.insights} onChange={(v) => setOut((o) => ({ ...o, insights: v }))} rows={9} loading={mutation.isPending} loadingText="Extracting insights..." placeholder="The most important takeaways will appear here." />
          <EditableOutput label="Recommendations" value={out.recommendations} onChange={(v) => setOut((o) => ({ ...o, recommendations: v }))} rows={9} loading={mutation.isPending} loadingText="Preparing recommendations..." placeholder="Actionable next steps will appear here." />
        </div>

        <Disclaimer />
      </section>
    </Page>
  );
}
