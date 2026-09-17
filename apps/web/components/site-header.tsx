"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="size-2 rounded-full bg-foreground" />
        <span className="text-sm font-medium tracking-tight">Synchronicity</span>
      </Link>
      <nav className="flex items-center gap-2">
        <Link href="/pricing" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          Pricing
        </Link>
        {isPending ? null : session ? (
          <>
            <Link href="/workspace" className={cn(buttonVariants({ size: "sm" }))}>
              Workspace
            </Link>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </>
        ) : (
          <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
