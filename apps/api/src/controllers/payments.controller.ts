import type { Request, Response } from 'express';
import { fromNodeHeaders, getSession } from '@repo/auth';
import { createDodoClient, getDodoConfig, resolveProductId } from '../lib/dodo.js';

export async function defaultCheckout(req: Request, res: Response) {
  const dodo = getDodoConfig();

  try {
    const client = createDodoClient();
    const productId = await resolveProductId(client);
    const authSession = await getSession(fromNodeHeaders(req.headers));

    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      return_url: dodo.returnUrl,
      ...(authSession?.user.email
        ? {
            customer: {
              email: authSession.user.email,
              name: authSession.user.name,
            },
          }
        : {}),
    });

    if (!session.checkout_url) {
      res.status(500).json({ error: 'Dodo did not return a checkout URL' });
      return;
    }

    res.json({ checkout_url: session.checkout_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed';
    res.status(500).json({ error: message });
  }
}
