import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import {
  chatWorkspace,
  createWorkspaceHandler,
  deleteWorkspaceHandler,
  getWorkspace,
  linkSession,
  listWorkspaces,
  patchWorkspace,
  patchWorkspaceSession,
  unlinkSession,
} from '../controllers/workspace.controller.js';

export const workspaceRoutes = Router();

workspaceRoutes.use('/api/workspaces', requireAuth);

workspaceRoutes.get('/api/workspaces', listWorkspaces);
workspaceRoutes.post('/api/workspaces', createWorkspaceHandler);
workspaceRoutes.get('/api/workspaces/:id', getWorkspace);
workspaceRoutes.patch('/api/workspaces/:id', patchWorkspace);
workspaceRoutes.delete('/api/workspaces/:id', deleteWorkspaceHandler);
workspaceRoutes.post('/api/workspaces/:id/sessions', linkSession);
workspaceRoutes.delete('/api/workspaces/:id/sessions/:sessionId', unlinkSession);
workspaceRoutes.post('/api/workspaces/:id/chat', chatWorkspace);
