import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json();
    const { id, name, date, notes } = body;
    if (!id) return Response.json({ error: 'Event id required' }, { status: 400 });
    const event = await base44.entities.MovementEvent.get(id);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (event.deleted) return Response.json({ error: 'Event is in the Recycle Bin' }, { status: 400 });
    if (!date) return Response.json({ error: 'Event date is required' }, { status: 400 });
    // Event metadata only: population effects and movement lines are never touched,
    // and the event date never propagates to the individual line dates.
    await base44.entities.MovementEvent.update(id, { name: name || '', date, notes: notes || '' });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}