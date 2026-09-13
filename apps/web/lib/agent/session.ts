import { run } from '@openai/agents';
import { createBrowserAgent } from './agent';
import { PlaywrightComputer } from './computer';

export type SessionStatus = 'idle' | 'running' | 'waiting_for_user';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type SessionSnapshot = {
  id: string;
  status: SessionStatus;
  waitReason?: string;
  url?: string;
  screenshot?: string;
  messages: ChatMessage[];
};

type AgentSession = {
  id: string;
  computer: PlaywrightComputer;
  status: SessionStatus;
  waitReason?: string;
  resumeResolver?: () => void;
  messages: ChatMessage[];
  lastScreenshot?: string;
  lastUrl?: string;
  lastScreenshotAt: number;
  running: boolean;
};

const sessions = new Map<string, AgentSession>();

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

async function refreshSnapshot(session: AgentSession) {
  if (Date.now() - session.lastScreenshotAt < 900) return;

  try {
    session.lastScreenshot = await session.computer.screenshot();
    session.lastUrl = await session.computer.getCurrentUrl();
    session.lastScreenshotAt = Date.now();
  } catch {
    // Browser may be closing
  }
}

export async function createSession(startUrl = 'https://duckduckgo.com'): Promise<SessionSnapshot> {
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

  await computer.launch(startUrl, { headless: false });

  const session: AgentSession = {
    id,
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

  await session.computer.close();
  return true;
}

export async function runSessionTask(id: string, prompt: string): Promise<SessionSnapshot | null> {
  const session = sessions.get(id);
  if (!session || session.running) return getSessionSnapshot(id);

  session.running = true;
  session.status = 'running';
  session.messages.push(createMessage('user', prompt));

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
