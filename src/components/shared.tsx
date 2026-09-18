import { AlertTriangle, Copy, Check, Eraser } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const DISCLAIMER =
  "AI-generated content may contain errors or incomplete information. Always review and verify AI outputs before using them for professional decisions or communication.";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-dashed bg-background px-3 py-2.5 text-xs leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>{DISCLAIMER}</span>
    </p>
  );
}

export function PageHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("page-enter mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8", className)}>
      {children}
    </div>
  );
}

export function CopyButton({ text, label = "Copy", size = "sm" }: { text: string; label?: string; size?: "sm" | "icon" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!text.trim()) {
      toast.error("Nothing to copy yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Please select the text and copy manually.");
    }
  };
  const Icon = copied ? Check : Copy;
  if (size === "icon") {
    return (
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={copy} aria-label={label}>
        <Icon className="size-3.5" />
      </Button>
    );
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      <Icon className="size-3.5" />
      {copied ? "Copied" : label}
    </Button>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** Editable output area with Copy / Clear controls. */
export function EditableOutput({
  label,
  value,
  onChange,
  onClear,
  placeholder,
  rows = 12,
  loading,
  loadingText = "Generating...",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  placeholder: string;
  rows?: number;
  loading?: boolean;
  loadingText?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <CopyButton text={value} />
          {onClear && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={!value && !loading}>
              <Eraser className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={loading ? "" : placeholder}
          rows={rows}
          disabled={loading}
          className="resize-y bg-background font-sans text-sm leading-relaxed"
          aria-label={label}
        />
        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-background/60">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-foreground" />
              {loadingText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
