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
    <div className="flex h-full min-h-0 flex-col">
      {/* Tab row + controls — sits flush on top of the outer box */}
      <div className="flex shrink-0 items-end justify-between gap-3">
        <div className="flex min-w-0 items-end gap-2">
          {resolvedTabs.map((tab) => {
            const isActive = tab.id === activeId;

            return (
              <div
                key={tab.id}
                className={`flex h-9 max-w-md shrink-0 items-stretch border border-border ${
                  isActive ? "bg-card" : "bg-[oklch(0.11_0.007_285)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onTabSelect?.(tab.id)}
                  className="min-w-[140px] max-w-[280px] truncate px-3 text-left font-mono text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {tab.url}
                </button>
                <button
                  type="button"
                  onClick={() => onClose(tab.id)}
                  disabled={!session}
                  aria-label={`Close ${tab.url}`}
                  className="flex w-8 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                >
                  <X className="size-3.5" strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 pb-1">
          {(loading || isRunning) && (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {isRunning ? "Running" : waiting ? "Waiting" : "Idle"}
          </span>
          <button
            type="button"
            onClick={onToggleControl}
            disabled={isRunning || waiting || !session}
            className={`flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-40 ${
              manualControl || waiting
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <MousePointer2 className="size-3" />
            {manualControl ? "Controlling" : "Take control"}
          </button>
        </div>
      </div>

      {/* Outer browser box — flush below tabs, no inner padding */}
      <div className="relative mt-0 flex min-h-0 flex-1 flex-col overflow-hidden border border-border bg-[oklch(0.09_0.006_285)]">
        {screenshot ? (
          <div
            ref={surfaceRef}
            tabIndex={controllable ? 0 : -1}
            onClick={(event) => void handleClick(event)}
            onKeyDown={(event) => void handleKeyDown(event)}
            onWheel={(event) => void handleWheel(event)}
            className={`absolute inset-0 outline-none ${
              controllable ? "cursor-control" : ""
            }`}
          >
            <img
              ref={imgRef}
              src={`data:image/png;base64,${screenshot}`}
              alt="Browser view"
              draggable={false}
              className="pointer-events-none h-full w-full object-contain object-top select-none"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Starting browser session…
            </p>
          </div>
        )}

        {waiting && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
            Click to focus, type on the page, then press Resume in chat.
          </div>
        )}

        {controllable && !waiting && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-border bg-background/90 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Click to focus — type, scroll, arrow keys
          </div>
        )}
      </div>
    </div>
  );
}
