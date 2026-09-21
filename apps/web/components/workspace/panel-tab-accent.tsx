type PanelTabAccentProps = {
  color?: string | null;
};

/** Colored line along the bottom edge of a panel tab (sits above the panel content). */
export function PanelTabAccent({ color }: PanelTabAccentProps) {
  if (!color) return null;
  return (
    <span
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-0.5"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
