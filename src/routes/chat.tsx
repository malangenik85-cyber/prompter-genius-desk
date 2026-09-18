import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse, MessageActions } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit, type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { CopyButton, Disclaimer, ErrorBanner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import logoMark from "@/assets/logo-mark.png";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Chatbot · AI Workplace Productivity Assistant" },
      { name: "description", content: "A real conversational AI for workplace questions. Send, edit, copy and clear messages. Nothing is stored." },
      { property: "og:title", content: "AI Chatbot" },
      { property: "og:description", content: "Conversational AI help for any workplace task." },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Help me plan a 30-minute weekly team meeting agenda",
  "Turn these notes into a clear status update",
  "How do I give constructive feedback to a peer?",
];

function messageText(m: UIMessage) {
  return m.parts.filter((p) => p.type === "text").map((p) => p.text).join("");
}

function ChatPage() {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, setMessages, status, error, stop, clearError } = useChat({ transport });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy && !editingId) textareaRef.current?.focus();
  }, [busy, editingId]);

  const handleSubmit = (msg: PromptInputMessage) => {
    const text = msg.text.trim();
    if (!text) {
      setInputError("Please type a message before sending.");
      return;
    }
    setInputError(null);
    clearError();
    void sendMessage({ text });
  };

  const startEdit = (m: UIMessage) => {
    setEditingId(m.id);
    setDraft(messageText(m));
  };

  const saveEdit = (index: number) => {
    const text = draft.trim();
    if (!text) return;
    setMessages(messages.slice(0, index));
    setEditingId(null);
    void sendMessage({ text });
  };

  const clearChat = () => {
    stop();
    setMessages([]);
    setEditingId(null);
    clearError();
  };

  const lastIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <div className="page-enter mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-4xl flex-col md:h-screen">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">AI Chatbot</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Ask anything work-related. This conversation lives only in this tab.</p>
        </div>
        <Button variant="outline" size="sm" onClick={clearChat} disabled={messages.length === 0 && !error}>
          <Trash2 className="size-3.5" />
          Clear chat
        </Button>
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
          {messages.length === 0 && (
            <ConversationEmptyState
              className="h-full"
              icon={<img src={logoMark} alt="" width={816} height={816} className="size-14" />}
              title="What are you working on?"
              description="Drafts, plans, feedback, prioritisation, tricky conversations. Every reply is generated for your exact question."
            >
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSubmit({ text: s, files: [] })}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          )}

          {messages.map((m, i) => {
            const text = messageText(m);
            const isEditing = editingId === m.id;
            return (
              <Message key={m.id} from={m.role}>
                {isEditing ? (
                  <div className="ml-auto flex w-full max-w-xl flex-col gap-2">
                    <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus className="bg-background" aria-label="Edit message" />
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="size-3.5" /> Cancel
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(i)} disabled={!draft.trim() || busy}>
                        <Check className="size-3.5" /> Save & resend
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                    {m.role === "assistant" ? (
                      m.parts.map((part, idx) =>
                        part.type === "text" ? <MessageResponse key={idx}>{part.text}</MessageResponse> : null,
                      )
                    ) : (
                      <p className="whitespace-pre-wrap">{text}</p>
                    )}
                  </MessageContent>
                )}
                {!isEditing && text && !(busy && m.role === "assistant" && i === messages.length - 1) && (
                  <MessageActions className="text-muted-foreground group-[.is-user]:justify-end">
                    <CopyButton text={text} size="icon" label="Copy message" />
                    {m.role === "user" && (
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => startEdit(m)} disabled={busy} aria-label="Edit message">
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                  </MessageActions>
                )}
              </Message>
            );
          })}

          {status === "submitted" && lastIsUser && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer className="text-sm">Thinking...</Shimmer>
              </MessageContent>
            </Message>
          )}

          {error && <ErrorBanner message={error.message || "The assistant could not respond. Please try again."} />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6 sm:pb-6">
        {inputError && <div className="mb-2"><ErrorBanner message={inputError} /></div>}
        <PromptInput onSubmit={handleSubmit} className="bg-background shadow-card">
          <PromptInputTextarea ref={textareaRef} placeholder="Message the assistant... (Enter to send, Shift+Enter for a new line)" onChange={() => inputError && setInputError(null)} />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
        <Disclaimer className="mt-3" />
      </div>
    </div>
  );
}
