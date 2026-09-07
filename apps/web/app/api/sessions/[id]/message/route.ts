import { after } from "next/server";
import { NextResponse } from "next/server";
import { runPrompt, startPrompt } from "../../../../../lib/session/manager";
import { toSnapshot } from "../../../../../lib/session/snapshot";
import { requireSession } from "../../../../../lib/session/store";
import { jsonError } from "../../../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { prompt?: string };
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Missing OPENAI_API_KEY. Add it to apps/web/.env.local and restart the server.",
        },
        { status: 500 },
      );
    }

    startPrompt(id, prompt);
    after(async () => {
      await runPrompt(id, prompt);
    });
    const session = requireSession(id);

    return NextResponse.json(toSnapshot(session));
  } catch (error) {
    return jsonError(error);
  }
}
