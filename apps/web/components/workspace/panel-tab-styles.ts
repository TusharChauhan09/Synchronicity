import { cn } from "@/lib/utils";

type TabSurface = "browser" | "chat";

const SURFACE_BG: Record<TabSurface, string> = {
  browser: "bg-[oklch(0.09_0.006_285)]",
  chat: "bg-[oklch(0.11_0.007_285)]",
};

const SURFACE_INACTIVE = "bg-[oklch(0.07_0.005_285)]";

export function panelTabClass(isActive: boolean, surface: TabSurface, size: "md" | "lg" = "lg") {
  const height = size === "lg" ? (isActive ? "h-10" : "h-9") : isActive ? "h-9" : "h-8";

  return cn(
    "flex shrink-0 items-stretch border border-border -ml-px first:ml-0 transition-colors",
    height,
    isActive
      ? cn("relative z-10 -mb-px border-b-transparent text-foreground", SURFACE_BG[surface])
      : cn(SURFACE_INACTIVE, "text-muted-foreground hover:bg-[oklch(0.1_0.006_285)] hover:text-foreground"),
  );
}

export function panelTabLabelClass(isActive: boolean, size: "md" | "lg" = "lg") {
  return cn(
    "truncate text-left font-medium",
    size === "lg" ? "min-w-[120px] max-w-[240px] px-3.5 text-[13px]" : "min-w-[100px] max-w-[200px] px-3 text-[11px] font-mono",
    isActive ? "text-foreground" : "text-muted-foreground",
  );
}

export function panelTabRowClass() {
  return "flex min-w-0 items-end overflow-x-auto";
}

export function panelAddTabClass(surface: TabSurface) {
  return cn(
    "flex h-9 w-9 shrink-0 items-center justify-center border border-border -ml-px text-muted-foreground hover:text-foreground",
    SURFACE_INACTIVE,
    "hover:bg-[oklch(0.1_0.006_285)]",
  );
}
