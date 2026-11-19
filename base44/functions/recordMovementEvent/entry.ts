import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyMovementDeltas, reverseMovementDeltas } from '../../shared/movementOps.ts';

const MAX_LINES = 20;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { name, date, notes, lines } = body;

    if (!date) return Response.json({ error: 'Event date is required' }, { status: 400 });
    if (!Array.isArray(lines) || lines.length === 0) return Response.json({ error: 'At least one movement line is required' }, { status: 400 });
    if (lines.length > MAX_LINES) return Response.json({ error: `A capture event can hold at most ${MAX_LINES} movement lines` }, { status: 400 });

    // --- Phase 1: full pre-validation. Nothing is mutated until every check passes. ---
    const validateLine = (l) => {
      if (!l || !l.type || !['bulk', 'individual'].includes(l.type)) return 'Every line needs a valid type (bulk or tagged animals)';
      if (!l.from_camp_id) return 'Every line needs a source camp';
      const manual = (l.destination_type || 'camp') === 'manual';
      if (!manual && !l.to_camp_id) return 'Every internal line needs a destination camp';
      if (manual && !l.destination_text) return 'Every manual line needs a destination description';
      if (!manual && l.from_camp_id === l.to_camp_id) return 'A line cannot move animals into the camp they come from';
      if (l.type === 'bulk') {
        if (!l.species || !l.animal_class || !l.quantity || l.quantity <= 0) return 'Bulk lines need species, class and a positive quantity';
      } else if (!Array.isArray(l.animal_ids) || l.animal_ids.length === 0) {
        return 'Tagged animal lines need at least one animal';
      }
      return null;
    };
    for (let i = 0; i < lines.length; i++) {
      const err = validateLine(lines[i]);
      if (err) return Response.json({ error: `Line ${i + 1}: ${err}` }, { status: 400 });
    }

    // Resolve camps server-side; never trust client-supplied farm ids.
    const campIds = [...new Set(lines.flatMap((l) => [l.from_camp_id, l.to_camp_id].filter(Boolean)))];
    const camps = await base44.entities.Camp.filter({ id: { $in: campIds } });
    const campMap = new Map(camps.map((c) => [c.id, c]));
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!campMap.has(l.from_camp_id)) return Response.json({ error: `Line ${i + 1}: source camp not found` }, { status: 400 });
      if (l.destination_type === 'manual' ? false : (l.to_camp_id && !campMap.has(l.to_camp_id))) {
        return Response.json({ error: `Line ${i + 1}: destination camp not found` }, { status: 400 });
      }
    }

    // No tagged animal may appear in more than one line.
    const allIds = lines.filter((l) => l.type === 'individual').flatMap((l) => l.animal_ids);
    const uniqueIds = [...new Set(allIds)];
    if (uniqueIds.length !== allIds.length) {
      return Response.json({ error: 'The same tagged animal appears in more than one movement line' }, { status: 400 });
    }
    if (uniqueIds.length > 0) {
      const found = await base44.entities.Animal.filter({ id: { $in: uniqueIds } });
      if (found.length !== uniqueIds.length) {
        return Response.json({ error: 'One of the selected tagged animals no longer exists' }, { status: 400 });
      }
    }

    // Cumulative bulk availability per source camp + species + class, across all lines.
    const bulkByKey = {};
    for (const l of lines) {
      if (l.type !== 'bulk') continue;
      const key = `${l.from_camp_id}|${l.species}|${l.animal_class}`;
      bulkByKey[key] = (bulkByKey[key] || 0) + Number(l.quantity);
    }
    for (const [key, qty] of Object.entries(bulkByKey)) {
      const [campId, species, animalClass] = key.split('|');
      const groups = await base44.entities.Group.filter({ camp_id: campId, species, animal_class: animalClass });
      const available = groups.reduce((s, g) => s + (g.quantity || 0), 0);
      if (qty > available) {
        const campName = campMap.get(campId)?.name || 'source camp';
        return Response.json({ error: `Lines exceed availability: ${campName} only has ${available} ${species} ${animalClass}, lines request ${qty}` }, { status: 400 });
      }
    }

    // --- Phase 2: create the event, then apply each line as a normal movement.
    // If anything fails after application begins, roll everything back. ---
    const event = await base44.entities.MovementEvent.create({ name: name || '', date, notes: notes || '' });
    const applied = [];
    try {
      for (const l of lines) {
        const manual = (l.destination_type || 'camp') === 'manual';
        const m = {
          type: l.type,
          date,
          from_farm_id: campMap.get(l.from_camp_id).farm_id,
          from_camp_id: l.from_camp_id,
          to_farm_id: manual || !l.to_camp_id ? null : campMap.get(l.to_camp_id).farm_id,
          to_camp_id: manual ? null : l.to_camp_id,
          destination_type: l.destination_type || 'camp',
          destination_text: manual ? l.destination_text : null,
          species: l.type === 'bulk' ? l.species : undefined,
          animal_class: l.type === 'bulk' ? l.animal_class : undefined,
          quantity: l.type === 'bulk' ? Number(l.quantity) : undefined,
          animal_ids: l.type === 'individual' ? l.animal_ids : undefined,
          note: l.note || '',
        };
        const res = await applyMovementDeltas(base44, m);
        const record = await base44.entities.Movement.create({ ...m, movement_event_id: event.id, animal_tags: res.tags || [] });
        applied.push({ record, movement: m });
      }
    } catch (e) {
      for (const a of applied.reverse()) {
        try { await reverseMovementDeltas(base44, a.movement); } catch (_) {}
        try { await base44.entities.Movement.delete(a.record.id); } catch (_) {}
      }
      try { await base44.entities.MovementEvent.delete(event.id); } catch (_) {}
      return Response.json({ error: `Nothing was saved, the capture event was rolled back: ${e.message}` }, { status: 400 });
    }

    return Response.json({ ok: true, event_id: event.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}