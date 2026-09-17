import 'dotenv/config';
import { serve } from '@hono/node-server';
import { app } from './app.js';
import { cleanupAllSessions } from '@repo/agent';

const port = Number(process.env.PORT ?? 4000);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});

async function shutdown() {
  await cleanupAllSessions();
  server.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
