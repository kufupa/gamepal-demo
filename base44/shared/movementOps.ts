// A movement is "manual/external" when it has no internal destination camp.
// Manual movements only deduct from the source; they never add to a camp.
const isManualDest = (m) => m.destination_type === 'manual' || !m.to_camp_id;

// Apply the population effects of a movement (group/animal changes) WITHOUT
// creating the Movement record. Mirrors the logic in recordMovement so that
// editMovement can reverse-then-reapply a corrected movement consistently.
export async function applyMovementDeltas(base44, m) {
  const manual = isManualDest(m);

  if (m.type === 'bulk') {
    const { from_camp_id, to_camp_id, to_farm_id, species, animal_class, quantity, date, note } = m;
    const sourceGroups = await base44.entities.Group.filter({ camp_id: from_camp_id, species, animal_class });
    let remaining = quantity;
    for (const g of sourceGroups) {
      if (remaining <= 0) break;
      const take = Math.min(g.quantity, remaining);
      remaining -= take;
      await base44.entities.Group.update(g.id, { quantity: g.quantity - take });
    }
    if (remaining > 0) {
      throw new Error(`Source camp only had ${quantity - remaining} ${animal_class}. Movement aborted.`);
    }
    if (!manual) {
      const destGroups = await base44.entities.Group.filter({ camp_id: to_camp_id, farm_id: to_farm_id, species, animal_class });
      if (destGroups.length > 0) {
        await base44.entities.Group.update(destGroups[0].id, { quantity: destGroups[0].quantity + quantity });
      } else {
        await base44.entities.Group.create({ camp_id: to_camp_id, farm_id: to_farm_id, species, animal_class, quantity, date, from_source: 'Movement in', note: note || '' });
      }
    }
    return { tags: [] };
  }

  // A tagged animal is always counted individually: moving it changes only its
  // location. Bulk groups hold untagged animals and are never touched here.
  const tags = [];
  for (const id of m.animal_ids) {
    const a = await base44.entities.Animal.get(id);
    tags.push(a.tag_number);
    if (manual) {
      await base44.entities.Animal.update(id, { current_farm_id: null, current_camp_id: null });
    } else {
      await base44.entities.Animal.update(id, { current_farm_id: m.to_farm_id, current_camp_id: m.to_camp_id });
    }
  }
  return { tags };
}

// Reverse the population effects of a movement (undo), mirroring apply.
export async function reverseMovementDeltas(base44, m) {
  const manual = isManualDest(m);

  if (m.type === 'bulk') {
    const sourceGroups = await base44.entities.Group.filter({ camp_id: m.from_camp_id, species: m.species, animal_class: m.animal_class });
    if (sourceGroups.length > 0) {
      await base44.entities.Group.update(sourceGroups[0].id, { quantity: sourceGroups[0].quantity + m.quantity });
    } else {
      await base44.entities.Group.create({ camp_id: m.from_camp_id, farm_id: m.from_farm_id, species: m.species, animal_class: m.animal_class, quantity: m.quantity, date: m.date, from_source: 'Movement reversal', note: '' });
    }
    if (!manual) {
      const destGroups = await base44.entities.Group.filter({ camp_id: m.to_camp_id, farm_id: m.to_farm_id, species: m.species, animal_class: m.animal_class });
      let remaining = m.quantity;
      for (const g of destGroups) {
        if (remaining <= 0) break;
        const take = Math.min(g.quantity, remaining);
        remaining -= take;
        await base44.entities.Group.update(g.id, { quantity: g.quantity - take });
      }
    }
    return;
  }

  // Mirror of apply: a tagged animal's location is all that comes back.
  for (const id of (m.animal_ids || [])) {
    let a;
    try { a = await base44.entities.Animal.get(id); } catch { continue; }
    if (a.status !== 'Deceased') {
      await base44.entities.Animal.update(id, { current_farm_id: m.from_farm_id, current_camp_id: m.from_camp_id });
    }
  }
}