import { NextResponse } from 'next/server';
import { getSessionSnapshot, runSessionTask, startSessionTask } from '@/lib/agent/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const existing = getSessionSnapshot(id);
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (existing.status === 'running') {
      return NextResponse.json({ error: 'Agent is already running' }, { status: 409 });
    }

    const snapshot = startSessionTask(id, message);
    if (!snapshot) {
      return NextResponse.json({ error: 'Could not start task' }, { status: 409 });
    }

    void runSessionTask(id, message);

    return NextResponse.json(snapshot);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start task';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
