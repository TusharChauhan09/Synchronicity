export type {
  ChatMessage,
  SessionSnapshot,
  SessionStatus,
  UserControlAction,
  WorkspaceSnapshot,
} from './lib/types.js';
export { BROWSER_VIEWPORT } from './lib/types.js';
export { PlaywrightComputer } from './computer.js';
export { createBrowserAgent } from './agent.js';
export {
  applyUserControl,
  cleanupAllSessions,
  closeSession,
  createUserSession,
  getOrCreateSession,
  getSessionSnapshot,
  getSessionSnapshotFresh,
  listSessionsForUser,
  renameSession,
  resumeSession,
  runSessionTask,
  runSessionTaskIfIdle,
  sessionBelongsToUser,
  startSessionTask,
} from './session.js';
export {
  abortWorkspaceChat,
  addSessionToWorkspace,
  findWorkspaceForSession,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceSnapshot,
  listWorkspacesForUser,
  removeSessionFromWorkspace,
  renameWorkspace,
  runWorkspaceChat,
  setWorkspaceSessionColor,
  startWorkspaceChat,
  workspaceBelongsToUser,
} from './workspace.js';
export { WORKSPACE_AGENT_COLORS } from './workspace-colors.js';
