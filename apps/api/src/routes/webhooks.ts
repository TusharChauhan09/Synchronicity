import express, { Router } from 'express';
import { Webhooks } from '@dodopayments/express';
import { getDodoConfig } from '../lib/dodo.js';

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
      },
    }),
  );
} else {
  console.warn(
    'DODO_PAYMENTS_WEBHOOK_KEY is not set — webhook route /api/webhook/dodo is disabled',
  );
}
