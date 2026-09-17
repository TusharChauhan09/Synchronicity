import { run } from '@openai/agents';
import type { ChatMessage, SessionSnapshot, UserControlAction } from './lib/types.js';
import { createBrowserAgent } from './agent.js';
import { PlaywrightComputer } from './computer.js';

type AgentSession = {
  id: string;
  userId: string;
  computer: PlaywrightComputer;
  status: SessionSnapshot['status'];
  waitReason?: string;
  resumeResolver?: () => void;
  messages: ChatMessage[];
  lastScreenshot?: string;
  lastUrl?: string;
  lastScreenshotAt: number;
  running: boolean;
};

const sessions = new Map<string, AgentSession>();
const creatingByUser = new Map<string, Promise<SessionSnapshot>>();

function findUserSession(userId: string): AgentSession | undefined {
  for (const session of sessions.values()) {
    if (session.userId === userId) return session;
  }
  return undefined;
}

export function sessionBelongsToUser(id: string, userId: string): boolean {
  return sessions.get(id)?.userId === userId;
}

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

async function refreshSnapshot(session: AgentSession) {
  if (session.running) return;
  if (Date.now() - session.lastScreenshotAt < 900) return;

  try {
    session.lastScreenshot = await session.computer.screenshot();
    session.lastUrl = await session.computer.getCurrentUrl();
    session.lastScreenshotAt = Date.now();
  } catch {
    // Browser may be closing
  }
}

export async function getOrCreateSession(
  userId: string,
  startUrl = 'https://duckduckgo.com',
): Promise<SessionSnapshot> {
  const existing = findUserSession(userId);
  if (existing) {
    await refreshSnapshot(existing);
    return getSessionSnapshot(existing.id)!;
  }

  const pending = creatingByUser.get(userId);
  if (pending) return pending;

  const created = createSession(userId, startUrl).finally(() => {
    creatingByUser.delete(userId);
  });
  creatingByUser.set(userId, created);
  return created;
}

async function createSession(
  userId: string,
  startUrl = 'https://duckduckgo.com',
): Promise<SessionSnapshot> {
  const id = crypto.randomUUID();
  const computer = new PlaywrightComputer();

  computer.setUserControlHandler(async (reason) => {
    const session = sessions.get(id);
    if (!session) return;

    session.status = 'waiting_for_user';
    session.waitReason = reason;

    await new Promise<void>((resolve) => {
      session.resumeResolver = resolve;
    });

    session.status = 'running';
    session.waitReason = undefined;
    session.resumeResolver = undefined;
  });

  await computer.launch(startUrl, { headless: true, useProfile: false });

  const session: AgentSession = {
    id,
    userId,
    computer,
    status: 'idle',
    messages: [
      createMessage(
        'assistant',
        'Session ready. Tell me what to do in the browser — I can search, click, and navigate for you.',
      ),
    ],
    lastScreenshotAt: 0,
    running: false,
  };

  sessions.set(id, session);
  await refreshSnapshot(session);

  return getSessionSnapshot(id)!;
}

export function getSessionSnapshot(id: string): SessionSnapshot | null {
  const session = sessions.get(id);
  if (!session) return null;

  return {
    id: session.id,
    status: session.status,
    waitReason: session.waitReason,
    url: session.lastUrl,
    screenshot: session.lastScreenshot,
    messages: session.messages,
  };
}

export async function getSessionSnapshotFresh(id: string): Promise<SessionSnapshot | null> {
  const session = sessions.get(id);
  if (!session) return null;

  await refreshSnapshot(session);
  return getSessionSnapshot(id);
}

export function resumeSession(id: string): boolean {
  const session = sessions.get(id);
  if (!session || session.status !== 'waiting_for_user' || !session.resumeResolver) {
    return false;
  }

  session.resumeResolver();
  return true;
}

export async function closeSession(id: string): Promise<boolean> {
  const session = sessions.get(id);
  if (!session) return false;

  sessions.delete(id);

  if (session.resumeResolver) {
    session.resumeResolver();
  }

  try {
    await session.computer.close();
  } catch {
    // Browser may already be closed
  }

  return true;
}

export async function cleanupAllSessions(): Promise<void> {
  const ids = [...sessions.keys()];
  for (const id of ids) {
    await closeSession(id);
  }
}

export async function applyUserControl(
  id: string,
  action: UserControlAction,
): Promise<SessionSnapshot | null> {
  const session = sessions.get(id);
  if (!session) return null;
  if (session.running) return null;
  if (session.status !== 'waiting_for_user' && session.status !== 'idle') return null;

  const { computer } = session;

  switch (action.type) {
    case 'click':
      await computer.click(action.x, action.y, 'left');
      break;
    case 'type':
      await computer.type(action.text);
      break;
    case 'key':
      await computer.keypress([action.key]);
      break;
    case 'scroll':
      await computer.scroll(action.x, action.y, 0, action.deltaY);
      break;
  }

  session.lastScreenshotAt = 0;
  await refreshSnapshot(session);
  return getSessionSnapshot(id);
}

export function startSessionTask(id: string, prompt: string): SessionSnapshot | null {
  const session = sessions.get(id);
  if (!session || session.running) return getSessionSnapshot(id);

  session.running = true;
  session.status = 'running';
  session.messages.push(createMessage('user', prompt));

  return getSessionSnapshot(id);
}

export async function runSessionTask(id: string, prompt: string): Promise<SessionSnapshot | null> {
  const session = sessions.get(id);
  if (!session) return null;

  if (!session.running) {
    const snapshot = startSessionTask(id, prompt);
    if (!snapshot) return null;
  }

  try {
    const agent = createBrowserAgent(session.computer);
    const result = await run(agent, prompt);

    session.messages.push(
      createMessage('assistant', result.finalOutput ?? 'Task completed.'),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    session.messages.push(createMessage('assistant', `Error: ${message}`));
  } finally {
    session.running = false;
    session.status = 'idle';
    session.waitReason = undefined;
    session.lastScreenshotAt = 0;
    await refreshSnapshot(session);
  }

  return getSessionSnapshot(id);
}
