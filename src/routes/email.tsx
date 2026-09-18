import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2, WandSparkles } from "lucide-react";
import { useState } from "react";
import { Disclaimer, EditableOutput, ErrorBanner, Page, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateEmail } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator · AI Workplace Productivity Assistant" },
      { name: "description", content: "Describe the purpose, recipient and details, pick a tone, and get a unique AI-written professional email you can edit and copy." },
      { property: "og:title", content: "Smart Email Generator" },
      { property: "og:description", content: "AI-written professional emails in a formal, friendly or persuasive tone." },
    ],
  }),
  component: EmailPage,
});

const TONES = ["Formal", "Friendly", "Persuasive"] as const;
type Tone = (typeof TONES)[number];

function EmailPage() {
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [details, setDetails] = useState("");
  const [tone, setTone] = useState<Tone>("Formal");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = useServerFn(generateEmail);
  const mutation = useMutation({
    mutationFn: run,
    onSuccess: (res) => {
      if (res.ok) {
        setOutput(res.data.email);
        setError(null);
      } else setError(res.error);
    },
    onError: (e: Error) => setError(e.message || "Something went wrong while contacting the AI."),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) {
      setError("Please describe the purpose of the email before generating.");
      return;
    }
    setError(null);
    mutation.mutate({ data: { purpose, recipient, details, tone } });
  };

  const clearAll = () => {
    setPurpose("");
    setRecipient("");
    setDetails("");
    setOutput("");
    setError(null);
  };

  return (
    <Page>
      <PageHeader title="Smart Email Generator" description="Tell the assistant what the email is for, who it's going to, and the key details. It writes a fresh draft from your input." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <form onSubmit={submit} className="card-surface flex flex-col gap-5 p-5 sm:p-6">
          <div className="grid gap-2">
            <Label htmlFor="purpose">Purpose <span className="text-muted-foreground">(required)</span></Label>
            <Input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Request a deadline extension for the Q3 report" maxLength={2000} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="recipient">Recipient / context</Label>
            <Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. My manager, Thandi, who is under pressure from finance" maxLength={2000} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="details">Details</Label>
            <Textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} rows={5} placeholder="Key points, dates, numbers, constraints, what you want the reader to do..." maxLength={6000} className="resize-y bg-background" />
          </div>
          <div className="grid gap-2">
            <Label>Tone</Label>
            <div role="radiogroup" aria-label="Tone" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tone === t}
                  onClick={() => setTone(t)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    tone === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <ErrorBanner message={error} />

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={mutation.isPending} className="min-w-40">
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              {mutation.isPending ? "Generating..." : "Generate email"}
            </Button>
            <Button type="button" variant="ghost" onClick={clearAll} disabled={mutation.isPending}>
              Clear
            </Button>
          </div>
        </form>

        <div className="card-surface flex flex-col gap-4 p-5 sm:p-6">
          <EditableOutput
            label="Generated email"
            value={output}
            onChange={setOutput}
            onClear={() => setOutput("")}
            rows={18}
            loading={mutation.isPending}
            loadingText="Writing your email..."
            placeholder="Your AI-written email will appear here. You can edit it directly before copying."
          />
          <Disclaimer className="mt-auto" />
        </div>
      </div>
    </Page>
  );
}
