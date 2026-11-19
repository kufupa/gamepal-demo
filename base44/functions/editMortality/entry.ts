import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyMortalityDeltas, reverseMortalityDeltas } from '../../shared/mortalityOps.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json();
    const { id, ...overrides } = body;
    if (!id) return Response.json({ error: 'Mortality id required' }, { status: 400 });
    const existing = await base44.entities.Mortality.get(id);
    if (!existing) return Response.json({ error: 'Mortality not found' }, { status: 404 });

    const updated = {
      type: existing.type,
      date: overrides.date ?? existing.date,
      farm_id: overrides.farm_id ?? existing.farm_id,
      camp_id: overrides.camp_id ?? existing.camp_id,
      species: overrides.species ?? existing.species,
      animal_class: overrides.animal_class ?? existing.animal_class,
      quantity: overrides.quantity ?? existing.quantity,
      animal_id: existing.animal_id,
      cause: overrides.cause ?? existing.cause,
      notes: overrides.notes ?? existing.notes,
    };

    if (updated.type === 'bulk' && (!updated.camp_id || !updated.species || !updated.quantity || updated.quantity <= 0)) {
      return Response.json({ error: 'Bulk mortality requires camp, species and a positive quantity' }, { status: 400 });
    }

    await reverseMortalityDeltas(base44, existing);
    let res;
    try {
      res = await applyMortalityDeltas(base44, updated);
    } catch (e) {
      try { await applyMortalityDeltas(base44, existing); } catch (_) {}
      return Response.json({ error: e.message }, { status: 400 });
    }

    const recordUpdate = {
      type: updated.type,
      date: updated.date,
      cause: updated.cause || '',
      notes: updated.notes || '',
    };
    if (updated.type === 'bulk') {
      Object.assign(recordUpdate, {
        farm_id: res.farm_id,
        camp_id: updated.camp_id,
        species: updated.species,
        animal_class: updated.animal_class || '',
        quantity: updated.quantity,
        group_id: res.group_id || '',
      });
    } else {
      Object.assign(recordUpdate, {
        farm_id: res.farm_id,
        camp_id: res.camp_id,
        species: res.species,
        animal_class: res.animal_class || '',
        quantity: 1,
        animal_id: updated.animal_id,
        animal_tag: res.animal_tag,
        sex: res.sex,
        group_id: res.group_id || '',
      });
    }
    await base44.entities.Mortality.update(id, recordUpdate);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}