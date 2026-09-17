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
