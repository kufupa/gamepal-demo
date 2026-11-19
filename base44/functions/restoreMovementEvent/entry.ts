import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyMovementDeltas } from '../../shared/movementOps.ts';

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
    if (!event.deleted) return Response.json({ error: 'Event is not deleted' }, { status: 400 });

    // Re-apply only the lines that are still deleted. A line that was separately
    // restored or edited earlier stays exactly as it is and is skipped here.
    // If a line fails midway, it stays deleted (consistent) and a retry skips
    // the lines already restored.
    const lines = await base44.entities.Movement.filter({ movement_event_id: id, deleted: true });
    for (const l of lines) {
      await applyMovementDeltas(base44, l);
      await base44.entities.Movement.update(l.id, { deleted: false, deleted_date: '' });
    }

    await base44.entities.MovementEvent.update(id, { deleted: false, deleted_date: '' });
    return Response.json({ ok: true, lines: lines.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}