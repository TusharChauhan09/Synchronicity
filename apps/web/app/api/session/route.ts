import { NextResponse } from 'next/server';
import { getOrCreateSession } from '@/lib/agent/session';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const startUrl = typeof body.startUrl === 'string' ? body.startUrl : undefined;
    const session = await getOrCreateSession(startUrl);

    return NextResponse.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
