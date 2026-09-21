"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Hand, Loader2, Pencil, Plus, Sparkles } from "lucide-react";
import { AGENT_DRAG_MIME } from "@/lib/workspace-colors";
import { motion, AnimatePresence } from "motion/react";
import type { ChatMessage, SessionSnapshot } from "@/lib/session-types";
import {
  panelAddTabClass,
  panelTabClass,
  panelTabLabelClass,
  panelTabRowClass,
} from "./panel-tab-styles";

const STATUS_LINES = ["Thinking", "Figuring", "Browsing", "Working"] as const;

export type ChatAgentTab = {
  id: string;
  name: string;
  status: SessionSnapshot["status"];
  workspaceColor?: string | null;
  lockedInOtherWorkspace?: boolean;
  linkedWorkspaceName?: string;
};

export type ChatWorkspaceTab = {
  id: string;
  name: string;
  sessionCount: number;
  memberColors: string[];
};

type ChatPanelProps = {
  session: SessionSnapshot | null;
  title?: string;
  messages?: ChatMessage[];
  statusOverride?: SessionSnapshot["status"];
  viewMode?: "agent" | "workspace";
  agentTabs?: ChatAgentTab[];
  activeAgentId?: string | null;
  workspaceTabs?: ChatWorkspaceTab[];
  activeWorkspaceId?: string | null;
  activeWorkspaceName?: string | null;
  onSelectAgent?: (id: string) => void;
  onAddAgent?: () => void;
  onRenameAgent?: (id: string) => void;
  onDropAgentOnWorkspace?: (workspaceId: string, agentId: string) => void;
  onPickAgentWorkspaceColor?: (agentId: string) => void;
  onSelectWorkspace?: (id: string) => void;
  onAddWorkspace?: () => void;
  onRenameWorkspace?: (id: string) => void;
  linkError?: string | null;
  chatReady?: boolean;
  onSend: (message: string) => Promise<void>;
  onResume: () => Promise<void>;
  onFocusInput?: () => void;
};

function statusDot(status: SessionSnapshot["status"] | undefined) {
  if (status === "running") return "bg-emerald-400 shadow-[0_0_8px_oklch(0.72_0.17_155/50%)]";
  if (status === "waiting_for_user") return "bg-amber-400 shadow-[0_0_8px_oklch(0.78_0.14_75/50%)]";
  return "bg-muted-foreground/40";
}

export function ChatPanel({
  session,
  title = "Agent",
  messages: messagesOverride,
  statusOverride,
  viewMode = "agent",
  agentTabs = [],
  activeAgentId,
  workspaceTabs = [],
  activeWorkspaceId,
  activeWorkspaceName,
  onSelectAgent,
  onAddAgent,
  onRenameAgent,
  onDropAgentOnWorkspace,
  onPickAgentWorkspaceColor,
  onSelectWorkspace,
  onAddWorkspace,
  onRenameWorkspace,
  linkError,
  chatReady: chatReadyProp,
  onSend,
  onResume,
  onFocusInput,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const [dropTargetWorkspaceId, setDropTargetWorkspaceId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const status = statusOverride ?? session?.status;
  const messages = messagesOverride ?? session?.messages ?? [];
  const isRunning = status === "running";
  const waiting = status === "waiting_for_user";
  const thinking = isRunning || sending;
  let chatReady = false;
  if (chatReadyProp !== undefined) {
    chatReady = chatReadyProp;
  } else if (messagesOverride !== undefined) {
    chatReady = true;
  } else {
    chatReady = Boolean(session);
  }
  const disabled = !chatReady || thinking || waiting;
  const hasMessages = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, status, thinking]);

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

  const headerTitle =
    viewMode === "workspace"
      ? workspaceTabs.find((w) => w.id === activeWorkspaceId)?.name ?? title
      : agentTabs.find((a) => a.id === activeAgentId)?.name ?? title;

  const composerPlaceholder =
    viewMode === "workspace"
      ? "Message all linked agents in this workspace…"
      : waiting
        ? "Resume to continue…"
        : "Ask the agent to browse, search, or act…";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={panelTabRowClass()}>
        {agentTabs.map((agent) => {
          const isActive = activeAgentId === agent.id;

          return (
            <div
              key={agent.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(AGENT_DRAG_MIME, agent.id);
                event.dataTransfer.effectAllowed = "copyMove";
              }}
              className={panelTabClass(isActive, "chat", "sm")}
              style={
                agent.workspaceColor
                  ? { borderTopWidth: 2, borderTopColor: agent.workspaceColor }
                  : undefined
              }
            >
              {agent.workspaceColor ? (
                <button
                  type="button"
                  title="Change workspace color"
                  onClick={() => onPickAgentWorkspaceColor?.(agent.id)}
                  className="flex w-6 shrink-0 items-center justify-center border-r border-border"
                  aria-label={`Color for ${agent.name}`}
                >
                  <span
                    className="size-2 rounded-full border border-white/20"
                    style={{ backgroundColor: agent.workspaceColor }}
                  />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onSelectAgent?.(agent.id)}
                className={`${panelTabLabelClass(isActive, "sm")} flex items-center gap-1.5`}
              >
                {!agent.workspaceColor && (
                  <span className={`size-1.5 shrink-0 rounded-full ${statusDot(agent.status)}`} aria-hidden />
                )}
                {agent.name}
              </button>
              <button
                type="button"
                aria-label={`Rename ${agent.name}`}
                onClick={() => onRenameAgent?.(agent.id)}
                className="flex w-6 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-2.5" />
              </button>
            </div>
          );
        })}
        {onAddAgent && (
          <button type="button" onClick={onAddAgent} aria-label="New agent" className={panelAddTabClass("chat")}>
            <Plus className="size-3" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {(workspaceTabs.length > 0 || onAddWorkspace) && (
        <div className={`${panelTabRowClass()} mt-0`}>
          {workspaceTabs.map((ws) => {
            const isActive = viewMode === "workspace" && activeWorkspaceId === ws.id;
            const isDropTarget = dropTargetWorkspaceId === ws.id;

            return (
              <div
                key={ws.id}
                className={`${panelTabClass(isActive, "chat", "sm")} ${isDropTarget ? "ring-1 ring-foreground/40" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  setDropTargetWorkspaceId(ws.id);
                }}
                onDragLeave={() => setDropTargetWorkspaceId(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropTargetWorkspaceId(null);
                  const agentId = event.dataTransfer.getData(AGENT_DRAG_MIME);
                  if (agentId) onDropAgentOnWorkspace?.(ws.id, agentId);
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectWorkspace?.(ws.id)}
                  className={`${panelTabLabelClass(isActive, "sm")} flex items-center gap-1.5 font-mono`}
                >
                  {ws.memberColors.map((color, index) => (
                    <span
                      key={`${ws.id}-${index}`}
                      className="size-1.5 shrink-0 rounded-full border border-white/10"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                  ))}
                  {ws.name}
                </button>
                <button
                  type="button"
                  aria-label={`Rename ${ws.name}`}
                  onClick={() => onRenameWorkspace?.(ws.id)}
                  className="flex w-6 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-2.5" />
                </button>
              </div>
            );
          })}
          {onAddWorkspace && (
            <button
              type="button"
              onClick={onAddWorkspace}
              aria-label="New workspace"
              className={panelAddTabClass("chat")}
            >
              <Plus className="size-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col border border-border bg-[oklch(0.11_0.007_285)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className={`size-1.5 shrink-0 rounded-full ${statusDot(status)}`} aria-hidden />
            <span className="text-sm font-medium tracking-tight">{headerTitle}</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {waiting ? "Paused" : isRunning ? "Active" : "Ready"}
          </span>
        </div>

        {linkError && (
          <p className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {linkError}
          </p>
        )}
        <p className="shrink-0 border-b border-border/60 px-4 py-1.5 font-mono text-[9px] text-muted-foreground">
          Drag an agent tab onto a workspace to link · drop again on the same workspace to unlink
        </p>

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
            {messages.map((message) => {
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
                        {title}
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
            placeholder={composerPlaceholder}
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
    </div>
  );
}
