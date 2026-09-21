"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserPanel } from "./browser-panel";
import { ChatPanel } from "./chat-panel";
import { SiteLoader } from "./site-loader";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { authClient } from "@repo/auth/client";
import type { SessionSnapshot, WorkspaceSnapshot } from "@/lib/session-types";

type ViewMode = "agent" | "workspace";

async function destroySession(sessionId: string) {
  await api(`/api/session/${sessionId}`, { method: "DELETE" }).catch(() => undefined);
}

function formatTabUrl(url?: string) {
  if (!url) return "new tab";
  return url.replace(/^https?:\/\//, "") || "new tab";
}

function normalizeWorkspace(ws: WorkspaceSnapshot): WorkspaceSnapshot {
  return { ...ws, sessionColors: ws.sessionColors ?? {} };
}

export function WorkspaceShell() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Record<string, SessionSnapshot>>({});
  const [sessionOrder, setSessionOrder] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<Record<string, WorkspaceSnapshot>>({});
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("agent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualControl, setManualControl] = useState(false);
  const [renameTarget, setRenameTarget] = useState<
    | { kind: "agent"; id: string }
    | { kind: "workspace"; id: string }
    | { kind: "agent-color"; workspaceId: string; sessionId: string }
    | null
  >(null);
  const [renameValue, setRenameValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const bootIdRef = useRef(0);

  const activeSession = activeAgentId ? sessions[activeAgentId] ?? null : null;
  const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] ?? null : null;

  const workspaceList = useMemo(
    () => Object.values(workspaces).sort((a, b) => a.name.localeCompare(b.name)),
    [workspaces],
  );

  const agentList = useMemo(
    () => sessionOrder.map((id) => sessions[id]).filter(Boolean) as SessionSnapshot[],
    [sessionOrder, sessions],
  );

  const waiting = activeSession?.status === "waiting_for_user";

  const controllable = Boolean(
    activeSession &&
      !loading &&
      (waiting || (manualControl && activeSession.status === "idle")),
  );

  const selectAgent = useCallback((id: string) => {
    setActiveAgentId(id);
    setViewMode("agent");
  }, []);

  const selectWorkspace = useCallback(
    (id: string) => {
      setActiveWorkspaceId(id);
      setViewMode("workspace");
      setLinkError(null);
      const ws = workspaces[id];
      if (ws?.sessionIds.length) {
        setActiveAgentId((current) =>
          current && ws.sessionIds.includes(current) ? current : (ws.sessionIds[0] ?? null),
        );
      }
    },
    [workspaces],
  );

  const selectBrowserTab = useCallback((id: string) => {
    setActiveAgentId(id);
  }, []);

  const refreshSession = useCallback(async (sessionId: string) => {
    try {
      const data = await api<SessionSnapshot>(`/api/session/${sessionId}`);
      setSessions((prev) => ({ ...prev, [sessionId]: data }));
    } catch {
      // polling
    }
  }, []);

  const refreshWorkspace = useCallback(async (workspaceId: string) => {
    try {
      const data = await api<WorkspaceSnapshot>(`/api/workspaces/${workspaceId}`);
      setWorkspaces((prev) => ({ ...prev, [workspaceId]: data }));
    } catch {
      // polling
    }
  }, []);

  const refreshAllWorkspaces = useCallback(async () => {
    try {
      const list = await api<WorkspaceSnapshot[]>("/api/workspaces");
      setWorkspaces(Object.fromEntries(list.map((ws) => [ws.id, normalizeWorkspace(ws)])));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const bootId = ++bootIdRef.current;

    async function boot() {
      try {
        const [existingSessions, workspaceRows] = await Promise.all([
          api<SessionSnapshot[]>("/api/sessions").catch(() => [] as SessionSnapshot[]),
          api<WorkspaceSnapshot[]>("/api/workspaces").catch(() => [] as WorkspaceSnapshot[]),
        ]);

        if (bootId !== bootIdRef.current) return;

        let sessionList = existingSessions;
        if (sessionList.length === 0) {
          const created = await api<SessionSnapshot>("/api/session", {
            method: "POST",
            body: JSON.stringify({ startUrl: "https://duckduckgo.com" }),
          });
          sessionList = [created];
        }

        let workspaceListBoot = workspaceRows;
        if (workspaceListBoot.length === 0) {
          const created = await api<WorkspaceSnapshot>("/api/workspaces", {
            method: "POST",
            body: JSON.stringify({}),
          });
          workspaceListBoot = [created];
        }

        setSessions(Object.fromEntries(sessionList.map((s) => [s.id, s])));
        setSessionOrder(sessionList.map((s) => s.id));
        setActiveAgentId(sessionList[0]?.id ?? null);
        setWorkspaces(
          Object.fromEntries(workspaceListBoot.map((ws) => [ws.id, normalizeWorkspace(ws)])),
        );
        setActiveWorkspaceId(workspaceListBoot[0]?.id ?? null);
      } catch (err) {
        if (bootId !== bootIdRef.current) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?next=/workspace");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to start session");
      } finally {
        if (bootId === bootIdRef.current) setLoading(false);
      }
    }

    void boot();
  }, [router]);

  useEffect(() => {
    function closeAll() {
      for (const id of Object.keys(sessions)) {
        void destroySession(id);
      }
    }

    window.addEventListener("pagehide", closeAll);
    return () => window.removeEventListener("pagehide", closeAll);
  }, [sessions]);

  useEffect(() => {
    const ids = Object.keys(sessions);
    if (ids.length === 0) return;

    const interval = setInterval(() => {
      for (const id of ids) void refreshSession(id);
      if (viewMode === "workspace" && activeWorkspaceId) {
        void refreshWorkspace(activeWorkspaceId);
      }
    }, controllable ? 800 : 1200);

    return () => clearInterval(interval);
  }, [sessions, viewMode, activeWorkspaceId, refreshSession, refreshWorkspace, controllable]);

  useEffect(() => {
    if (waiting) setManualControl(false);
  }, [waiting]);

  async function handleAddAgent() {
    const data = await api<SessionSnapshot>("/api/session", {
      method: "POST",
      body: JSON.stringify({ forceNew: true, startUrl: "https://duckduckgo.com" }),
    });
    setSessions((prev) => ({ ...prev, [data.id]: data }));
    setSessionOrder((prev) => [...prev, data.id]);
    selectAgent(data.id);
  }

  async function handleAddWorkspace() {
    const data = await api<WorkspaceSnapshot>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({}),
    });
    setWorkspaces((prev) => ({ ...prev, [data.id]: data }));
    selectWorkspace(data.id);
  }

  async function handleCloseAgent(sessionId: string) {
    if (sessionOrder.length <= 1) return;

    await destroySession(sessionId);

    setSessions((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    setSessionOrder((prev) => prev.filter((id) => id !== sessionId));

    if (activeAgentId === sessionId) {
      const remaining = sessionOrder.filter((id) => id !== sessionId);
      setActiveAgentId(remaining[0] ?? null);
    }

    for (const ws of Object.values(workspaces)) {
      if (ws.sessionIds.includes(sessionId)) {
        const updated = await api<WorkspaceSnapshot>(
          `/api/workspaces/${ws.id}/sessions/${sessionId}`,
          { method: "DELETE" },
        ).catch(() => null);
        if (updated) {
          setWorkspaces((prev) => ({ ...prev, [ws.id]: updated }));
        }
      }
    }
  }

  async function handleDropAgentOnWorkspace(workspaceId: string, agentId: string) {
    const ws = workspaces[workspaceId];
    if (!ws) return;

    setLinkError(null);

    const linkedWorkspaceId = agentWorkspaceMap[agentId];
    if (linkedWorkspaceId && linkedWorkspaceId !== workspaceId) {
      const other = workspaces[linkedWorkspaceId];
      setLinkError(
        `${sessions[agentId]?.name ?? "Agent"} is already in ${other?.name ?? "another workspace"}.`,
      );
      return;
    }

    try {
      if (ws.sessionIds.includes(agentId)) {
        await api<WorkspaceSnapshot>(`/api/workspaces/${workspaceId}/sessions/${agentId}`, {
          method: "DELETE",
        });
      } else {
        await api<WorkspaceSnapshot>(`/api/workspaces/${workspaceId}/sessions`, {
          method: "POST",
          body: JSON.stringify({ sessionId: agentId }),
        });
        selectWorkspace(workspaceId);
      }

      await refreshAllWorkspaces();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update workspace link";
      setLinkError(message);
    }
  }

  function pollWorkspaceUntilIdle(workspaceId: string) {
    const tick = async () => {
      try {
        const latest = await api<WorkspaceSnapshot>(`/api/workspaces/${workspaceId}`);
        setWorkspaces((prev) => ({ ...prev, [latest.id]: latest }));
        if (latest.status === "running") {
          window.setTimeout(() => void tick(), 700);
          return;
        }
        for (const sessionId of latest.sessionIds) {
          void refreshSession(sessionId);
        }
      } catch {
        window.setTimeout(() => void tick(), 1000);
      }
    };
    void tick();
  }

  async function handleRenameSubmit() {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (renameTarget.kind !== "agent-color" && !name) return;

    if (renameTarget.kind === "agent") {
      const updated = await api<SessionSnapshot>(`/api/session/${renameTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setSessions((prev) => ({ ...prev, [updated.id]: updated }));
    } else if (renameTarget.kind === "workspace") {
      const updated = await api<WorkspaceSnapshot>(`/api/workspaces/${renameTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setWorkspaces((prev) => ({ ...prev, [updated.id]: updated }));
    } else {
      const updated = await api<WorkspaceSnapshot>(
        `/api/workspaces/${renameTarget.workspaceId}/sessions/${renameTarget.sessionId}`,
        { method: "PATCH", body: JSON.stringify({ color: name }) },
      );
      setWorkspaces((prev) => ({ ...prev, [updated.id]: updated }));
    }

    setRenameTarget(null);
    setRenameValue("");
  }

  async function handleControl(action: {
    type: "click" | "type" | "key" | "scroll";
    x?: number;
    y?: number;
    text?: string;
    key?: string;
    deltaY?: number;
  }) {
    if (!activeAgentId) return;

    const data = await api<SessionSnapshot>(`/api/session/${activeAgentId}/control`, {
      method: "POST",
      body: JSON.stringify(action),
    });
    setSessions((prev) => ({ ...prev, [activeAgentId]: data }));
  }

  async function handleSend(message: string) {
    setManualControl(false);

    if (viewMode === "workspace" && activeWorkspaceId) {
      const ws = workspaces[activeWorkspaceId];
      if (!ws?.sessionIds.length) {
        throw new Error("Drag at least one agent onto this workspace tab first.");
      }

      const body = await api<WorkspaceSnapshot>(`/api/workspaces/${activeWorkspaceId}/chat`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setWorkspaces((prev) => ({ ...prev, [body.id]: body }));
      pollWorkspaceUntilIdle(activeWorkspaceId);
      return;
    }

    if (!activeAgentId) return;

    const body = await api<SessionSnapshot>(`/api/session/${activeAgentId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    setSessions((prev) => ({ ...prev, [activeAgentId]: body }));
  }

  async function handleResume() {
    if (!activeAgentId) return;

    const data = await api<SessionSnapshot>(`/api/session/${activeAgentId}/resume`, {
      method: "POST",
    });
    setSessions((prev) => ({ ...prev, [activeAgentId]: data }));
  }

  const browserTabs = useMemo(() => {
    if (viewMode === "workspace" && activeWorkspace) {
      return activeWorkspace.sessionIds.map((id) => ({
        id,
        url: formatTabUrl(sessions[id]?.url),
        accentColor: activeWorkspace.sessionColors?.[id],
      }));
    }

    return agentList.map((agent) => ({
      id: agent.id,
      url: formatTabUrl(agent.url),
    }));
  }, [viewMode, activeWorkspace, agentList, sessions]);

  const browserSessionForPanel = useMemo(() => {
    if (viewMode === "workspace" && activeWorkspace && activeWorkspace.sessionIds.length === 0) {
      return null;
    }
    if (
      viewMode === "workspace" &&
      activeAgentId &&
      activeWorkspace &&
      !activeWorkspace.sessionIds.includes(activeAgentId)
    ) {
      const fallbackId = activeWorkspace.sessionIds[0];
      return fallbackId ? sessions[fallbackId] ?? null : null;
    }
    return activeSession;
  }, [viewMode, activeWorkspace, activeAgentId, activeSession, sessions]);

  const agentWorkspaceMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ws of workspaceList) {
      for (const sessionId of ws.sessionIds) {
        map[sessionId] = ws.id;
      }
    }
    return map;
  }, [workspaceList]);

  const chatAgentTabs = agentList.map((agent) => {
    const linkedWorkspaceId = agentWorkspaceMap[agent.id];
    const linkedWorkspace = linkedWorkspaceId ? workspaces[linkedWorkspaceId] : undefined;

    return {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      workspaceColor: linkedWorkspace?.sessionColors?.[agent.id] ?? null,
      lockedInOtherWorkspace:
        Boolean(linkedWorkspaceId) && linkedWorkspaceId !== activeWorkspaceId,
      linkedWorkspaceName: linkedWorkspace?.name,
    };
  });

  const chatWorkspaceTabs = workspaceList.map((ws) => ({
    id: ws.id,
    name: ws.name,
    sessionCount: ws.sessionIds.length,
    memberColors: ws.sessionIds
      .map((id) => ws.sessionColors?.[id])
      .filter((color): color is string => Boolean(color)),
  }));

  return (
    <div className="flex h-screen flex-col bg-background dot-grid">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-2 rounded-full bg-foreground" />
          <span className="text-sm font-medium tracking-tight">Synchronicity</span>
        </Link>
        <div className="flex items-center gap-3">
          <p className="font-mono text-xs text-muted-foreground">
            {controllable ? "you control" : activeSession?.status ?? "booting"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void authClient.signOut().then(() => router.push("/"));
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      {renameTarget && (
        <form
          className="flex shrink-0 items-center gap-2 border-b border-border bg-card/50 px-5 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRenameSubmit();
          }}
        >
          <span className="text-xs text-muted-foreground">
            {renameTarget.kind === "agent-color" ? "Agent color" : "Rename"}
          </span>
          {renameTarget.kind === "agent-color" ? (
            <input
              type="color"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              className="h-8 w-12 cursor-pointer border border-border bg-background"
            />
          ) : (
            <input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              className="flex-1 max-w-sm border border-border bg-background px-2 py-1 text-sm outline-none"
              autoFocus
            />
          )}
          <Button type="submit" size="sm">Save</Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setRenameTarget(null);
              setRenameValue("");
            }}
          >
            Cancel
          </Button>
        </form>
      )}

      {loading && !activeSession ? (
        <div className="flex min-h-0 flex-1 items-center justify-center border-t border-border">
          <SiteLoader label="Starting session" />
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-0 border-t border-border lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
          <div className="min-h-0 p-4">
            <BrowserPanel
              session={browserSessionForPanel}
              loading={loading}
              controllable={controllable}
              manualControl={manualControl}
              tabs={browserTabs.length > 0 ? browserTabs : undefined}
              activeTabId={activeAgentId ?? undefined}
              onTabSelect={selectBrowserTab}
              onToggleControl={() => setManualControl((value) => !value)}
              onClose={(tabId) => void handleCloseAgent(tabId)}
              onControl={handleControl}
            />
          </div>
          <div className="min-h-0 p-4 pl-0">
            <ChatPanel
              session={viewMode === "agent" ? activeSession : null}
              viewMode={viewMode}
              agentTabs={chatAgentTabs}
              activeAgentId={activeAgentId}
              workspaceTabs={chatWorkspaceTabs}
              activeWorkspaceId={activeWorkspaceId}
              activeWorkspaceName={activeWorkspace?.name ?? null}
              onSelectAgent={selectAgent}
              onAddAgent={() => void handleAddAgent()}
              onRenameAgent={(id) => {
                const agent = sessions[id];
                if (!agent) return;
                setRenameTarget({ kind: "agent", id });
                setRenameValue(agent.name);
              }}
              linkError={linkError}
              chatReady={
                viewMode === "workspace" ? Boolean(activeWorkspace) : Boolean(activeSession)
              }
              onDropAgentOnWorkspace={(wsId, agentId) => void handleDropAgentOnWorkspace(wsId, agentId)}
              onPickAgentWorkspaceColor={(agentId) => {
                const wsId = agentWorkspaceMap[agentId];
                if (!wsId) return;
                const color = workspaces[wsId]?.sessionColors?.[agentId] ?? "#f87171";
                setRenameTarget({ kind: "agent-color", workspaceId: wsId, sessionId: agentId });
                setRenameValue(color);
              }}
              onSelectWorkspace={selectWorkspace}
              onAddWorkspace={() => void handleAddWorkspace()}
              onRenameWorkspace={(id) => {
                const ws = workspaces[id];
                if (!ws) return;
                setRenameTarget({ kind: "workspace", id });
                setRenameValue(ws.name);
              }}
              title={activeSession?.name ?? "Agent"}
              messages={
                viewMode === "workspace" && activeWorkspace ? activeWorkspace.messages : undefined
              }
              statusOverride={
                viewMode === "workspace" && activeWorkspace
                  ? activeWorkspace.status === "running"
                    ? "running"
                    : "idle"
                  : undefined
              }
              onSend={handleSend}
              onResume={handleResume}
              onFocusInput={() => setManualControl(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
