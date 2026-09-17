"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserPanel } from "./browser-panel";
import { ChatPanel } from "./chat-panel";
import { SiteLoader } from "./site-loader";
import { Button } from "@/components/ui/button";
import type { SessionSnapshot } from "@repo/agent/types";

async function destroySession(sessionId: string) {
  await fetch(`/api/session/${sessionId}`, { method: "DELETE" });
}

export function WorkspaceShell() {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualControl, setManualControl] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const bootIdRef = useRef(0);

  const waiting = session?.status === "waiting_for_user";
  const controllable = Boolean(session && !loading && (waiting || (manualControl && session.status === "idle")));

  const refresh = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/session/${sessionId}`);
    if (!response.ok) return;

    const data = (await response.json()) as SessionSnapshot;
    setSession(data);
  }, []);

  useEffect(() => {
    const bootId = ++bootIdRef.current;

    async function boot() {
      try {
        const response = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startUrl: "https://duckduckgo.com" }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to start session");
        }

        const data = (await response.json()) as SessionSnapshot;
        if (bootId !== bootIdRef.current) return;

        sessionIdRef.current = data.id;
        setSession(data);
      } catch (err) {
        if (bootId !== bootIdRef.current) return;
        setError(err instanceof Error ? err.message : "Failed to start session");
      } finally {
        if (bootId === bootIdRef.current) setLoading(false);
      }
    }

    void boot();
  }, []);

  useEffect(() => {
    function closeSession() {
      const id = sessionIdRef.current;
      if (id) void destroySession(id);
    }

    window.addEventListener("pagehide", closeSession);
    return () => window.removeEventListener("pagehide", closeSession);
  }, []);

  useEffect(() => {
    if (!session?.id) return;

    const interval = setInterval(() => {
      void refresh(session.id);
    }, controllable ? 800 : 1200);

    return () => clearInterval(interval);
  }, [session?.id, refresh, controllable]);

  useEffect(() => {
    if (waiting) setManualControl(false);
  }, [waiting]);

  async function handleControl(action: {
    type: "click" | "type" | "key" | "scroll";
    x?: number;
    y?: number;
    text?: string;
    key?: string;
    deltaY?: number;
  }) {
    if (!session) return;

    const response = await fetch(`/api/session/${session.id}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? "Control action failed");
    }

    const data = (await response.json()) as SessionSnapshot;
    setSession(data);
  }

  async function handleSend(message: string) {
    if (!session) return;

    setManualControl(false);

    const response = await fetch(`/api/session/${session.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error ?? "Failed to send message");
    }

    setSession(body as SessionSnapshot);
  }

  async function handleResume() {
    if (!session) return;

    const response = await fetch(`/api/session/${session.id}/resume`, {
      method: "POST",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to resume");
    }

    const data = (await response.json()) as SessionSnapshot;
    setSession(data);
  }

  async function handleEndSession() {
    const id = sessionIdRef.current;
    if (!id) return;

    await destroySession(id);
    sessionIdRef.current = null;
    setSession(null);
    setManualControl(false);
    setLoading(true);
    setError(null);

    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startUrl: "https://duckduckgo.com" }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Failed to start session");
      setLoading(false);
      return;
    }

    const data = (await response.json()) as SessionSnapshot;
    sessionIdRef.current = data.id;
    setSession(data);
    setLoading(false);
  }

  return (
    <div className="flex h-screen flex-col bg-background dot-grid">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-2 rounded-full bg-foreground" />
          <span className="text-sm font-medium tracking-tight">Synchronicity</span>
        </Link>
        <div className="flex items-center gap-3">
          <p className="font-mono text-xs text-muted-foreground">
            {controllable ? "you control" : session?.status ?? "booting"}
          </p>
          {session && (
            <Button variant="outline" size="sm" onClick={() => void handleEndSession()}>
              End session
            </Button>
          )}
        </div>
      </header>

      {loading && !session ? (
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
              session={session}
              loading={loading}
              controllable={controllable}
              manualControl={manualControl}
              onToggleControl={() => setManualControl((value) => !value)}
              onClose={() => void handleEndSession()}
              onControl={handleControl}
            />
          </div>
          <div className="min-h-0 p-4 pl-0">
            <ChatPanel
              session={session}
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
