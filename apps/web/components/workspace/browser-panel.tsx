"use client";

import { useEffect, useRef } from "react";
import { Loader2, MousePointer2, X } from "lucide-react";
import { mapClickToViewport } from "@/lib/agent/control";
import type { SessionSnapshot } from "@/lib/agent/session";

const SPECIAL_KEYS = new Set([
  "Enter",
  "Backspace",
  "Tab",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Delete",
]);

export type BrowserTab = {
  id: string;
  url: string;
};

type BrowserPanelProps = {
  session: SessionSnapshot | null;
  loading: boolean;
  controllable: boolean;
  manualControl: boolean;
  tabs?: BrowserTab[];
  activeTabId?: string;
  onToggleControl: () => void;
  onClose: (tabId: string) => void;
  onTabSelect?: (tabId: string) => void;
  onControl: (action: {
    type: "click" | "type" | "key" | "scroll";
    x?: number;
    y?: number;
    text?: string;
    key?: string;
    deltaY?: number;
  }) => Promise<void>;
};

export function BrowserPanel({
  session,
  loading,
  controllable,
  manualControl,
  tabs,
  activeTabId,
  onToggleControl,
  onClose,
  onTabSelect,
  onControl,
}: BrowserPanelProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const screenshot = session?.screenshot;
  const isRunning = session?.status === "running";
  const waiting = session?.status === "waiting_for_user";

  const resolvedTabs: BrowserTab[] =
    tabs ??
    (session
      ? [{ id: session.id, url: session.url ?? "about:blank" }]
      : [{ id: "boot", url: "about:blank" }]);

  const activeId = activeTabId ?? resolvedTabs[0]?.id;

  const wasControllable = useRef(false);

  useEffect(() => {
    if (controllable && !wasControllable.current) {
      surfaceRef.current?.focus();
    }
    wasControllable.current = controllable;
  }, [controllable]);

  async function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!controllable || !imgRef.current) return;

    const coords = mapClickToViewport(
      event.clientX,
      event.clientY,
      imgRef.current.getBoundingClientRect(),
    );

    if (!coords) return;
    await onControl({ type: "click", x: coords.x, y: coords.y });
  }

  async function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!controllable || event.ctrlKey || event.metaKey || event.altKey) return;

    if (SPECIAL_KEYS.has(event.key)) {
      event.preventDefault();
      await onControl({ type: "key", key: event.key });
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      await onControl({ type: "type", text: event.key });
    }
  }

  async function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!controllable || !imgRef.current) return;

    event.preventDefault();
    const rect = imgRef.current.getBoundingClientRect();
    const coords = mapClickToViewport(event.clientX, event.clientY, rect);
    if (!coords) return;

    await onControl({
      type: "scroll",
      x: coords.x,
      y: coords.y,
      deltaY: event.deltaY,
    });
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden border border-border bg-card">
      {/* Tab strip — one box per browser instance */}
      <div className="flex shrink-0 flex-wrap items-end gap-0 border-b border-border bg-[oklch(0.13_0.008_285)] px-2 pt-2">
        {resolvedTabs.map((tab) => {
          const isActive = tab.id === activeId;

          return (
            <div
              key={tab.id}
              className={`flex h-9 min-w-[200px] max-w-sm flex-1 items-stretch border border-border ${
                isActive
                  ? "-mb-px z-10 border-b-card bg-card"
                  : "mb-0 bg-[oklch(0.11_0.007_285)]"
              }`}
            >
              <button
                type="button"
                onClick={() => onTabSelect?.(tab.id)}
                className="min-w-0 flex-1 truncate px-3 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {tab.url}
              </button>
              <button
                type="button"
                onClick={() => onClose(tab.id)}
                disabled={!session}
                aria-label={`Close ${tab.url}`}
                className="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
              >
                <X className="size-3.5" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          {(loading || isRunning) && (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {isRunning ? "Agent running" : waiting ? "Waiting for you" : "Idle"}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleControl}
          disabled={isRunning || waiting || !session}
          className={`flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors disabled:pointer-events-none disabled:opacity-40 ${
            manualControl || waiting
              ? "bg-foreground text-background"
              : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <MousePointer2 className="size-3" />
          {manualControl ? "Controlling" : "Take control"}
        </button>
      </div>

      {/* Viewport */}
      <div className="relative m-3 flex min-h-0 flex-1 border border-border bg-[oklch(0.09_0.006_285)]">
        {screenshot ? (
          <div
            ref={surfaceRef}
            tabIndex={controllable ? 0 : -1}
            onClick={(event) => void handleClick(event)}
            onKeyDown={(event) => void handleKeyDown(event)}
            onWheel={(event) => void handleWheel(event)}
            className={`relative h-full w-full outline-none ${
              controllable ? "cursor-control ring-1 ring-inset ring-primary/40" : ""
            }`}
          >
            <img
              ref={imgRef}
              src={`data:image/png;base64,${screenshot}`}
              alt="Browser view"
              draggable={false}
              className="pointer-events-none h-full w-full object-contain select-none"
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="border border-border bg-background/40 px-6 py-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Starting browser session…
            </p>
          </div>
        )}

        {waiting && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            Click to focus, type directly on the page, then press Resume in chat.
          </div>
        )}

        {controllable && !waiting && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-border bg-background/90 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Click to focus — type, scroll, and use arrow keys directly here.
          </div>
        )}
      </div>
    </section>
  );
}
