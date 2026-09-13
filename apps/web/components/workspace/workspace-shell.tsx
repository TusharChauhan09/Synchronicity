"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BrowserPanel } from "./browser-panel";
import { ChatPanel } from "./chat-panel";
import type { SessionSnapshot } from "@/lib/agent/session";

export function WorkspaceShell() {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/session/${sessionId}`);
    if (!response.ok) return;

    const data = (await response.json()) as SessionSnapshot;
    setSession(data);
  }, []);

  useEffect(() => {
    let active = true;

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
        if (active) setSession(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to start session");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void boot();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session?.id) return;

    const interval = setInterval(() => {
      void refresh(session.id);
    }, 1200);

    return () => clearInterval(interval);
  }, [session?.id, refresh]);

  useEffect(() => {
    return () => {
      if (!session?.id) return;
      void fetch(`/api/session/${session.id}`, { method: "DELETE" });
    };
  }, [session?.id]);

  async function handleSend(message: string) {
    if (!session) return;

    const response = await fetch(`/api/session/${session.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to send message");
    }

    await refresh(session.id);
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

  return (
    <div className="flex h-screen flex-col bg-background dot-grid">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-2 rounded-full bg-foreground" />
          <span className="text-sm font-medium tracking-tight">Synchronicity</span>
        </Link>
        <p className="font-mono text-xs text-muted-foreground">
          {session?.status ?? "booting"}
        </p>
      </header>

      {error ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
          <BrowserPanel session={session} loading={loading} />
          <ChatPanel session={session} onSend={handleSend} onResume={handleResume} />
        </div>
      )}
    </div>
  );
}
