import type { SessionSnapshot, UserControlAction } from "../session/types";

async function parseSnapshot(response: Response): Promise<SessionSnapshot> {
  const data = (await response.json()) as SessionSnapshot & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export async function createSession(): Promise<SessionSnapshot> {
  return parseSnapshot(await fetch("/api/sessions", { method: "POST" }));
}

export async function getSession(id: string): Promise<SessionSnapshot> {
  return parseSnapshot(await fetch(`/api/sessions/${id}`, { cache: "no-store" }));
}

export async function sendPrompt(id: string, prompt: string): Promise<SessionSnapshot> {
  return parseSnapshot(
    await fetch(`/api/sessions/${id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }),
  );
}

export async function continueSession(id: string): Promise<SessionSnapshot> {
  return parseSnapshot(await fetch(`/api/sessions/${id}/continue`, { method: "POST" }));
}

export async function sendControl(
  id: string,
  action: UserControlAction,
): Promise<SessionSnapshot> {
  return parseSnapshot(
    await fetch(`/api/sessions/${id}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    }),
  );
}
