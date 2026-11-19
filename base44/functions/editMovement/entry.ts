import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyMovementDeltas, reverseMovementDeltas } from '../../shared/movementOps.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json();
    const { id, ...overrides } = body;
    if (!id) return Response.json({ error: 'Movement id required' }, { status: 400 });
    const existing = await base44.entities.Movement.get(id);
    if (!existing) return Response.json({ error: 'Movement not found' }, { status: 404 });

    const destType = overrides.destination_type ?? existing.destination_type ?? 'camp';
    const manual = destType === 'manual';
    const updated = {
      type: existing.type,
      date: overrides.date ?? existing.date,
      from_farm_id: overrides.from_farm_id ?? existing.from_farm_id,
      from_camp_id: overrides.from_camp_id ?? existing.from_camp_id,
      to_farm_id: manual ? null : (overrides.to_farm_id ?? existing.to_farm_id),
      to_camp_id: manual ? null : (overrides.to_camp_id ?? existing.to_camp_id),
      destination_type: destType,
      destination_text: manual ? (overrides.destination_text ?? existing.destination_text ?? '') : null,
      species: overrides.species ?? existing.species,
      animal_class: overrides.animal_class ?? existing.animal_class,
      quantity: overrides.quantity ?? existing.quantity,
      animal_ids: existing.animal_ids || (existing.type === 'individual' ? [] : undefined),
      note: overrides.note ?? existing.note,
    };

    if (!manual && updated.from_camp_id === updated.to_camp_id && updated.from_farm_id === updated.to_farm_id) {
      return Response.json({ error: 'Source and destination are the same' }, { status: 400 });
    }
    if (manual && !updated.destination_text) {
      return Response.json({ error: 'Manual destination text is required' }, { status: 400 });
    }
    if (updated.type === 'bulk' && (!updated.species || !updated.animal_class || !updated.quantity || updated.quantity <= 0)) {
      return Response.json({ error: 'Bulk movements require species, class and a positive quantity' }, { status: 400 });
    }

    // Reverse the old movement, then apply the corrected one.
    await reverseMovementDeltas(base44, existing);
    let res;
    try {
      res = await applyMovementDeltas(base44, updated);
    } catch (e) {
      // Rollback: re-apply the original movement to restore state.
      try { await applyMovementDeltas(base44, existing); } catch (_) {}
      return Response.json({ error: e.message }, { status: 400 });
    }

    const recordUpdate = {
      date: updated.date,
      from_farm_id: updated.from_farm_id,
      from_camp_id: updated.from_camp_id,
      to_farm_id: updated.to_farm_id,
      to_camp_id: updated.to_camp_id,
      destination_type: updated.destination_type,
      destination_text: updated.destination_text,
      note: updated.note || '',
    };
    if (updated.type === 'bulk') {
      Object.assign(recordUpdate, { species: updated.species, animal_class: updated.animal_class, quantity: updated.quantity });
    } else {
      Object.assign(recordUpdate, { animal_ids: updated.animal_ids, animal_tags: res.tags || [] });
    }
    await base44.entities.Movement.update(id, recordUpdate);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}