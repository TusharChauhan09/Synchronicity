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
  sessionBelongsToUser,
  startSessionTask,
} from '@repo/agent';

function getUserId(req: Request, res: Response): string | null {
  if (!req.userId) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }
  return req.userId;
}

function getSessionId(req: Request, res: Response): string | null {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Session id is required' });
    return null;
  }
  return id;
}

function requireOwnedSession(req: Request, res: Response): { userId: string; id: string } | null {
  const userId = getUserId(req, res);
  if (!userId) return null;

  const id = getSessionId(req, res);
  if (!id) return null;

  if (!sessionBelongsToUser(id, userId)) {
    res.status(404).json({ error: 'Session not found' });
    return null;
  }

  return { userId, id };
}

export async function createSession(req: Request, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    const startUrl = typeof req.body?.startUrl === 'string' ? req.body.startUrl : undefined;
    const session = await getOrCreateSession(userId, startUrl);
    res.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session';
    res.status(500).json({ error: message });
  }
}

export async function getSession(req: Request, res: Response) {
  const owned = requireOwnedSession(req, res);
  if (!owned) return;

  const session = await getSessionSnapshotFresh(owned.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(session);
}

export async function deleteSession(req: Request, res: Response) {
  const owned = requireOwnedSession(req, res);
  if (!owned) return;

  const closed = await closeSession(owned.id);
  if (!closed) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json({ ok: true });
}

export async function chatSession(req: Request, res: Response) {
  const owned = requireOwnedSession(req, res);
  if (!owned) return;

  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const existing = getSessionSnapshot(owned.id);
    if (!existing) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (existing.status === 'running') {
      res.status(409).json({ error: 'Agent is already running' });
      return;
    }

    const snapshot = startSessionTask(owned.id, message);
    if (!snapshot) {
      res.status(409).json({ error: 'Could not start task' });
      return;
    }

    void runSessionTask(owned.id, message);
    res.json(snapshot);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start task';
    res.status(500).json({ error: msg });
  }
}

export async function resumeSessionHandler(req: Request, res: Response) {
  const owned = requireOwnedSession(req, res);
  if (!owned) return;

  const resumed = resumeSession(owned.id);
  if (!resumed) {
    res.status(400).json({ error: 'Nothing to resume' });
    return;
  }

  res.json(getSessionSnapshot(owned.id));
}

export async function controlSession(req: Request, res: Response) {
  const owned = requireOwnedSession(req, res);
  if (!owned) return;

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

    const session = await applyUserControl(owned.id, action);
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
