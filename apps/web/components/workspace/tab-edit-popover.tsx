"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid } from "lucide-react";
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
  showMakeWorkspace?: boolean;
  onMakeWorkspace?: () => void;
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
  showMakeWorkspace = false,
  onMakeWorkspace,
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

  const left = Math.max(8, Math.min(window.innerWidth - 296, anchorRect.left));
  const top = anchorRect.bottom + 8;

  const popover = (
    <div
      data-tab-edit-popover
      className="fixed z-[200] w-[280px] rounded-xl border border-white/10 bg-[oklch(0.14_0.01_285)] p-3 shadow-[0_18px_50px_oklch(0_0_0/50%)]"
      style={{ left, top }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <label className="mb-1.5 block px-0.5 text-[11px] text-muted-foreground">Name</label>
      <input
        ref={inputRef}
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-[oklch(0.1_0.007_285)] px-3 py-2 text-sm text-foreground outline-none focus:border-white/25"
        aria-label="Tab name"
      />

      {showColors && onColorChange && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
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

      {showMakeWorkspace && onMakeWorkspace && (
        <button
          type="button"
          onClick={onMakeWorkspace}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-[12px] text-foreground transition-colors hover:bg-white/8"
        >
          <LayoutGrid className="size-3.5" strokeWidth={2} />
          Make workspace
        </button>
      )}
    </div>
  );

  return createPortal(popover, document.body);
}
