"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Hand, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionSnapshot } from "@/lib/agent/session";

type ChatPanelProps = {
  session: SessionSnapshot | null;
  onSend: (message: string) => Promise<void>;
  onResume: () => Promise<void>;
  onFocusInput?: () => void;
};

export function ChatPanel({ session, onSend, onResume, onFocusInput }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isRunning = session?.status === "running";
  const waiting = session?.status === "waiting_for_user";
  const disabled = !session || isRunning || sending || waiting;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length, session?.status]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || disabled) return;

    setSending(true);
    setSendError(null);
    setInput("");

    try {
      await onSend(message);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Failed to send message");
      setInput(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium">Agent chat</p>
        <p className="text-xs text-muted-foreground">Describe what the browser should do</p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {session?.messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "ml-8 text-right" : "mr-8"}
          >
            <div
              className={
                message.role === "user"
                  ? "inline-block rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-left text-sm text-primary-foreground"
                  : "inline-block rounded-2xl rounded-tl-md border border-border bg-background/80 px-4 py-2.5 text-left text-sm text-foreground"
              }
            >
              {message.content}
            </div>
          </div>
        ))}

        {isRunning && (
          <div className="mr-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Agent is working…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {waiting && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-3 text-sm text-muted-foreground">
            {session?.waitReason ?? "The agent paused for human help."} Use the browser panel, then resume.
          </p>
          <Button className="w-full" onClick={() => void onResume()}>
            <Hand className="size-4" />
            Resume agent
          </Button>
        </div>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="border-t border-border p-4">
        {sendError && (
          <p className="mb-2 text-xs text-destructive">{sendError}</p>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background/60 p-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={onFocusInput}
            placeholder="Open the OpenAI Agents SDK quickstart page…"
            rows={3}
            disabled={disabled}
            className="min-h-[72px] flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit(event);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={disabled || !input.trim()}
            className="shrink-0"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </form>
    </section>
  );
}
