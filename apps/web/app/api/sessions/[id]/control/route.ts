import { NextResponse } from "next/server";
import { applyUserControl } from "../../../../../lib/session/manager";
import { toSnapshot } from "../../../../../lib/session/snapshot";
import { requireSession } from "../../../../../lib/session/store";
import { jsonError } from "../../../../../lib/http";
import type { UserControlAction } from "../../../../../lib/session/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UserControlAction;
    if (!body?.type) {
      return NextResponse.json({ error: "Invalid control action." }, { status: 400 });
    }
    await applyUserControl(id, body);
    return NextResponse.json(toSnapshot(requireSession(id)));
  } catch (error) {
    return jsonError(error);
  }
}
