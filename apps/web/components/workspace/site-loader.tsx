"use client";

import { DotmSquare20 } from "@/components/ui/dotm-square-20";

type SiteLoaderProps = {
  label?: string;
  className?: string;
};

export function SiteLoader({ label = "Loading", className }: SiteLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className ?? ""}`}>
      <div className="flex size-12 items-center justify-center">
        <DotmSquare20
          dotSize={4}
          cellPadding={2}
          boxSize={48}
          minSize={48}
          speed={1.2}
          bloom
          muted
          ariaLabel={label}
        />
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
