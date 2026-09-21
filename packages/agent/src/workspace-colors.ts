export const WORKSPACE_AGENT_COLORS = [
  '#f87171',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#c084fc',
  '#fb923c',
] as const;

export function pickWorkspaceColor(usedColors: Set<string>): string {
  for (const color of WORKSPACE_AGENT_COLORS) {
    if (!usedColors.has(color)) return color;
  }
  return WORKSPACE_AGENT_COLORS[usedColors.size % WORKSPACE_AGENT_COLORS.length];
}

export function normalizeWorkspaceColor(color: string): string | null {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  return null;
}
