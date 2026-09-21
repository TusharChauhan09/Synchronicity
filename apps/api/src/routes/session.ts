import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import {
  chatSession,
  controlSession,
  createSession,
  deleteSession,
  getSession,
  listSessions,
  patchSession,
  resumeSessionHandler,
} from '../controllers/session.controller.js';

export const sessionRoutes = Router();

sessionRoutes.use('/api/session', requireAuth);
sessionRoutes.use('/api/sessions', requireAuth);

sessionRoutes.get('/api/sessions', listSessions);
sessionRoutes.post('/api/session', createSession);
sessionRoutes.patch('/api/session/:id', patchSession);
sessionRoutes.get('/api/session/:id', getSession);
sessionRoutes.delete('/api/session/:id', deleteSession);
sessionRoutes.post('/api/session/:id/chat', chatSession);
sessionRoutes.post('/api/session/:id/resume', resumeSessionHandler);
sessionRoutes.post('/api/session/:id/control', controlSession);
