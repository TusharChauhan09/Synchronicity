"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Hand } from "lucide-react";
import { motion } from "motion/react";
import { DotmTriangle1 } from "@/components/ui/dotm-triangle-1";
import type { SessionSnapshot } from "@/lib/agent/session";

const STATUS_LINES = ["Thinking", "Figuring", "Browsing", "Working"] as const;

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
  const [statusIndex, setStatusIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isRunning = session?.status === "running";
  const waiting = session?.status === "waiting_for_user";
  const thinking = isRunning || sending;
  const disabled = !session || thinking || waiting;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length, session?.status, thinking]);

  useEffect(() => {
    if (!thinking) {
      setStatusIndex(0);
      return;
    }

    const id = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % STATUS_LINES.length);
    }, 2200);

    return () => window.clearInterval(id);
  }, [thinking]);

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

  const statusLabel = sending ? "Sending" : STATUS_LINES[statusIndex];

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden border border-border bg-background">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Chat
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {session?.messages.map((message) => {
            const isUser = message.role === "user";

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={isUser ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    isUser
                      ? "max-w-[94%] bg-foreground px-3 py-2 text-[13px] leading-[1.55] text-background"
                      : "max-w-[94%] text-[13px] leading-[1.55] text-foreground/90"
                  }
                >
                  {message.content}
                </div>
              </motion.div>
            );
          })}

          {thinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center">
                <DotmTriangle1
                  dotSize={3}
                  cellPadding={1}
                  speed={1.2}
                  muted
                  ariaLabel={statusLabel}
                />
              </span>
              <motion.span
                key={statusLabel}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[13px]"
              >
                {statusLabel}…
              </motion.span>
            </motion.div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {waiting && (
        <div className="shrink-0 border-t border-border px-3 py-2.5">
          <p className="mb-2 text-xs leading-snug text-muted-foreground">
            {session?.waitReason ?? "Paused — take over the browser, then resume."}
          </p>
          <button
            type="button"
            onClick={() => void onResume()}
            className="flex w-full items-center justify-center gap-1.5 border border-border py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-foreground hover:bg-muted"
          >
            <Hand className="size-3" />
            Resume
          </button>
        </div>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="shrink-0 border-t border-border p-3">
        {sendError && <p className="mb-2 text-xs text-destructive">{sendError}</p>}
        <div className="flex items-end gap-2 border border-border bg-card p-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={onFocusInput}
            placeholder="Message the agent…"
            rows={2}
            disabled={disabled}
            className="min-h-11 flex-1 resize-none bg-transparent px-1 text-[13px] leading-[1.55] outline-none placeholder:text-muted-foreground disabled:opacity-50"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit(event);
              }
            }}
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="flex size-7 shrink-0 items-center justify-center border border-border bg-foreground text-background disabled:opacity-40"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </form>
    </section>
  );
}
