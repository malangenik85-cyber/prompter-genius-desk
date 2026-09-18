import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ShieldCheck, Zap, PenLine } from "lucide-react";
import { NAV_ITEMS } from "@/components/app-shell";
import { Disclaimer, Page, PageHeader } from "@/components/shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · AI Workplace Productivity Assistant" },
      { name: "description", content: "Choose a tool: Smart Email Generator, AI Research Assistant, or AI Chatbot. Real AI, nothing stored." },
      { property: "og:title", content: "Dashboard · AI Workplace Productivity Assistant" },
      { property: "og:description", content: "Draft emails, research topics and chat with a workplace AI assistant." },
    ],
  }),
  component: Dashboard,
});

const PRINCIPLES = [
  { icon: Zap, title: "Real AI, every time", text: "Every result is generated live from your exact input. Nothing is templated or pre-written." },
  { icon: PenLine, title: "Editable by design", text: "All outputs can be edited in place, copied with one click, and cleared when you're done." },
  { icon: ShieldCheck, title: "Nothing is stored", text: "No accounts, no database. Your prompts, emails, links and chats stay in this browser tab only." },
];

function Dashboard() {
  const tools = NAV_ITEMS.filter((t) => t.to !== "/");
  return (
    <Page>
      <PageHeader
        title="Good to see you."
        description="Pick a tool to get started. Each one sends your input to a real AI model and returns a response tailored to what you wrote."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.to} to={tool.to} className="card-surface card-interactive group flex flex-col justify-between gap-8 p-5">
            <div className="flex items-start justify-between">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <tool.icon className="size-5" />
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{tool.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="card-surface grid gap-6 p-5 sm:grid-cols-3 sm:p-6">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="flex gap-3">
            <p.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          </div>
        ))}
      </section>

      <Disclaimer />
    </Page>
  );
}
