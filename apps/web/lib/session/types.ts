export type SessionStatus = "idle" | "running" | "awaiting_user" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
};

export type PendingApproval = {
  toolName: string;
  reason: string;
  instructions: string;
};

export type SessionSnapshot = {
  id: string;
  status: SessionStatus;
  screenshot: string | null;
  currentUrl: string;
  messages: ChatMessage[];
  pendingApproval: PendingApproval | null;
  error: string | null;
};

export type UserControlAction =
  | { type: "click"; x: number; y: number }
  | { type: "type"; text: string }
  | { type: "keypress"; keys: string[] }
  | { type: "scroll"; x: number; y: number; deltaY: number };
