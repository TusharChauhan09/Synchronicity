import type { Agent, AgentInputItem, RunToolApprovalItem } from "@openai/agents";
import type { PlaywrightComputer } from "../agent/playwright-computer";
import type { ChatMessage, PendingApproval, SessionStatus } from "./types";

export type DemoSession = {
  id: string;
  status: SessionStatus;
  computer: PlaywrightComputer;
  agent: Agent;
  runState: unknown;
  interruptions: RunToolApprovalItem[] | null;
  history: AgentInputItem[];
  screenshotBase64: string | null;
  currentUrl: string;
  messages: ChatMessage[];
  pendingApproval: PendingApproval | null;
  error: string | null;
  createdAt: number;
};

const globalForSessions = globalThis as typeof globalThis & {
  __synchronicitySessions?: Map<string, DemoSession>;
};

export function getSessionStore(): Map<string, DemoSession> {
  globalForSessions.__synchronicitySessions ??= new Map();
  return globalForSessions.__synchronicitySessions;
}

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session ${id} was not found. Restart the workspace if the server reloaded.`);
    this.name = "SessionNotFoundError";
  }
}

export function requireSession(id: string): DemoSession {
  const session = getSessionStore().get(id);
  if (!session) {
    throw new SessionNotFoundError(id);
  }
  return session;
}
