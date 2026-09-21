"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WORKSPACE_THEME_COLORS } from "@/lib/workspace-colors";

type TabEditPopoverProps = {
  open: boolean;
  anchorRect: DOMRect | null;
  name: string;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  color?: string;
  onColorChange?: (color: string) => void;
  onColorSelect?: (color: string) => void;
  showColors?: boolean;
  showCreateWorkspace?: boolean;
  onCreateWorkspace?: () => void;
  createWorkspaceLabel?: string;
};

export function TabEditPopover({
  open,
  anchorRect,
  name,
  onNameChange,
  onSave,
  onClose,
  color,
  onColorChange,
  onColorSelect,
  showColors = false,
  showCreateWorkspace = false,
  onCreateWorkspace,
  createWorkspaceLabel = "Create workspace with this agent",
}: TabEditPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter") {
        event.preventDefault();
        onSave();
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-tab-edit-popover]")) return;
      onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, onClose, onSave]);

  if (!open || !anchorRect || !mounted) return null;

  const left = Math.max(8, anchorRect.left + anchorRect.width / 2 - 140);
  const top = anchorRect.bottom + 8;

  const popover = (
    <div
      data-tab-edit-popover
      className="fixed z-[200] w-[280px] rounded-lg border border-border/80 bg-[oklch(0.13_0.008_285)] p-3 shadow-[0_12px_40px_oklch(0_0_0/45%)]"
      style={{ left, top }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        className="w-full rounded-md border border-[oklch(0.55_0.12_250)] bg-[oklch(0.1_0.007_285)] px-3 py-2 text-sm text-foreground outline-none ring-1 ring-[oklch(0.55_0.12_250/35%)]"
        aria-label="Tab name"
      />

      {showCreateWorkspace && onCreateWorkspace && (
        <button
          type="button"
          onClick={() => onCreateWorkspace()}
          className="mt-3 w-full rounded-md border border-border/70 bg-foreground/[0.04] px-3 py-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.08]"
        >
          {createWorkspaceLabel}
        </button>
      )}

      {showColors && onColorChange && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {WORKSPACE_THEME_COLORS.map((swatch) => {
            const selected = color === swatch;
            return (
              <button
                key={swatch}
                type="button"
                aria-label={`Color ${swatch}`}
                onClick={() => {
                  onColorChange?.(swatch);
                  onColorSelect?.(swatch);
                }}
                className="flex size-7 items-center justify-center rounded-full"
              >
                <span
                  className={`size-5 rounded-full border-2 transition-transform ${
                    selected ? "scale-110 border-white/90" : "border-transparent"
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return createPortal(popover, document.body);
}
