"use client";

import { Globe, Loader2 } from "lucide-react";
import type { SessionSnapshot } from "@/lib/agent/session";

type BrowserPanelProps = {
  session: SessionSnapshot | null;
  loading: boolean;
};

export function BrowserPanel({ session, loading }: BrowserPanelProps) {
  const screenshot = session?.screenshot;
  const url = session?.url ?? "about:blank";
  const isRunning = session?.status === "running";
  const waiting = session?.status === "waiting_for_user";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Globe className="size-4 text-muted-foreground" />
        <p className="truncate font-mono text-xs text-muted-foreground">{url}</p>
        {(loading || isRunning) && (
          <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[oklch(0.09_0.006_285)] p-4">
        {screenshot ? (
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt="Browser view"
            className="max-h-full w-full rounded-md border border-border object-contain shadow-2xl"
          />
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Starting browser session…</p>
          </div>
        )}

        {waiting && (
          <div className="absolute inset-x-4 bottom-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Human control needed — use the Playwright window or solve the block, then click Resume in chat.
          </div>
        )}
      </div>
    </section>
  );
}
