"use client";

import { Loader2 } from "lucide-react";

type SiteLoaderProps = {
  label?: string;
  className?: string;
};

export function SiteLoader({ label = "Loading", className }: SiteLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className ?? ""}`}>
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
