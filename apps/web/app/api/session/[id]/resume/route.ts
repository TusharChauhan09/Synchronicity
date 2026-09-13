import { NextResponse } from 'next/server';
import { getSessionSnapshot, resumeSession } from '@/lib/agent/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const resumed = resumeSession(id);

  if (!resumed) {
    return NextResponse.json({ error: 'Nothing to resume' }, { status: 400 });
  }

  const session = getSessionSnapshot(id);
  return NextResponse.json(session);
}
