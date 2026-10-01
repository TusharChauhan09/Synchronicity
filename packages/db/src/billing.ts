import { prisma } from './client.js';
import { isPlanId, PLANS, type PlanId } from './plans.js';

export type BillingSnapshot = {
  plan: PlanId;
  planName: string;
  creditsRemaining: number;
  creditsIncluded: number;
  concurrentWindows: number;
  priceUsd: number;
};

export async function getOrCreateUserBilling(userId: string) {
  const existing = await prisma.userBilling.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.userBilling.create({
    data: {
      userId,
      plan: 'free',
      creditsRemaining: PLANS.free.credits,
    },
  });
}

export async function getBillingSnapshot(userId: string): Promise<BillingSnapshot> {
  const row = await getOrCreateUserBilling(userId);
  const plan = isPlanId(row.plan) ? row.plan : 'free';
  const definition = PLANS[plan];

  return {
    plan,
    planName: definition.name,
    creditsRemaining: row.creditsRemaining,
    creditsIncluded: definition.credits,
    concurrentWindows: definition.concurrentWindows,
    priceUsd: definition.priceUsd,
  };
}

export async function assertCanOpenWindow(userId: string, openSessionCount: number) {
  const snapshot = await getBillingSnapshot(userId);
  if (openSessionCount >= snapshot.concurrentWindows) {
    throw new Error(
      `Your ${snapshot.planName} plan allows ${snapshot.concurrentWindows} concurrent window${snapshot.concurrentWindows === 1 ? '' : 's'}. Upgrade for more.`,
    );
  }
}

export async function consumeChatCredit(userId: string) {
  const row = await getOrCreateUserBilling(userId);

  if (row.creditsRemaining <= 0) {
    throw new Error('No credits left. Upgrade your plan to keep chatting.');
  }

  const updated = await prisma.userBilling.update({
    where: { userId },
    data: { creditsRemaining: { decrement: 1 } },
  });

  return updated.creditsRemaining;
}

export async function applyPlanToUser(userId: string, plan: PlanId) {
  const definition = PLANS[plan];

  await getOrCreateUserBilling(userId);

  return prisma.userBilling.update({
    where: { userId },
    data: {
      plan,
      creditsRemaining: definition.credits,
    },
  });
}

export async function applyPlanByEmail(email: string, plan: PlanId) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  return applyPlanToUser(user.id, plan);
}
