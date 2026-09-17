import { Hono } from 'hono';
import { auth } from '@repo/auth';

export const authRoutes = new Hono();

authRoutes.on(['GET', 'POST', 'OPTIONS'], '/api/auth/*', (c) => auth.handler(c.req.raw));
