import { Hono } from 'hono';
import type { UserControlAction } from '@repo/agent/types';
import {
  applyUserControl,
  closeSession,
  getOrCreateSession,
  getSessionSnapshot,
  getSessionSnapshotFresh,
  resumeSession,
  runSessionTask,
  startSessionTask,
} from '@repo/agent';

export const sessionRoutes = new Hono();

sessionRoutes.post('/api/session', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const startUrl = typeof body.startUrl === 'string' ? body.startUrl : undefined;
    const session = await getOrCreateSession(startUrl);
    return c.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session';
    return c.json({ error: message }, 500);
  }
});

sessionRoutes.get('/api/session/:id', async (c) => {
  const id = c.req.param('id');
  const session = await getSessionSnapshotFresh(id);

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json(session);
});

sessionRoutes.delete('/api/session/:id', async (c) => {
  const id = c.req.param('id');
  const closed = await closeSession(id);

  if (!closed) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({ ok: true });
});

sessionRoutes.post('/api/session/:id/chat', async (c) => {
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    const existing = getSessionSnapshot(id);
    if (!existing) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (existing.status === 'running') {
      return c.json({ error: 'Agent is already running' }, 409);
    }

    const snapshot = startSessionTask(id, message);
    if (!snapshot) {
      return c.json({ error: 'Could not start task' }, 409);
    }

    void runSessionTask(id, message);

    return c.json(snapshot);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start task';
    return c.json({ error: msg }, 500);
  }
});

sessionRoutes.post('/api/session/:id/resume', async (c) => {
  const id = c.req.param('id');
  const resumed = resumeSession(id);

  if (!resumed) {
    return c.json({ error: 'Nothing to resume' }, 400);
  }

  const session = getSessionSnapshot(id);
  return c.json(session);
});

sessionRoutes.post('/api/session/:id/control', async (c) => {
  const id = c.req.param('id');

  try {
    const body = await c.req.json();

    if (!body || typeof body.type !== 'string') {
      return c.json({ error: 'Invalid control action' }, 400);
    }

    let action: UserControlAction;

    switch (body.type) {
      case 'click':
        action = { type: 'click', x: Number(body.x), y: Number(body.y) };
        break;
      case 'type':
        action = { type: 'type', text: String(body.text ?? '') };
        break;
      case 'key':
        action = { type: 'key', key: String(body.key ?? 'Enter') };
        break;
      case 'scroll':
        action = {
          type: 'scroll',
          x: Number(body.x),
          y: Number(body.y),
          deltaY: Number(body.deltaY),
        };
        break;
      default:
        return c.json({ error: 'Unknown control action' }, 400);
    }

    const session = await applyUserControl(id, action);

    if (!session) {
      return c.json(
        { error: 'Cannot control browser right now (agent may be running)' },
        409,
      );
    }

    return c.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Control action failed';
    return c.json({ error: message }, 500);
  }
});
