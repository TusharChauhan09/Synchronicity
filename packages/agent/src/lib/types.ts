export type SessionStatus = 'idle' | 'running' | 'waiting_for_user';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type SessionSnapshot = {
  id: string;
  name: string;
  status: SessionStatus;
  waitReason?: string;
  url?: string;
  screenshot?: string;
  messages: ChatMessage[];
};

export type WorkspaceSnapshot = {
  id: string;
  name: string;
  sessionIds: string[];
  sessionColors: Record<string, string>;
  messages: ChatMessage[];
  status: 'idle' | 'running';
};

export type UserControlAction =
  | { type: 'click'; x: number; y: number }
  | { type: 'type'; text: string }
  | { type: 'key'; key: string }
  | { type: 'scroll'; x: number; y: number; deltaY: number };

export const BROWSER_VIEWPORT = { width: 1280, height: 800 };
