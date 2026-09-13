import { NextResponse } from 'next/server';
import { applyUserControl } from '@/lib/agent/session';
import type { UserControlAction } from '@/lib/agent/control';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();

    if (!body || typeof body.type !== 'string') {
      return NextResponse.json({ error: 'Invalid control action' }, { status: 400 });
    }

    let action: UserControlAction;

    switch (body.type) {
      case 'click':
        action = { type: 'click', x: Number(body.x), y: Number(body.y) };
        break;
      case 'type':
        action = { type: 'type', text: String(body.text ?? '') };
        break;
      case 'key':
        action = { type: 'key', key: String(body.key ?? 'Enter') };
        break;
      case 'scroll':
        action = {
          type: 'scroll',
          x: Number(body.x),
          y: Number(body.y),
          deltaY: Number(body.deltaY),
        };
        break;
      default:
        return NextResponse.json({ error: 'Unknown control action' }, { status: 400 });
    }

    const session = await applyUserControl(id, action);

    if (!session) {
      return NextResponse.json(
        { error: 'Cannot control browser right now (agent may be running)' },
        { status: 409 },
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Control action failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
