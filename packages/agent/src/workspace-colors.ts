export const WORKSPACE_THEME_COLORS = [
  '#9ca3af',
  '#60a5fa',
  '#f87171',
  '#fbbf24',
  '#4ade80',
  '#f472b6',
  '#c084fc',
  '#22d3ee',
  '#fb923c',
] as const;

export function pickWorkspaceColor(usedColors: Set<string>): string {
  for (const color of WORKSPACE_THEME_COLORS) {
    if (!usedColors.has(color)) return color;
  }
  return WORKSPACE_THEME_COLORS[usedColors.size % WORKSPACE_THEME_COLORS.length] ?? '#60a5fa';
}

export function normalizeWorkspaceColor(color: string): string | null {
  const trimmed = color.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  return null;
}
