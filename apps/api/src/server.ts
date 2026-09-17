import cors from 'cors';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '@repo/auth';
import { paymentRoutes } from './routes/payments.js';
import { sessionRoutes } from './routes/session.js';
import { webhookRoutes } from './routes/webhooks.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

app.use(
  cors({
    origin: webOrigin,
    credentials: true,
  }),
);

app.all('/api/auth/*', toNodeHandler(auth));

app.use(webhookRoutes);

app.use(express.json());

app.use(paymentRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use(sessionRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  if (!res.headersSent) {
    res.status(500).json({ error: message });
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
