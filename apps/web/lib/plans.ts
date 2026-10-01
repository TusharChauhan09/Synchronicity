import type { PlanId } from "./billing-types";

export type PublicPlan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  credits: number;
  concurrentWindows: number;
  features: string[];
};

export const PUBLIC_PLANS: PublicPlan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    credits: 5,
    concurrentWindows: 1,
    features: ["5 chat credits (5 free chats)", "1 concurrent browser window"],
  },
  {
    id: "plus",
    name: "Plus",
    priceLabel: "$9",
    credits: 1000,
    concurrentWindows: 10,
    features: ["1,000 credits per month", "Up to 10 concurrent windows"],
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$19",
    credits: 2500,
    concurrentWindows: 20,
    features: ["2,500 credits per month", "Up to 20 concurrent windows"],
  },
];
