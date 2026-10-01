"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BillingSnapshot } from "@/lib/billing-types";
import { authClient } from "@repo/auth/client";

export function useBilling(pollMs = 12_000) {
  const { data: session } = authClient.useSession();
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setBilling(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api<BillingSnapshot>("/api/billing/me");
      setBilling(data);
    } catch {
      // keep last snapshot
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!session || pollMs <= 0) return;
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, refresh, session]);

  return { billing, loading, refresh };
}
