import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Mail, BookOpenText, MessageSquare, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/logo-mark.png";

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, description: "Overview of your tools" },
  { to: "/email", label: "Smart Email Generator", icon: Mail, description: "Draft professional emails in seconds" },
  { to: "/research", label: "AI Research Assistant", icon: BookOpenText, description: "Summaries, insights and recommendations" },
  { to: "/chat", label: "AI Chatbot", icon: MessageSquare, description: "Conversational help for any work task" },
] as const;

function Brand({ onDark = true }: { onDark?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img
        src={logoMark}
        alt=""
        width={816}
        height={816}
        className={cn("size-8 rounded-lg", onDark && "invert")}
      />
      <span className={cn("text-sm font-semibold leading-tight", onDark ? "text-sidebar-primary" : "text-foreground")}>
        AI Workplace
        <span className={cn("block text-[11px] font-medium", onDark ? "text-sidebar-foreground/70" : "text-muted-foreground")}>
          Productivity Assistant
        </span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const SIDEBAR_NOTE =
  "AI-generated content may contain errors or incomplete information. Always review and verify AI outputs before using them for professional decisions or communication.";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <Brand />
        <div className="mt-8 flex-1">
          <NavLinks />
        </div>
        <p className="rounded-lg border border-sidebar-border p-3 text-[11px] leading-relaxed text-sidebar-foreground/70">
          {SIDEBAR_NOTE}
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:hidden">
          <Brand onDark={false} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <div className="mt-8">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
