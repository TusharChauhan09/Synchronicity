export type {
  ChatMessage,
  SessionSnapshot,
  SessionStatus,
  UserControlAction,
} from './lib/types.js';
export { BROWSER_VIEWPORT } from './lib/types.js';
export { PlaywrightComputer } from './computer.js';
export { createBrowserAgent } from './agent.js';
export {
  applyUserControl,
  cleanupAllSessions,
  closeSession,
  getOrCreateSession,
  getSessionSnapshot,
  getSessionSnapshotFresh,
  resumeSession,
  runSessionTask,
  startSessionTask,
} from './session.js';
