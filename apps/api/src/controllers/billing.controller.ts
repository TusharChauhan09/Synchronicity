import type { Request, Response } from 'express';
import { getBillingSnapshot } from '@repo/db/billing';

export async function getMyBilling(req: Request, res: Response) {
  if (!req.userId) {
    res.status(401).json({ error: 'Sign in required' });
    return;
  }

  const snapshot = await getBillingSnapshot(req.userId);
  res.json(snapshot);
}
