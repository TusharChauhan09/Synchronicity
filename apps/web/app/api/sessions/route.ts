import { NextResponse } from "next/server";
import { createDemoSession } from "../../../lib/session/manager";
import { toSnapshot } from "../../../lib/session/snapshot";
import { jsonError } from "../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await createDemoSession();
    return NextResponse.json(toSnapshot(session));
  } catch (error) {
    return jsonError(error);
  }
}
