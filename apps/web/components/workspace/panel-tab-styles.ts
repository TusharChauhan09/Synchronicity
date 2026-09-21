import { cn } from "@/lib/utils";

type TabSurface = "browser" | "chat";

const SURFACE_BG: Record<TabSurface, string> = {
  browser: "bg-[oklch(0.09_0.006_285)]",
  chat: "bg-[oklch(0.11_0.007_285)]",
};

const SURFACE_INACTIVE = "bg-[oklch(0.07_0.005_285)]";

export function panelTabClass(isActive: boolean, surface: TabSurface, size: "sm" | "md" = "sm") {
  const height = size === "md" ? (isActive ? "h-8" : "h-7") : isActive ? "h-7" : "h-6";

  return cn(
    "relative flex shrink-0 items-stretch overflow-hidden rounded-t-lg border border-border -ml-px first:ml-0 transition-colors",
    height,
    isActive
      ? cn("z-10 -mb-px border-b-transparent text-foreground", SURFACE_BG[surface])
      : cn(SURFACE_INACTIVE, "text-muted-foreground hover:bg-[oklch(0.1_0.006_285)] hover:text-foreground"),
  );
}

export function panelTabLabelClass(isActive: boolean, size: "sm" | "md" = "sm") {
  return cn(
    "truncate text-left font-medium",
    size === "md"
      ? "min-w-[88px] max-w-[180px] px-2.5 text-[11px]"
      : "min-w-[72px] max-w-[140px] px-2 text-[11px]",
    isActive ? "text-foreground" : "text-muted-foreground",
  );
}

export function panelTabRowClass() {
  return [
    "flex min-w-0 items-end overflow-x-auto overflow-y-hidden",
    "[scrollbar-width:none]",
    "[-ms-overflow-style:none]",
    "[&::-webkit-scrollbar]:hidden",
  ].join(" ");
}

export function panelAddTabClass(surface: TabSurface) {
  return cn(
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-t-lg border border-border -ml-px text-muted-foreground hover:text-foreground",
    SURFACE_INACTIVE,
    "hover:bg-[oklch(0.1_0.006_285)]",
  );
}
