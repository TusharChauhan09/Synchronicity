import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { authRoutes } from './routes/auth.js';
import { sessionRoutes } from './routes/session.js';

export const app = new Hono();

app.use('*', corsMiddleware());

app.get('/health', (c) => c.json({ ok: true }));

app.route('/', authRoutes);
app.route('/', sessionRoutes);
