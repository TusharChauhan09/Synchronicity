"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Hand, Loader2, Plus, Sparkles } from "lucide-react";
import { AGENT_DRAG_MIME } from "@/lib/workspace-colors";
import { AnimatePresence, motion } from "motion/react";
import type { ChatMessage, SessionSnapshot } from "@/lib/session-types";
import { ChatMessageBubble } from "./chat-message";
import { PanelTabAccent } from "./panel-tab-accent";
import {
  panelAddTabClass,
  panelTabClass,
  panelTabLabelClass,
  panelTabRowClass,
} from "./panel-tab-styles";
import { TabEditPopover } from "./tab-edit-popover";

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
  onUnlinkAgent?: (agentId: string) => void;
  onSelectWorkspace?: (id: string) => void;
  onSaveWorkspace?: (id: string, patch: { name?: string; color?: string }) => Promise<void>;
  onCreateWorkspaceFromAgent?: (agentId: string) => Promise<void>;
  onDeleteWorkspace?: (id: string) => Promise<void>;
  linkError?: string | null;
  chatReady?: boolean;
  onSend: (message: string) => Promise<void>;
  onResume: () => Promise<void>;
  onFocusInput?: () => void;
};

function statusDot(status: SessionSnapshot["status"] | undefined) {
  if (status === "running") return "bg-emerald-400";
  if (status === "waiting_for_user") return "bg-amber-400";
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
  onUnlinkAgent,
  onSelectWorkspace,
  onSaveWorkspace,
  onCreateWorkspaceFromAgent,
  onDeleteWorkspace,
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
  const droppedOnWorkspaceRef = useRef(false);
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

  const editingAgent = agentTabs.find((agent) => agent.id === editingAgentId);
  const canMakeWorkspace = Boolean(editingAgentId && !editingAgent?.workspaceColor && onCreateWorkspaceFromAgent);

  const headerTitle =
    viewMode === "workspace"
      ? workspaceTabs.find((w) => w.id === activeWorkspaceId)?.name ?? title
      : agentTabs.find((a) => a.id === activeAgentId)?.name ?? title;

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

  async function handleDeleteWorkspace() {
    if (!editingWorkspaceId || !onDeleteWorkspace) return;
    try {
      await onDeleteWorkspace(editingWorkspaceId);
      closeEditor();
    } catch {
      // keep editor open on failure
    }
  }

  async function handleMakeWorkspace() {
    if (!editingAgentId || !onCreateWorkspaceFromAgent) return;
    const name = draftName.trim();
    try {
      if (name && onSaveAgentName) {
        await onSaveAgentName(editingAgentId, name);
      }
      await onCreateWorkspaceFromAgent(editingAgentId);
      closeEditor();
    } catch {
      // keep editor open on failure
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
  const composerPlaceholder =
    viewMode === "workspace"
      ? "Message every agent in this workspace…"
      : waiting
        ? "Resume to continue…"
        : "Ask the agent to browse, search, or act…";

  return (
    <div className="flex h-full w-full max-w-full min-h-0 min-w-0 flex-col overflow-hidden">
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
        showMakeWorkspace={canMakeWorkspace}
        onMakeWorkspace={() => void handleMakeWorkspace()}
        showRemoveWorkspace={Boolean(editingWorkspaceId && onDeleteWorkspace)}
        onRemoveWorkspace={() => void handleDeleteWorkspace()}
      />

      <div className="min-w-0 max-w-full shrink-0 overflow-hidden">
        <div className={panelTabRowClass()}>
        {agentTabs.map((agent) => {
          const isActive = viewMode === "agent" && activeAgentId === agent.id;

          return (
            <div
              key={agent.id}
              draggable
              onDragStart={(event) => {
                droppedOnWorkspaceRef.current = false;
                event.dataTransfer.setData(AGENT_DRAG_MIME, agent.id);
                event.dataTransfer.effectAllowed = "copyMove";
              }}
              onDragEnd={() => {
                if (!droppedOnWorkspaceRef.current && agent.workspaceColor) {
                  onUnlinkAgent?.(agent.id);
                }
              }}
              className={panelTabClass(isActive, "chat", "sm")}
            >
              <PanelTabAccent color={agent.workspaceColor} />
              <button
                type="button"
                onClick={() => onSelectAgent?.(agent.id)}
                onDoubleClick={(event) => {
                  const rect = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                  openAgentEdit(agent.id, rect, agent.name);
                }}
                className={`${panelTabLabelClass(isActive, "sm")} flex items-center gap-1.5`}
              >
                <span className={`size-1.5 shrink-0 rounded-full ${statusDot(agent.status)}`} aria-hidden />
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
      </div>

      {workspaceTabs.length > 0 && (
        <div className="min-w-0 max-w-full shrink-0 overflow-hidden">
        <div className={panelTabRowClass()}>
          {workspaceTabs.map((ws) => {
            const isActive = viewMode === "workspace" && activeWorkspaceId === ws.id;
            const isDropTarget = dropTargetWorkspaceId === ws.id;

            return (
              <div
                key={ws.id}
                className={`${panelTabClass(isActive, "chat", "sm")} ${isDropTarget ? "ring-1 ring-foreground/30" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  setDropTargetWorkspaceId(ws.id);
                }}
                onDragLeave={() => setDropTargetWorkspaceId(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  droppedOnWorkspaceRef.current = true;
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
                  className={`${panelTabLabelClass(isActive, "sm")} flex items-center gap-1.5`}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: ws.color }}
                    aria-hidden
                  />
                  {ws.name}
                  <span className="opacity-55">{ws.sessionCount}</span>
                </button>
              </div>
            );
          })}
        </div>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip overflow-y-hidden rounded-b-xl border border-border bg-[oklch(0.12_0.008_285)]">
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-3 border-b border-white/6 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`size-1.5 shrink-0 rounded-full ${statusDot(status)}`} aria-hidden />
            <span className="truncate text-sm font-medium tracking-tight">{headerTitle}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {waiting ? "Paused" : isRunning ? "Working" : "Ready"}
          </span>
        </div>

        {linkError && (
          <p className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {linkError}
          </p>
        )}

        <div className="chat-messages-scroll relative min-h-0 min-w-0 w-full max-w-full flex-1">
          <div className="box-border min-w-0 w-full max-w-full px-4 py-4">
            {!hasMessages && !thinking && (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex size-10 items-center justify-center rounded-2xl border border-white/8 bg-card">
                  <Sparkles className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-foreground/90">What should I do?</p>
                  <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                    Search, fill forms, or open a site. Double-click an agent tab to name it or start a workspace.
                  </p>
                </div>
              </div>
            )}

            <div className="min-w-0 space-y-4">
              {messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  agentLabel={headerTitle}
                />
              ))}

              <AnimatePresence>
                {thinking && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex max-w-full min-w-0 items-center gap-2.5 rounded-2xl rounded-bl-md border border-white/8 bg-[oklch(0.16_0.01_285)] px-3.5 py-2.5"
                  >
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-label={statusLabel} />
                    <motion.span
                      key={statusLabel}
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
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
        </div>

        {waiting && (
          <div className="shrink-0 border-t border-amber-500/20 bg-amber-500/8 px-4 py-3">
            <p className="text-xs leading-relaxed text-amber-100/85">
              {session?.waitReason ?? "Paused — use the browser, then resume."}
            </p>
            <button
              type="button"
              onClick={() => void onResume()}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100 hover:bg-amber-500/20"
            >
              <Hand className="size-3" />
              Resume agent
            </button>
          </div>
        )}

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="min-w-0 shrink-0 border-t border-white/6 p-3"
        >
          {sendError && <p className="mb-2 px-1 text-xs text-destructive">{sendError}</p>}
          <div
            className={`flex min-w-0 items-end gap-2 rounded-xl border border-white/8 bg-[oklch(0.1_0.007_285)] p-2 ${
              disabled ? "opacity-60" : "focus-within:border-white/18"
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
              className="max-h-[120px] min-h-[36px] min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] leading-[1.55] outline-none placeholder:text-muted-foreground/55 disabled:cursor-not-allowed"
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
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background disabled:opacity-25"
              aria-label="Send message"
            >
              <ArrowUp className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
