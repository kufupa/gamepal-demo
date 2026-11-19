import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { reverseMovementDeltas } from '../../shared/movementOps.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json();
    const { id } = body;
    if (!id) return Response.json({ error: 'Event id required' }, { status: 400 });
    const event = await base44.entities.MovementEvent.get(id);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (event.deleted) return Response.json({ error: 'Event already deleted' }, { status: 400 });

    // Reverse every still-active line individually (line-level reversal logic only).
    // If a line fails midway, the lines already processed stay consistently deleted
    // and the caller can simply retry, since they are skipped on the next pass.
    const lines = await base44.entities.Movement.filter({ movement_event_id: id, deleted: false });
    const today = new Date().toISOString().slice(0, 10);
    for (const l of lines) {
      await reverseMovementDeltas(base44, l);
      await base44.entities.Movement.update(l.id, { deleted: true, deleted_date: today });
    }

    await base44.entities.MovementEvent.update(id, { deleted: true, deleted_date: today });
    return Response.json({ ok: true, lines: lines.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}