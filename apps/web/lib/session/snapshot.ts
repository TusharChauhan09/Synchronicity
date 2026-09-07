import type { DemoSession } from "./store";
import type { SessionSnapshot } from "./types";

export function toSnapshot(session: DemoSession): SessionSnapshot {
  return {
    id: session.id,
    status: session.status,
    screenshot: session.screenshotBase64
      ? `data:image/png;base64,${session.screenshotBase64}`
      : null,
    currentUrl: session.currentUrl,
    messages: session.messages,
    pendingApproval: session.pendingApproval,
    error: session.error,
  };
}
