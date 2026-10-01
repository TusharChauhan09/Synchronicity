"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useBilling } from "@/hooks/use-billing";
import { PUBLIC_PLANS } from "@/lib/plans";
import { authClient } from "@repo/auth/client";

export default function SettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const { billing, loading } = useBilling(0);

  const planDetails = PUBLIC_PLANS.find((plan) => plan.id === billing?.plan) ?? PUBLIC_PLANS[0]!;

  return (
    <div className="relative flex min-h-full flex-1 flex-col dot-grid">
      <SiteHeader />
      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-6 pb-20 pt-10">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Settings
        </p>
        <h1 className="text-3xl font-medium tracking-tight">Account</h1>

        {isPending || !session ? (
          <p className="mt-6 text-sm text-muted-foreground">Sign in to view settings.</p>
        ) : (
          <div className="mt-8 space-y-6">
            <section className="rounded-xl border border-border bg-card/60 p-5">
              <h2 className="text-sm font-medium">Profile</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="text-right font-medium">{session.user.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="text-right font-medium">{session.user.email}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-border bg-card/60 p-5">
              <h2 className="text-sm font-medium">Usage</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Credits left</dt>
                  <dd className="font-medium tabular-nums">
                    {loading ? "…" : billing?.creditsRemaining ?? 0}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Subscription</dt>
                  <dd className="font-medium">{loading ? "…" : billing?.planName ?? "Free"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Concurrent windows</dt>
                  <dd className="font-medium">{planDetails.concurrentWindows}</dd>
                </div>
              </dl>
              <Link
                href="/pricing"
                className="mt-4 inline-block text-sm text-foreground underline decoration-white/30 underline-offset-4 hover:decoration-white/60"
              >
                Change plan
              </Link>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
