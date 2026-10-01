export type PlanId = "free" | "plus" | "pro";

export type BillingSnapshot = {
  plan: PlanId;
  planName: string;
  creditsRemaining: number;
  creditsIncluded: number;
  concurrentWindows: number;
  priceUsd: number;
};
