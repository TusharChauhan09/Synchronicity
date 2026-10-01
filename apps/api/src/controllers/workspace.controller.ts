import type { Request, Response } from 'express';
import {
  abortWorkspaceChat,
  addSessionToWorkspace,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceSnapshot,
  listWorkspacesForUser,
  removeSessionFromWorkspace,
  runWorkspaceChat,
  updateWorkspace,
  startWorkspaceChat,
  workspaceBelongsToUser,
} from '@repo/agent';
import { consumeChatCredit } from '@repo/db/billing';

function getUserId(req: Request, res: Response): string | null {
  if (!req.userId) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }
  return req.userId;
}

function requireOwnedWorkspace(req: Request, res: Response): { userId: string; id: string } | null {
  const userId = getUserId(req, res);
  if (!userId) return null;

  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Workspace id is required' });
    return null;
  }

  if (!workspaceBelongsToUser(id, userId)) {
    res.status(404).json({ error: 'Workspace not found' });
    return null;
  }

  return { userId, id };
}

export function listWorkspaces(req: Request, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) return;

  res.json(listWorkspacesForUser(userId));
}

export function createWorkspaceHandler(req: Request, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) return;

  const name = typeof req.body?.name === 'string' ? req.body.name : undefined;
  res.json(createWorkspace(userId, name));
}

export function getWorkspace(req: Request, res: Response) {
  const owned = requireOwnedWorkspace(req, res);
  if (!owned) return;

  const workspace = getWorkspaceSnapshot(owned.id);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  res.json(workspace);
}

export function patchWorkspace(req: Request, res: Response) {
  const owned = requireOwnedWorkspace(req, res);
  if (!owned) return;

  const nameRaw = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const colorRaw = typeof req.body?.color === 'string' ? req.body.color.trim() : '';

  if (!nameRaw && !colorRaw) {
    res.status(400).json({ error: 'Name or color is required' });
    return;
  }

  const patch: { name?: string; color?: string } = {};
  if (nameRaw) patch.name = nameRaw;
  if (colorRaw) patch.color = colorRaw;

  const workspace = updateWorkspace(owned.id, owned.userId, patch);
  if (!workspace) {
    res.status(400).json({ error: 'Workspace not found or invalid values' });
    return;
  }

  res.json(workspace);
}

export async function deleteWorkspaceHandler(req: Request, res: Response) {
  const owned = requireOwnedWorkspace(req, res);
  if (!owned) return;

  const removed = await deleteWorkspace(owned.id);
  if (!removed) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  res.json({ ok: true });
}

export function linkSession(req: Request, res: Response) {
  const owned = requireOwnedWorkspace(req, res);
  if (!owned) return;

  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const result = addSessionToWorkspace(owned.id, sessionId, owned.userId);
  if (!result.ok) {
    if (result.reason === 'in_other_workspace') {
      res.status(409).json({
        error: 'This agent is already linked to another workspace. Remove it there first.',
        otherWorkspaceId: result.otherWorkspaceId,
      });
      return;
    }
    res.status(404).json({ error: 'Workspace or session not found' });
    return;
  }

  res.json(result.workspace);
}

export function unlinkSession(req: Request, res: Response) {
  const owned = requireOwnedWorkspace(req, res);
  if (!owned) return;

  const sessionId = req.params.sessionId;
  if (!sessionId) {
    res.status(400).json({ error: 'Session id is required' });
    return;
  }

  const workspace = removeSessionFromWorkspace(owned.id, sessionId);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  res.json(workspace);
}

export async function chatWorkspace(req: Request, res: Response) {
  const owned = requireOwnedWorkspace(req, res);
  if (!owned) return;

  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const existing = getWorkspaceSnapshot(owned.id);
    if (!existing) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    try {
      await consumeChatCredit(owned.userId);
    } catch (creditError) {
      const creditMessage =
        creditError instanceof Error ? creditError.message : 'No credits remaining';
      res.status(402).json({ error: creditMessage });
      return;
    }

    const snapshot = startWorkspaceChat(owned.id, message);
    if (!snapshot) {
      res.status(409).json({ error: 'Workspace is already running a task' });
      return;
    }

    void runWorkspaceChat(owned.id, message).catch((runError) => {
      console.error('Workspace chat failed:', runError);
      abortWorkspaceChat(owned.id);
    });

    res.json(snapshot);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start workspace task';
    res.status(500).json({ error: msg });
  }
}
