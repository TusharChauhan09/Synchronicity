import { randomUUID } from "node:crypto";
import { run, type AgentInputItem, type RunToolApprovalItem } from "@openai/agents";
import { PlaywrightComputer } from "../agent/playwright-computer";
import { createBrowserAgent } from "../agent/create-agent";
import { getSessionStore, requireSession } from "./store";
import type { DemoSession } from "./store";
import type { ChatMessage, PendingApproval, UserControlAction } from "./types";

function chat(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: randomUUID(), role, content, createdAt: Date.now() };
}

function parseApproval(interruptions: RunToolApprovalItem[]): PendingApproval {
  const hitl = interruptions.find((item) => item.name === "request_user_control");
  let parsed: Record<string, unknown> = {};
  if (hitl?.arguments) {
    try {
      parsed = JSON.parse(hitl.arguments) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }

  return {
    toolName: hitl?.name ?? "request_user_control",
    reason: typeof parsed.reason === "string" ? parsed.reason : "User action required",
    instructions:
      typeof parsed.instructions === "string"
        ? parsed.instructions
        : "Finish the step in the browser, then press Continue.",
  };
}

type AgentRun = {
  history: AgentInputItem[];
  interruptions: RunToolApprovalItem[];
  state: {
    approve: (item: RunToolApprovalItem) => void;
  };
  finalOutput?: unknown;
};

async function applyRunResult(session: DemoSession, result: AgentRun): Promise<void> {
  session.history = result.history;

  if (result.interruptions.length > 0) {
    session.runState = result.state;
    session.interruptions = result.interruptions;
    session.status = "awaiting_user";
    session.pendingApproval = parseApproval(result.interruptions);
    session.messages.push(
      chat(
        "system",
        `${session.pendingApproval.reason}\n\n${session.pendingApproval.instructions}`,
      ),
    );
    await session.computer.captureNow();
    return;
  }

  session.runState = null;
  session.interruptions = null;
  session.pendingApproval = null;
  session.status = "idle";
  if (result.finalOutput) {
    session.messages.push(chat("assistant", String(result.finalOutput)));
  }
  await session.computer.captureNow();
}

export async function createDemoSession(): Promise<DemoSession> {
  const id = randomUUID();
  const startUrl = process.env.DEMO_START_URL ?? "https://example.com";

  const computer = new PlaywrightComputer({
    onScreenshot: (base64) => {
      const current = getSessionStore().get(id);
      if (current) {
        current.screenshotBase64 = base64;
      }
    },
    onUrl: (url) => {
      const current = getSessionStore().get(id);
      if (current) {
        current.currentUrl = url;
      }
    },
  });

  await computer.init(startUrl);
  const screenshotBase64 = await computer.screenshot();

  const session: DemoSession = {
    id,
    status: "idle",
    computer,
    agent: createBrowserAgent(computer),
    runState: null,
    interruptions: null,
    history: [],
    screenshotBase64,
    currentUrl: startUrl,
    messages: [
      chat(
        "system",
        "Session ready. Try: go to http://localhost:3000/demo-login and sign in. The agent should pause and hand you the browser.",
      ),
    ],
    pendingApproval: null,
    error: null,
    createdAt: Date.now(),
  };

  getSessionStore().set(id, session);
  return session;
}

export function startPrompt(sessionId: string, prompt: string): void {
  const session = requireSession(sessionId);
  if (session.status === "running") {
    throw new Error("The agent is already running.");
  }
  if (session.status === "awaiting_user") {
    throw new Error("Finish the current user-control step first.");
  }

  session.messages.push(chat("user", prompt));
  session.status = "running";
  session.error = null;
}

export async function runPrompt(sessionId: string, prompt: string): Promise<void> {
  const session = requireSession(sessionId);

  try {
    const input: string | AgentInputItem[] =
      session.history.length > 0
        ? [...session.history, { role: "user", content: prompt }]
        : prompt;
    const result = await run(session.agent, input);
    await applyRunResult(session, result);
  } catch (error) {
    session.status = "error";
    session.error = error instanceof Error ? error.message : String(error);
    session.messages.push(chat("system", `Agent error: ${session.error}`));
  }
}

export function startContinue(sessionId: string): void {
  const session = requireSession(sessionId);
  if (session.status !== "awaiting_user" || !session.runState) {
    throw new Error("This session is not waiting for Continue.");
  }

  session.status = "running";
  session.error = null;
  session.messages.push(
    chat("system", "Continue pressed. Resuming from this step."),
  );
}

export async function continueSession(sessionId: string): Promise<void> {
  const session = requireSession(sessionId);

  try {
    const state = session.runState as AgentRun["state"] | null;
    if (!state) {
      throw new Error("Missing paused run state.");
    }
    for (const item of session.interruptions ?? []) {
      state.approve(item);
    }
    const result = await run(session.agent, state);
    await applyRunResult(session, result);
  } catch (error) {
    session.status = "error";
    session.error = error instanceof Error ? error.message : String(error);
    session.messages.push(chat("system", `Resume error: ${session.error}`));
  }
}

export async function applyUserControl(
  sessionId: string,
  action: UserControlAction,
): Promise<void> {
  const session = requireSession(sessionId);
  if (session.status !== "awaiting_user") {
    throw new Error("Takeover is only available while the agent is paused.");
  }

  if (action.type === "click") {
    await session.computer.click(action.x, action.y, "left");
  } else if (action.type === "type") {
    await session.computer.type(action.text);
  } else if (action.type === "keypress") {
    await session.computer.keypress(action.keys);
  } else {
    await session.computer.scroll(action.x, action.y, 0, action.deltaY);
  }

  await session.computer.captureNow();
}

export async function refreshScreenshot(sessionId: string): Promise<void> {
  const session = requireSession(sessionId);
  if (session.status === "awaiting_user") {
    await session.computer.captureNow();
  }
}
