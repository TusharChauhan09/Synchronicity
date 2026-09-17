import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { getSession } from '@repo/auth';

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const session = await getSession(fromNodeHeaders(req.headers));

    if (!session) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }

    req.userId = session.user.id;
    next();
  } catch (error) {
    next(error);
  }
};
