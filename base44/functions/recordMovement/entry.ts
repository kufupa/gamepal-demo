import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyMovementDeltas } from '../../shared/movementOps.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { type, date, from_farm_id, from_camp_id, to_farm_id, to_camp_id,
            destination_type, destination_text,
            species, animal_class, quantity, animal_ids, note, movement_event_id } = body;

    const destType = destination_type || 'camp';
    const manual = destType === 'manual';

    if (!type || !date || !from_camp_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!manual && !to_camp_id) {
      return Response.json({ error: 'Destination camp required for internal moves' }, { status: 400 });
    }
    if (manual && !destination_text) {
      return Response.json({ error: 'Manual destination text is required' }, { status: 400 });
    }
    if (!manual && from_camp_id === to_camp_id && from_farm_id === to_farm_id) {
      return Response.json({ error: 'Source and destination are the same' }, { status: 400 });
    }

    if (type === 'bulk') {
      if (!species || !animal_class || !quantity || quantity <= 0) {
        return Response.json({ error: 'Bulk movements require species, class and a positive quantity' }, { status: 400 });
      }
    } else if (type === 'individual') {
      if (!animal_ids || !Array.isArray(animal_ids) || animal_ids.length === 0) {
        return Response.json({ error: 'Individual movements require animal_ids' }, { status: 400 });
      }
    } else {
      return Response.json({ error: 'Unknown movement type' }, { status: 400 });
    }

    const m = {
      type, date,
      from_farm_id, from_camp_id,
      to_farm_id: manual ? null : to_farm_id,
      to_camp_id: manual ? null : to_camp_id,
      destination_type: destType,
      destination_text: manual ? destination_text : null,
      species, animal_class, quantity, animal_ids, note: note || '',
    };

    // Optional: link this movement to an existing Capture Event (adds a line to it).
    let eventId = null;
    if (movement_event_id) {
      let ev = null;
      try { ev = await base44.entities.MovementEvent.get(movement_event_id); } catch (_) {}
      if (!ev || ev.deleted) return Response.json({ error: 'Capture event not found or deleted' }, { status: 400 });
      eventId = ev.id;
    }

    const res = await applyMovementDeltas(base44, m);

    await base44.entities.Movement.create({
      ...m,
      movement_event_id: eventId,
      animal_tags: res.tags || [],
    });

    return Response.json({ ok: true, message: type === 'bulk' ? `Moved ${quantity} ${species} ${animal_class}` : `Moved ${(animal_ids || []).length} animal(s)` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}