import type { ChatMessage, WorkspaceSnapshot } from './lib/types.js';
import {
  getSessionSnapshot,
  runSessionTaskIfIdle,
  sessionBelongsToUser,
} from './session.js';
import { normalizeWorkspaceColor, pickWorkspaceColor } from './workspace-colors.js';

type Workspace = {
  id: string;
  userId: string;
  name: string;
  color: string;
  sessionIds: string[];
  messages: ChatMessage[];
  running: boolean;
};

const workspaces = new Map<string, Workspace>();

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function countUserWorkspaces(userId: string): number {
  let count = 0;
  for (const workspace of workspaces.values()) {
    if (workspace.userId === userId) count += 1;
  }
  return count;
}

function usedColorsForUser(userId: string): Set<string> {
  const used = new Set<string>();
  for (const workspace of workspaces.values()) {
    if (workspace.userId === userId) used.add(workspace.color);
  }
  return used;
}

function toSnapshot(workspace: Workspace): WorkspaceSnapshot {
  return {
    id: workspace.id,
    name: workspace.name,
    color: workspace.color,
    sessionIds: [...workspace.sessionIds],
    messages: workspace.messages,
    status: workspace.running ? 'running' : 'idle',
  };
}

export function workspaceBelongsToUser(id: string, userId: string): boolean {
  return workspaces.get(id)?.userId === userId;
}

export function createWorkspace(userId: string, name?: string): WorkspaceSnapshot {
  const id = crypto.randomUUID();
  const workspace: Workspace = {
    id,
    userId,
    name: name?.trim().slice(0, 64) || `workspace-${countUserWorkspaces(userId) + 1}`,
    color: pickWorkspaceColor(usedColorsForUser(userId)),
    sessionIds: [],
    messages: [
      createMessage(
        'assistant',
        'Workspace ready. Drag agents onto this workspace, then send one message to run every linked browser.',
      ),
    ],
    running: false,
  };

  workspaces.set(id, workspace);
  return toSnapshot(workspace);
}

export function listWorkspacesForUser(userId: string): WorkspaceSnapshot[] {
  const list: WorkspaceSnapshot[] = [];
  for (const workspace of workspaces.values()) {
    if (workspace.userId === userId) list.push(toSnapshot(workspace));
  }
  return list;
}

export function getWorkspaceSnapshot(id: string): WorkspaceSnapshot | null {
  const workspace = workspaces.get(id);
  if (!workspace) return null;
  return toSnapshot(workspace);
}

export function updateWorkspace(
  id: string,
  userId: string,
  patch: { name?: string; color?: string },
): WorkspaceSnapshot | null {
  const workspace = workspaces.get(id);
  if (!workspace || workspace.userId !== userId) return null;

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) return null;
    workspace.name = trimmed.slice(0, 64);
  }

  if (patch.color !== undefined) {
    const normalized = normalizeWorkspaceColor(patch.color);
    if (!normalized) {
      if (patch.name === undefined) return null;
    } else {
      workspace.color = normalized;
    }
  }

  return toSnapshot(workspace);
}

export function renameWorkspace(id: string, name: string): WorkspaceSnapshot | null {
  const workspace = workspaces.get(id);
  if (!workspace) return null;
  return updateWorkspace(id, workspace.userId, { name });
}

export function findWorkspaceForSession(userId: string, sessionId: string): string | null {
  for (const workspace of workspaces.values()) {
    if (workspace.userId === userId && workspace.sessionIds.includes(sessionId)) {
      return workspace.id;
    }
  }
  return null;
}

export type LinkSessionResult =
  | { ok: true; workspace: WorkspaceSnapshot }
  | { ok: false; reason: 'not_found' | 'in_other_workspace'; otherWorkspaceId?: string };

export function addSessionToWorkspace(
  workspaceId: string,
  sessionId: string,
  userId: string,
): LinkSessionResult {
  const workspace = workspaces.get(workspaceId);
  if (!workspace || workspace.userId !== userId) return { ok: false, reason: 'not_found' };
  if (!sessionBelongsToUser(sessionId, userId)) return { ok: false, reason: 'not_found' };
  if (workspace.sessionIds.includes(sessionId)) {
    return { ok: true, workspace: toSnapshot(workspace) };
  }

  const otherId = findWorkspaceForSession(userId, sessionId);
  if (otherId && otherId !== workspaceId) {
    return { ok: false, reason: 'in_other_workspace', otherWorkspaceId: otherId };
  }

  workspace.sessionIds.push(sessionId);
  return { ok: true, workspace: toSnapshot(workspace) };
}

export function removeSessionFromWorkspace(
  workspaceId: string,
  sessionId: string,
): WorkspaceSnapshot | null {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) return null;

  workspace.sessionIds = workspace.sessionIds.filter((id) => id !== sessionId);
  return toSnapshot(workspace);
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  return workspaces.delete(id);
}

export function startWorkspaceChat(workspaceId: string, message: string): WorkspaceSnapshot | null {
  const workspace = workspaces.get(workspaceId);
  if (!workspace || workspace.running) return null;

  workspace.running = true;
  workspace.messages.push(createMessage('user', message));
  return toSnapshot(workspace);
}

export function abortWorkspaceChat(workspaceId: string): void {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) return;
  workspace.running = false;
}

export async function runWorkspaceChat(
  workspaceId: string,
  message: string,
): Promise<WorkspaceSnapshot | null> {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) return null;

  if (!workspace.running) {
    const started = startWorkspaceChat(workspaceId, message);
    if (!started) return null;
  }

  const sessionIds = [...workspace.sessionIds];

  if (sessionIds.length === 0) {
    workspace.messages.push(
      createMessage('assistant', 'Link at least one agent tab to this workspace first.'),
    );
    workspace.running = false;
    return toSnapshot(workspace);
  }

  try {
    const lines: string[] = [];

    for (const sessionId of sessionIds) {
      const before = getSessionSnapshot(sessionId);
      const label = before?.name ?? sessionId.slice(0, 8);

      if (!before) {
        lines.push(`${label}: session not found.`);
        continue;
      }

      if (before.status === 'running' || before.status === 'waiting_for_user') {
        lines.push(`${label}: skipped (agent is busy or waiting for you).`);
        continue;
      }

      const assistantBefore = before.messages.filter((m) => m.role === 'assistant').length;

      const snapshot = await runSessionTaskIfIdle(sessionId, message);
      if (!snapshot) {
        lines.push(`${label}: could not run task.`);
        continue;
      }

      const assistants = snapshot.messages.filter((m) => m.role === 'assistant');
      const reply =
        assistants[assistantBefore]?.content ??
        assistants.at(-1)?.content ??
        'No response.';
      lines.push(`${label}: ${reply}`);
    }

    workspace.messages.push(createMessage('assistant', lines.join('\n\n')));
  } catch (error) {
    const text = error instanceof Error ? error.message : 'Workspace task failed.';
    workspace.messages.push(createMessage('assistant', `Error: ${text}`));
  } finally {
    workspace.running = false;
  }

  return toSnapshot(workspace);
}
