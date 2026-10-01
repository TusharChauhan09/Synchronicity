"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import type { PlanId } from "@/lib/billing-types";
import { authClient } from "@repo/auth/client";

type CheckoutButtonProps = {
  label?: string;
  className?: string;
  plan?: PlanId;
};

export function CheckoutButton({ label = "Subscribe", className, plan = "plus" }: CheckoutButtonProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (!session) {
      router.push("/login?next=/pricing");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint =
        plan === "plus" || plan === "pro" ? `/api/checkout/${plan}` : "/api/checkout/default";
      const body = await api<{ checkout_url?: string }>(endpoint, {
        method: "POST",
      });

      if (!body.checkout_url) {
        throw new Error("No checkout URL returned");
      }

      window.location.href = body.checkout_url;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        size="lg"
        className="w-full"
        onClick={() => void handleCheckout()}
        disabled={loading || isPending}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            Redirecting…
          </>
        ) : session ? (
          label
        ) : (
          "Sign in to subscribe"
        )}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
