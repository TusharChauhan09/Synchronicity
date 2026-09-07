import { NextResponse } from "next/server";
import { SessionNotFoundError } from "./session/store";

export function jsonError(error: unknown, fallbackStatus = 500) {
  if (error instanceof SessionNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  const message = error instanceof Error ? error.message : String(error);
  const status =
    message.includes("already running") ||
    message.includes("Finish") ||
    message.includes("not waiting") ||
    message.includes("Takeover")
      ? 409
      : fallbackStatus;
  return NextResponse.json({ error: message }, { status });
}
