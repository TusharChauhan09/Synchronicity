import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import {
  chatSession,
  controlSession,
  createSession,
  deleteSession,
  getSession,
  resumeSessionHandler,
} from '../controllers/session.controller.js';

export const sessionRoutes = Router();

sessionRoutes.use('/api/session', requireAuth);

sessionRoutes.post('/api/session', createSession);
sessionRoutes.get('/api/session/:id', getSession);
sessionRoutes.delete('/api/session/:id', deleteSession);
sessionRoutes.post('/api/session/:id/chat', chatSession);
sessionRoutes.post('/api/session/:id/resume', resumeSessionHandler);
sessionRoutes.post('/api/session/:id/control', controlSession);
