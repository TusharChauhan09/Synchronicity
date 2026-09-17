"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { authClient } from "@repo/auth/client";
import { safeNextPath } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"google" | "github" | null>(null);

  useEffect(() => {
    if (!isPending && session) {
      router.replace(next);
    }
  }, [isPending, next, router, session]);

  async function signIn(provider: "google" | "github") {
    setPending(provider);
    setError(null);

    const { error: signInError } = await authClient.signIn.social({
      provider,
      callbackURL: next,
    });

    if (signInError) {
      setError(signInError.message ?? "Could not start sign in");
      setPending(null);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col dot-grid">
      <SiteHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-20">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Account
        </p>
        <h1 className="text-3xl font-medium tracking-tight">Sign in to continue</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          You need to be signed in before opening the workspace or starting checkout.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" onClick={() => void signIn("google")} disabled={pending !== null}>
            {pending === "google" ? "Redirecting…" : "Continue with Google"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => void signIn("github")}
            disabled={pending !== null}
          >
            {pending === "github" ? "Redirecting…" : "Continue with GitHub"}
          </Button>
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </main>
    </div>
  );
}
