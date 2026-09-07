import { after } from "next/server";
import { NextResponse } from "next/server";
import { continueSession, startContinue } from "../../../../../lib/session/manager";
import { toSnapshot } from "../../../../../lib/session/snapshot";
import { requireSession } from "../../../../../lib/session/store";
import { jsonError } from "../../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    startContinue(id);
    after(async () => {
      await continueSession(id);
    });
    const session = requireSession(id);
    return NextResponse.json(toSnapshot(session));
  } catch (error) {
    return jsonError(error);
  }
}
