import express, { Router } from 'express';
import { Webhooks } from '@dodopayments/express';
import { applyPlanByEmail } from '@repo/db/billing';
import { isPlanId } from '@repo/db/plans';
import { getDodoConfig, resolveProductIdForPlan } from '../lib/dodo.js';

const dodo = getDodoConfig();

export const webhookRoutes = Router();

if (dodo.webhookKey) {
  webhookRoutes.post(
    '/api/webhook/dodo',
    express.raw({ type: 'application/json' }),
    Webhooks({
      webhookKey: dodo.webhookKey,
      onPayload: async (payload) => {
        console.log('[dodo webhook]', payload.type);

        const email =
          (payload.data as { customer?: { email?: string } })?.customer?.email ??
          (payload.data as { customer_email?: string })?.customer_email;

        const metadataPlan = (payload.data as { metadata?: { plan?: string } })?.metadata?.plan;
        let plan = metadataPlan && isPlanId(metadataPlan) ? metadataPlan : null;

        if (!plan && email) {
          const productId = (payload.data as { product_id?: string })?.product_id;
          if (productId) {
            try {
              if (productId === resolveProductIdForPlan('plus')) plan = 'plus';
              if (productId === resolveProductIdForPlan('pro')) plan = 'pro';
            } catch {
              // product ids not configured
            }
          }
        }

        if (email && plan && plan !== 'free') {
          await applyPlanByEmail(email, plan).catch((error) => {
            console.error('[dodo webhook] failed to apply plan', error);
          });
        }
      },
    }),
  );
} else {
  console.warn(
    'DODO_PAYMENTS_WEBHOOK_KEY is not set — webhook route /api/webhook/dodo is disabled',
  );
}
