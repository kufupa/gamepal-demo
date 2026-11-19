// Apply the population effects of a mortality (group/animal changes) WITHOUT
// creating the Mortality record. Mirrors recordMortality for consistent edits.
export async function applyMortalityDeltas(base44, m) {
  if (m.type === 'bulk') {
    const camp = await base44.entities.Camp.get(m.camp_id);
    const fid = m.farm_id || camp.farm_id;
    const sourceGroups = await base44.entities.Group.filter({ camp_id: m.camp_id, species: m.species, animal_class: m.animal_class });
    let remaining = m.quantity;
    let reducedGroupId = '';
    for (const g of sourceGroups) {
      if (remaining <= 0) break;
      const take = Math.min(g.quantity, remaining);
      remaining -= take;
      await base44.entities.Group.update(g.id, { quantity: g.quantity - take });
      if (!reducedGroupId) reducedGroupId = g.id;
    }
    if (remaining > 0) {
      throw new Error(`Source camp only had ${m.quantity - remaining} ${m.animal_class || m.species}. Mortality aborted.`);
    }
    return { farm_id: fid, group_id: reducedGroupId };
  }

  // A tagged animal is always counted individually: mortality changes only its
  // status. No bulk group is reduced, because groups hold untagged animals only.
  const a = await base44.entities.Animal.get(m.animal_id);
  if (a.status === 'Deceased') throw new Error(`${a.tag_number} is already recorded as deceased`);
  await base44.entities.Animal.update(m.animal_id, {
    status: 'Deceased',
    deceased_date: m.date,
    last_farm_id: a.current_farm_id || '',
    last_camp_id: a.current_camp_id || '',
  });
  return {
    farm_id: a.current_farm_id || m.farm_id || '',
    camp_id: a.current_camp_id || m.camp_id,
    species: a.species,
    animal_class: m.animal_class || '',
    sex: a.sex,
    animal_tag: a.tag_number,
    group_id: '',
  };
}

// Reverse the population effects of a mortality (undo).
export async function reverseMortalityDeltas(base44, m) {
  if (m.type === 'bulk') {
    const sourceGroups = await base44.entities.Group.filter({ camp_id: m.camp_id, species: m.species, animal_class: m.animal_class });
    if (sourceGroups.length > 0) {
      await base44.entities.Group.update(sourceGroups[0].id, { quantity: sourceGroups[0].quantity + m.quantity });
    } else {
      await base44.entities.Group.create({ camp_id: m.camp_id, farm_id: m.farm_id, species: m.species, animal_class: m.animal_class, quantity: m.quantity, date: m.date, from_source: 'Mortality reversal', note: '' });
    }
    return;
  }

  let a;
  try { a = await base44.entities.Animal.get(m.animal_id); } catch { return; }
  // Mirror of apply: only the animal's status comes back, never a bulk group.
  await base44.entities.Animal.update(m.animal_id, {
    status: 'Alive',
    deceased_date: '',
    last_farm_id: '',
    last_camp_id: '',
  });
}