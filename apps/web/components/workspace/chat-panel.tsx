"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Hand, Loader2, Plus, Sparkles } from "lucide-react";
import { AGENT_DRAG_MIME } from "@/lib/workspace-colors";
import { motion, AnimatePresence } from "motion/react";
import type { ChatMessage, SessionSnapshot } from "@/lib/session-types";
import { PanelTabAccent } from "./panel-tab-accent";
import {
  panelAddTabClass,
  panelTabClass,
  panelTabLabelClass,
  panelTabRowClass,
} from "./panel-tab-styles";
import { TabEditPopover } from "./tab-edit-popover";
import { ChatMessageBubble } from "./chat-message";

const STATUS_LINES = ["Thinking", "Figuring", "Browsing", "Working"] as const;

export type ChatAgentTab = {
  id: string;
  name: string;
  status: SessionSnapshot["status"];
  workspaceColor?: string | null;
};

export type ChatWorkspaceTab = {
  id: string;
  name: string;
  color: string;
  sessionCount: number;
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
  onSelectAgent?: (id: string) => void;
  onAddAgent?: () => void;
  onSaveAgentName?: (id: string, name: string) => Promise<void>;
  onDropAgentOnWorkspace?: (workspaceId: string, agentId: string) => void;
  onSelectWorkspace?: (id: string) => void;
  onSaveWorkspace?: (id: string, patch: { name?: string; color?: string }) => Promise<void>;
  onCreateWorkspaceFromAgent?: (agentId: string, workspaceName?: string) => Promise<void>;
  messageAccentColor?: string | null;
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
  onSelectAgent,
  onAddAgent,
  onSaveAgentName,
  onDropAgentOnWorkspace,
  onSelectWorkspace,
  onSaveWorkspace,
  onCreateWorkspaceFromAgent,
  messageAccentColor,
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
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState("#60a5fa");
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
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

  function openAgentEdit(agentId: string, rect: DOMRect, name: string) {
    setEditingWorkspaceId(null);
    setEditingAgentId(agentId);
    setDraftName(name);
    setAnchorRect(rect);
  }

  function openWorkspaceEdit(workspaceId: string, rect: DOMRect, name: string, color: string) {
    setEditingAgentId(null);
    setEditingWorkspaceId(workspaceId);
    setDraftName(name);
    setDraftColor(color);
    setAnchorRect(rect);
  }

  function closeEditor() {
    setEditingAgentId(null);
    setEditingWorkspaceId(null);
    setAnchorRect(null);
  }

  async function saveEditor() {
    const name = draftName.trim();
    if (!name) return;

    try {
      if (editingAgentId && onSaveAgentName) {
        await onSaveAgentName(editingAgentId, name);
      }
      if (editingWorkspaceId && onSaveWorkspace) {
        await onSaveWorkspace(editingWorkspaceId, { name, color: draftColor });
      }
      closeEditor();
    } catch {
      // keep editor open on failure
    }
  }

  async function handleCreateWorkspaceFromEditor() {
    if (!editingAgentId || !onCreateWorkspaceFromAgent) return;
    const name = draftName.trim();
    try {
      if (name && onSaveAgentName) {
        await onSaveAgentName(editingAgentId, name);
      }
      await onCreateWorkspaceFromAgent(editingAgentId, name || undefined);
      closeEditor();
    } catch {
      // keep editor open
    }
  }

  async function handleWorkspaceColorSelect(color: string) {
    if (!editingWorkspaceId || !onSaveWorkspace) return;
    setDraftColor(color);
    try {
      await onSaveWorkspace(editingWorkspaceId, { color });
    } catch {
      const ws = workspaceTabs.find((w) => w.id === editingWorkspaceId);
      if (ws) setDraftColor(ws.color);
    }
  }

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

  const editingAgent = editingAgentId
    ? agentTabs.find((agent) => agent.id === editingAgentId)
    : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TabEditPopover
        open={Boolean(editingAgentId || editingWorkspaceId)}
        anchorRect={anchorRect}
        name={draftName}
        onNameChange={setDraftName}
        onSave={() => void saveEditor()}
        onClose={closeEditor}
        showColors={Boolean(editingWorkspaceId)}
        color={draftColor}
        onColorChange={setDraftColor}
        onColorSelect={(color) => void handleWorkspaceColorSelect(color)}
        showCreateWorkspace={Boolean(
          editingAgentId && !editingAgent?.workspaceColor && onCreateWorkspaceFromAgent,
        )}
        onCreateWorkspace={() => void handleCreateWorkspaceFromEditor()}
        createWorkspaceLabel="Create workspace with this agent"
      />

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
            >
              <PanelTabAccent color={agent.workspaceColor} />
              <button
                type="button"
                onClick={() => onSelectAgent?.(agent.id)}
                onDoubleClick={(event) => {
                  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                  openAgentEdit(agent.id, rect, agent.name);
                }}
                className={`${panelTabLabelClass(isActive, "sm")} flex items-center gap-1.5`}
              >
                {!agent.workspaceColor && (
                  <span className={`size-1.5 shrink-0 rounded-full ${statusDot(agent.status)}`} aria-hidden />
                )}
                {agent.name}
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

      {workspaceTabs.length > 0 && (
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
                <PanelTabAccent color={ws.color} />
                <button
                  type="button"
                  onClick={() => onSelectWorkspace?.(ws.id)}
                  onDoubleClick={(event) => {
                    const rect = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    openWorkspaceEdit(ws.id, rect, ws.name, ws.color);
                  }}
                  className={`${panelTabLabelClass(isActive, "sm")} flex items-center gap-1.5 font-mono`}
                >
                  <span
                    className="size-2 shrink-0 rounded-full border border-white/15"
                    style={{ backgroundColor: ws.color }}
                    aria-hidden
                  />
                  {ws.name}
                  <span className="opacity-60">({ws.sessionCount})</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-[oklch(0.1_0.007_285)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`size-2 shrink-0 rounded-full ${statusDot(status)}`} aria-hidden />
            <span className="truncate text-sm font-semibold tracking-tight">{headerTitle}</span>
          </div>
          <span className="shrink-0 rounded-full bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
            {waiting ? "Paused" : isRunning ? "Working" : "Ready"}
          </span>
        </div>

        {linkError && (
          <p className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {linkError}
          </p>
        )}

        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <div className="px-3 py-4 sm:px-4">
            {!hasMessages && !thinking && (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-4 px-4 text-center">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-card/60 shadow-inner">
                  <Sparkles className="size-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <p className="text-[15px] font-medium text-foreground">Start a task</p>
                  <p className="max-w-[260px] text-[13px] leading-relaxed text-muted-foreground">
                    Describe what to do in the browser. Double-click an agent tab to rename or create a
                    workspace.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  agentLabel={headerTitle}
                  accentColor={messageAccentColor}
                />
              ))}

              <AnimatePresence>
                {thinking && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card/50 px-3.5 py-2.5"
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

            <div ref={bottomRef} className="h-2" />
          </div>

          <div
            className="pointer-events-none sticky bottom-0 h-8 bg-gradient-to-t from-[oklch(0.1_0.007_285)] to-transparent"
            aria-hidden
          />
        </div>

        {waiting && (
          <div className="shrink-0 border-t border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <p className="text-xs leading-relaxed text-amber-100/85">
              {session?.waitReason ?? "Paused — interact with the browser, then resume."}
            </p>
            <button
              type="button"
              onClick={() => void onResume()}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-amber-500/35 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-50 transition-colors hover:bg-amber-500/25"
            >
              <Hand className="size-3.5" />
              Resume agent
            </button>
          </div>
        )}

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="shrink-0 border-t border-border/50 bg-[oklch(0.09_0.006_285)] p-3"
        >
          {sendError && <p className="mb-2 px-1 text-xs text-destructive">{sendError}</p>}
          <div
            className={`flex items-end gap-2 rounded-xl border border-border/70 bg-card/80 p-2 shadow-sm transition-[border-color,box-shadow] ${
              disabled ? "opacity-60" : "focus-within:border-foreground/20 focus-within:shadow-[0_0_0_3px_oklch(0.98_0_0/6%)]"
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
              className="max-h-[120px] min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[13px] leading-[1.55] outline-none placeholder:text-muted-foreground/55 disabled:cursor-not-allowed"
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
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-25"
              aria-label="Send message"
            >
              <ArrowUp className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
