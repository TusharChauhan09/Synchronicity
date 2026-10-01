export type PlanId = 'free' | 'plus' | 'pro';

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceUsd: number;
  credits: number;
  concurrentWindows: number;
  description: string;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    credits: 5,
    concurrentWindows: 1,
    description: '5 chats to try the workspace on a single browser window.',
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    priceUsd: 9,
    credits: 1000,
    concurrentWindows: 10,
    description: '1,000 credits and up to 10 concurrent browser windows.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 19,
    credits: 2500,
    concurrentWindows: 20,
    description: '2,500 credits and up to 20 concurrent browser windows.',
  },
};

export function isPlanId(value: string): value is PlanId {
  return value === 'free' || value === 'plus' || value === 'pro';
}

export function planLabel(planId: string): string {
  if (isPlanId(planId)) return PLANS[planId].name;
  return 'Free';
}
