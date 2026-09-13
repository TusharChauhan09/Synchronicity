import { NextResponse } from 'next/server';
import { closeSession, getSessionSnapshotFresh } from '@/lib/agent/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSessionSnapshotFresh(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const closed = await closeSession(id);

  if (!closed) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
