import { Router } from 'express';
import { CustomerPortal, checkoutHandler } from '@dodopayments/express';
import { defaultCheckout } from '../controllers/payments.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { getDodoConfig } from '../lib/dodo.js';

const dodo = getDodoConfig();

const checkoutBase = {
  bearerToken: dodo.bearerToken,
  returnUrl: dodo.returnUrl,
  environment: dodo.environment,
};

export const paymentRoutes = Router();

paymentRoutes.post('/api/checkout/default', requireAuth, defaultCheckout);

paymentRoutes.get(
  '/api/checkout',
  requireAuth,
  checkoutHandler({
    ...checkoutBase,
    type: 'static',
  }),
);

paymentRoutes.post(
  '/api/checkout',
  requireAuth,
  checkoutHandler({
    ...checkoutBase,
    type: 'session',
  }),
);

paymentRoutes.get(
  '/api/customer-portal',
  requireAuth,
  CustomerPortal({
    bearerToken: dodo.bearerToken,
    environment: dodo.environment,
  }),
);
