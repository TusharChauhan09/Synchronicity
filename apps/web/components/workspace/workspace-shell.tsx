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
  return { ...ws, color: ws.color ?? "#60a5fa" };
}

function workspaceColorForAgent(
  agentId: string,
  agentWorkspaceMap: Record<string, string>,
  workspaces: Record<string, WorkspaceSnapshot>,
): string | undefined {
  const workspaceId = agentWorkspaceMap[agentId];
  if (!workspaceId) return undefined;
  return workspaces[workspaceId]?.color;
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
      setWorkspaces((prev) => ({ ...prev, [workspaceId]: normalizeWorkspace(data) }));
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

        setSessions(Object.fromEntries(sessionList.map((s) => [s.id, s])));
        setSessionOrder(sessionList.map((s) => s.id));
        setActiveAgentId(sessionList[0]?.id ?? null);
        setWorkspaces(
          Object.fromEntries(workspaceRows.map((ws) => [ws.id, normalizeWorkspace(ws)])),
        );
        setActiveWorkspaceId(workspaceRows[0]?.id ?? null);
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

  async function handleCreateWorkspaceFromAgent(agentId: string) {
    setLinkError(null);

    if (agentWorkspaceMap[agentId]) {
      setLinkError(`${sessions[agentId]?.name ?? "Agent"} is already in a workspace.`);
      return;
    }

    try {
      const created = await api<WorkspaceSnapshot>("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: sessions[agentId]?.name ?? "workspace" }),
      });
      const linked = await api<WorkspaceSnapshot>(`/api/workspaces/${created.id}/sessions`, {
        method: "POST",
        body: JSON.stringify({ sessionId: agentId }),
      });
      setWorkspaces((prev) => ({ ...prev, [linked.id]: normalizeWorkspace(linked) }));
      selectWorkspace(linked.id);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not create workspace";
      setLinkError(message);
      throw err;
    }
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
        setWorkspaces((prev) => ({ ...prev, [latest.id]: normalizeWorkspace(latest) }));
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

  async function handleSaveAgentName(id: string, name: string) {
    const updated = await api<SessionSnapshot>(`/api/session/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    setSessions((prev) => ({ ...prev, [updated.id]: updated }));
  }

  async function handleSaveWorkspace(id: string, patch: { name?: string; color?: string }) {
    setWorkspaces((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: normalizeWorkspace({
          ...current,
          name: patch.name?.trim() ? patch.name.trim() : current.name,
          color: patch.color ?? current.color,
        }),
      };
    });

    const body: { name?: string; color?: string } = {};
    const trimmedName = patch.name?.trim();
    if (trimmedName) body.name = trimmedName;
    if (patch.color) body.color = patch.color;

    const updated = await api<WorkspaceSnapshot>(`/api/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setWorkspaces((prev) => ({ ...prev, [updated.id]: normalizeWorkspace(updated) }));
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
      setWorkspaces((prev) => ({ ...prev, [body.id]: normalizeWorkspace(body) }));
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

  const agentWorkspaceMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ws of workspaceList) {
      for (const sessionId of ws.sessionIds) {
        map[sessionId] = ws.id;
      }
    }
    return map;
  }, [workspaceList]);

  const browserTabs = useMemo(() => {
    if (viewMode === "workspace" && activeWorkspace) {
      return activeWorkspace.sessionIds.map((id) => ({
        id,
        url: formatTabUrl(sessions[id]?.url),
        accentColor: activeWorkspace.color,
      }));
    }

    return agentList.map((agent) => ({
      id: agent.id,
      url: formatTabUrl(agent.url),
      accentColor: workspaceColorForAgent(agent.id, agentWorkspaceMap, workspaces),
    }));
  }, [viewMode, activeWorkspace, agentList, sessions, agentWorkspaceMap, workspaces]);

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

  const chatAgentTabs = agentList.map((agent) => ({
    id: agent.id,
    name: agent.name,
    status: agent.status,
    workspaceColor: workspaceColorForAgent(agent.id, agentWorkspaceMap, workspaces) ?? null,
  }));

  const chatWorkspaceTabs = workspaceList.map((ws) => ({
    id: ws.id,
    name: ws.name,
    color: ws.color,
    sessionCount: ws.sessionIds.length,
  }));

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-2 rounded-full bg-foreground" />
          <span className="text-sm font-medium tracking-tight">Synchronicity</span>
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {controllable ? "You control" : activeSession?.status ?? "booting"}
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

      {loading && !activeSession ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <SiteLoader label="Starting session" />
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 px-4 pb-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.4fr)]">
          <div className="min-h-0">
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
          <div className="min-h-0">
            <ChatPanel
              session={viewMode === "agent" ? activeSession : null}
              viewMode={viewMode}
              agentTabs={chatAgentTabs}
              activeAgentId={activeAgentId}
              workspaceTabs={chatWorkspaceTabs}
              activeWorkspaceId={activeWorkspaceId}
              onSelectAgent={selectAgent}
              onAddAgent={() => void handleAddAgent()}
              onSaveAgentName={handleSaveAgentName}
              linkError={linkError}
              chatReady={
                viewMode === "workspace" ? Boolean(activeWorkspace) : Boolean(activeSession)
              }
              onDropAgentOnWorkspace={(wsId, agentId) => void handleDropAgentOnWorkspace(wsId, agentId)}
              onSelectWorkspace={selectWorkspace}
              onSaveWorkspace={handleSaveWorkspace}
              onCreateWorkspaceFromAgent={handleCreateWorkspaceFromAgent}
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
