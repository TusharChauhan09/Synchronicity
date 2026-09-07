import { NextResponse } from "next/server";
import { refreshScreenshot } from "../../../../lib/session/manager";
import { toSnapshot } from "../../../../lib/session/snapshot";
import { requireSession } from "../../../../lib/session/store";
import { jsonError } from "../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = requireSession(id);
    if (session.status === "awaiting_user") {
      await refreshScreenshot(id);
    }
    return NextResponse.json(toSnapshot(session));
  } catch (error) {
    return jsonError(error);
  }
}
