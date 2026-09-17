"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Hand, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { SessionSnapshot } from "@/lib/session-types";

const STATUS_LINES = ["Thinking", "Figuring", "Browsing", "Working"] as const;

type ChatPanelProps = {
  session: SessionSnapshot | null;
  onSend: (message: string) => Promise<void>;
  onResume: () => Promise<void>;
  onFocusInput?: () => void;
};

function statusDot(status: SessionSnapshot["status"] | undefined) {
  if (status === "running") return "bg-emerald-400 shadow-[0_0_8px_oklch(0.72_0.17_155/50%)]";
  if (status === "waiting_for_user") return "bg-amber-400 shadow-[0_0_8px_oklch(0.78_0.14_75/50%)]";
  return "bg-muted-foreground/40";
}

export function ChatPanel({ session, onSend, onResume, onFocusInput }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isRunning = session?.status === "running";
  const waiting = session?.status === "waiting_for_user";
  const thinking = isRunning || sending;
  const disabled = !session || thinking || waiting;
  const hasMessages = (session?.messages.length ?? 0) > 0;

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

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

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
    <div className="flex h-full min-h-0 flex-col border border-border bg-[oklch(0.11_0.007_285)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`size-1.5 shrink-0 rounded-full ${statusDot(session?.status)}`}
            aria-hidden
          />
          <span className="text-sm font-medium tracking-tight">Agent</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {waiting ? "Paused" : isRunning ? "Active" : "Ready"}
        </span>
      </div>

      {/* Messages */}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          {!hasMessages && !thinking && (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-9 items-center justify-center border border-border bg-card">
                <Sparkles className="size-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-foreground/90">What should I do?</p>
                <p className="max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                  Search the web, fill forms, or navigate sites — I&apos;ll control the browser for you.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-5">
            {session?.messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className={isUser ? "flex justify-end" : ""}
                >
                  {isUser ? (
                    <div className="max-w-[88%] border border-border bg-card px-3 py-2.5">
                      <p className="text-[13px] leading-[1.6] text-foreground">{message.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-[95%]">
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                        Agent
                      </p>
                      <p className="text-[13px] leading-[1.65] text-foreground/90">{message.content}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}

            <AnimatePresence>
              {thinking && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  <Loader2
                    className="size-4 shrink-0 animate-spin text-muted-foreground"
                    aria-label={statusLabel}
                  />
                  <motion.span
                    key={statusLabel}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[13px] text-muted-foreground"
                  >
                    {statusLabel}…
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div ref={bottomRef} className="h-1" />
        </div>

        {/* Bottom fade */}
        <div
          className="pointer-events-none sticky bottom-0 h-6 bg-gradient-to-t from-[oklch(0.11_0.007_285)] to-transparent"
          aria-hidden
        />
      </div>

      {/* Paused banner */}
      {waiting && (
        <div className="shrink-0 border-t border-amber-500/25 bg-amber-500/8 px-4 py-3">
          <p className="text-xs leading-relaxed text-amber-100/80">
            {session?.waitReason ?? "Paused — interact with the browser, then resume."}
          </p>
          <button
            type="button"
            onClick={() => void onResume()}
            className="mt-2.5 inline-flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-100 transition-colors hover:bg-amber-500/20"
          >
            <Hand className="size-3" />
            Resume agent
          </button>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="shrink-0 border-t border-border p-3"
      >
        {sendError && (
          <p className="mb-2 px-1 text-xs text-destructive">{sendError}</p>
        )}
        <div
          className={`flex items-end gap-2 border border-border bg-card p-2 transition-colors ${
            disabled ? "opacity-60" : "focus-within:border-foreground/25"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={onFocusInput}
            placeholder={waiting ? "Resume to continue…" : "Ask the agent to browse, search, or act…"}
            rows={1}
            disabled={disabled}
            className="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] leading-[1.55] outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
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
            className="flex size-8 shrink-0 items-center justify-center bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-25"
            aria-label="Send message"
          >
            <ArrowUp className="size-3.5" strokeWidth={2.5} />
          </button>
        </div>
        <p className="mt-2 px-1 font-mono text-[10px] text-muted-foreground/50">
          Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
