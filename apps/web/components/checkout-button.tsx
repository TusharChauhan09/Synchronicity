"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CheckoutButtonProps = {
  label?: string;
  className?: string;
};

export function CheckoutButton({ label = "Subscribe", className }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout/default", {
        method: "POST",
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Could not start checkout",
        );
      }

      const checkoutUrl = body.checkout_url as string | undefined;
      if (!checkoutUrl) {
        throw new Error("No checkout URL returned");
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button size="lg" onClick={() => void handleCheckout()} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            Redirecting…
          </>
        ) : (
          label
        )}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
