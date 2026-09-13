"use client";

import { useEffect, useRef } from "react";
import { Globe, Loader2, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

type BrowserPanelProps = {
  session: SessionSnapshot | null;
  loading: boolean;
  controllable: boolean;
  manualControl: boolean;
  onToggleControl: () => void;
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
  onToggleControl,
  onControl,
}: BrowserPanelProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const screenshot = session?.screenshot;
  const url = session?.url ?? "about:blank";
  const isRunning = session?.status === "running";
  const waiting = session?.status === "waiting_for_user";

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
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Globe className="size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{url}</p>
        <Button
          variant={manualControl || waiting ? "default" : "outline"}
          size="sm"
          onClick={onToggleControl}
          disabled={isRunning || waiting}
        >
          <MousePointer2 className="size-3.5" />
          {manualControl ? "Controlling" : "Take control"}
        </Button>
        {(loading || isRunning) && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[oklch(0.09_0.006_285)] p-4">
        {screenshot ? (
          <div
            ref={surfaceRef}
            tabIndex={controllable ? 0 : -1}
            onClick={(event) => void handleClick(event)}
            onKeyDown={(event) => void handleKeyDown(event)}
            onWheel={(event) => void handleWheel(event)}
            className={`relative max-h-full w-full outline-none ${
              controllable ? "cursor-figma ring-1 ring-primary/30 rounded-md" : ""
            }`}
          >
            <img
              ref={imgRef}
              src={`data:image/png;base64,${screenshot}`}
              alt="Browser view"
              draggable={false}
              className="pointer-events-none max-h-full w-full rounded-md border border-border object-contain shadow-2xl select-none"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Starting browser session…</p>
        )}

        {waiting && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Click to focus, type directly on the page, then press Resume in chat.
          </div>
        )}

        {controllable && !waiting && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-lg border border-border bg-background/80 px-4 py-2 text-xs text-muted-foreground">
            Click to focus — type, scroll, and use arrow keys directly here.
          </div>
        )}
      </div>
    </section>
  );
}
