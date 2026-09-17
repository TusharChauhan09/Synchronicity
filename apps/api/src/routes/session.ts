import { Router } from 'express';
import {
  chatSession,
  controlSession,
  createSession,
  deleteSession,
  getSession,
  resumeSessionHandler,
} from '../controllers/session.controller.js';

export const sessionRoutes = Router();

sessionRoutes.post('/api/session', createSession);
sessionRoutes.get('/api/session/:id', getSession);
sessionRoutes.delete('/api/session/:id', deleteSession);
sessionRoutes.post('/api/session/:id/chat', chatSession);
sessionRoutes.post('/api/session/:id/resume', resumeSessionHandler);
sessionRoutes.post('/api/session/:id/control', controlSession);
