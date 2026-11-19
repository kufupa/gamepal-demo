import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyMovementDeltas } from '../../shared/movementOps.ts';
import { compactPlannedMovementPriorities } from '../../shared/plannedMovementPriority.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { id, actual_date, quantity, animal_ids, from_camp_id, from_farm_id,
            destination_type, to_camp_id, to_farm_id, destination_text, note } = body;

    if (!id) return Response.json({ error: 'Plan id required' }, { status: 400 });

    const plan = await base44.entities.PlannedMovement.get(id);
    if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 });
    if (plan.status !== 'Planned') return Response.json({ error: 'Plan is no longer active' }, { status: 400 });

    const srcCampId = from_camp_id || plan.from_camp_id;
    const srcFarmId = from_farm_id || plan.from_farm_id;
    if (!srcCampId) return Response.json({ error: 'Source camp required' }, { status: 400 });

    const destType = destination_type || plan.destination_type || 'camp';
    const isManual = destType === 'manual';
    const destCampId = isManual ? null : (to_camp_id || plan.to_camp_id || null);
    const destFarmId = isManual ? null : (to_farm_id || plan.to_farm_id || null);

    const m = {
      type: plan.type,
      date: actual_date || new Date().toISOString().slice(0, 10),
      from_farm_id: srcFarmId,
      from_camp_id: srcCampId,
      to_farm_id: destFarmId,
      to_camp_id: destCampId,
      destination_type: destType,
      destination_text: isManual ? (destination_text || plan.destination_text || '') : null,
      species: plan.species,
      animal_class: plan.animal_class,
      note: note != null ? note : (plan.note || ''),
    };

    if (plan.type === 'bulk') {
      const qty = quantity != null && quantity !== '' ? Number(quantity) : plan.quantity;
      if (!qty || qty <= 0) return Response.json({ error: 'A positive quantity is required' }, { status: 400 });
      m.quantity = qty;
    } else {
      const ids = animal_ids && animal_ids.length ? animal_ids : (plan.animal_ids || []);
      if (!ids.length) return Response.json({ error: 'At least one animal is required' }, { status: 400 });
      m.animal_ids = ids;
    }

    if (!isManual && m.to_camp_id === m.from_camp_id) {
      return Response.json({ error: 'Source and destination are the same' }, { status: 400 });
    }

    let tags;
    try {
      const res = await applyMovementDeltas(base44, m);
      tags = res.tags;
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }

    const record = {
      type: m.type, date: m.date,
      from_farm_id: m.from_farm_id, from_camp_id: m.from_camp_id,
      to_farm_id: m.to_farm_id, to_camp_id: m.to_camp_id,
      destination_type: m.destination_type, destination_text: m.destination_text,
      note: m.note,
    };
    if (m.type === 'bulk') {
      record.species = m.species; record.animal_class = m.animal_class; record.quantity = m.quantity;
    } else {
      record.animal_ids = m.animal_ids; record.animal_tags = tags;
    }

    const created = await base44.entities.Movement.create(record);

    const planUpdate = {
      status: 'Completed',
      completed_movement_id: created.id,
      completed_date: m.date,
      note: m.note,
      from_camp_id: m.from_camp_id,
      from_farm_id: m.from_farm_id,
      to_camp_id: m.to_camp_id,
      to_farm_id: m.to_farm_id,
      destination_type: m.destination_type,
      destination_text: m.destination_text,
    };
    if (m.type === 'bulk') {
      planUpdate.quantity = m.quantity;
    } else {
      planUpdate.animal_ids = m.animal_ids;
      planUpdate.animal_tags = tags;
    }

    await base44.entities.PlannedMovement.update(id, planUpdate);

    // Close any priority gap left by this completion (shared group/batch logic).
    try { await compactPlannedMovementPriorities(base44); } catch (e) { /* non-fatal */ }

    return Response.json({ ok: true, movement_id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}