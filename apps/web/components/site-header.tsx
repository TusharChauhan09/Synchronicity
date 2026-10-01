"use client";

import Link from "next/link";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { authClient } from "@repo/auth/client";

export function SiteHeader() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="size-2 rounded-full bg-foreground" />
        <span className="text-sm font-medium tracking-tight">Synchronicity</span>
      </Link>
      <nav className="flex items-center gap-3">
        <Link href="/pricing" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          Pricing
        </Link>
        {!isPending && session ? (
          <Link href="/workspace" className={cn(buttonVariants({ size: "sm" }))}>
            Workspace
          </Link>
        ) : null}
        <ThemeToggle />
        <UserMenu />
      </nav>
    </header>
  );
}
