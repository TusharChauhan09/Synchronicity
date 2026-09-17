import type { Request, Response } from 'express';
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

export async function createSession(req: Request, res: Response) {
  try {
    const startUrl = typeof req.body?.startUrl === 'string' ? req.body.startUrl : undefined;
    const session = await getOrCreateSession(startUrl);
    res.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session';
    res.status(500).json({ error: message });
  }
}

export async function getSession(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Session id is required' });
    return;
  }

  const session = await getSessionSnapshotFresh(id);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(session);
}

export async function deleteSession(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Session id is required' });
    return;
  }

  const closed = await closeSession(id);

  if (!closed) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json({ ok: true });
}

export async function chatSession(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Session id is required' });
    return;
  }

  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const existing = getSessionSnapshot(id);
    if (!existing) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (existing.status === 'running') {
      res.status(409).json({ error: 'Agent is already running' });
      return;
    }

    const snapshot = startSessionTask(id, message);
    if (!snapshot) {
      res.status(409).json({ error: 'Could not start task' });
      return;
    }

    void runSessionTask(id, message);

    res.json(snapshot);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start task';
    res.status(500).json({ error: msg });
  }
}

export async function resumeSessionHandler(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Session id is required' });
    return;
  }

  const resumed = resumeSession(id);

  if (!resumed) {
    res.status(400).json({ error: 'Nothing to resume' });
    return;
  }

  const session = getSessionSnapshot(id);
  res.json(session);
}

export async function controlSession(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Session id is required' });
    return;
  }

  try {
    const body = req.body;

    if (!body || typeof body.type !== 'string') {
      res.status(400).json({ error: 'Invalid control action' });
      return;
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
        res.status(400).json({ error: 'Unknown control action' });
        return;
    }

    const session = await applyUserControl(id, action);

    if (!session) {
      res.status(409).json({
        error: 'Cannot control browser right now (agent may be running)',
      });
      return;
    }

    res.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Control action failed';
    res.status(500).json({ error: message });
  }
}
