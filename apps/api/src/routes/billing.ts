import { Router } from 'express';
import { getMyBilling } from '../controllers/billing.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

export const billingRoutes = Router();

billingRoutes.get('/api/billing/me', requireAuth, getMyBilling);
