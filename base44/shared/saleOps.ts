// Resolve the list of animal ids for a tagged sale, supporting both the new
// multi-animal shape (animal_ids[]) and the legacy single-animal shape (animal_id).
function taggedIds(s) {
  if (Array.isArray(s.animal_ids) && s.animal_ids.length > 0) return s.animal_ids.filter(Boolean);
  if (s.animal_id) return [s.animal_id];
  return [];
}

// Apply the population effects of a sale (reduce source group / mark animals sold)
// WITHOUT creating the Sale record. Mirrors recordSale logic so editSale can
// reverse-then-reapply a corrected sale consistently. Supports multiple tagged
// animals in one tagged (individual) sale.
export async function applySaleDeltas(base44, s) {
  if (s.type === 'bulk') {
    const { camp_id, farm_id, species, animal_class, quantity } = s;
    const sourceGroups = await base44.entities.Group.filter({ camp_id, species, animal_class });
    let remaining = quantity;
    let reducedGroupId = '';
    for (const g of sourceGroups) {
      if (remaining <= 0) break;
      const take = Math.min(g.quantity, remaining);
      remaining -= take;
      await base44.entities.Group.update(g.id, { quantity: g.quantity - take });
      if (!reducedGroupId) reducedGroupId = g.id;
    }
    if (remaining > 0) {
      throw new Error(`Source camp only had ${quantity - remaining} ${animal_class || species}. Sale aborted.`);
    }
    return { group_id: reducedGroupId, group_ids: [], animals: [] };
  }

  const ids = taggedIds(s);
  if (ids.length === 0) throw new Error('Tagged sale requires at least one animal');
  const date = s.date;
  const animals = [];
  const groupIds = [];
  for (const aid of ids) {
    const a = await base44.entities.Animal.get(aid);
    if (a.status === 'Sold') throw new Error(`${a.tag_number} is already sold`);
    if (a.status === 'Deceased') throw new Error(`${a.tag_number} is deceased and cannot be sold`);
    if (a.status === 'Hunted') throw new Error(`${a.tag_number} is already hunted`);
    // A tagged animal is counted individually, so selling it changes only its
    // status. Bulk groups hold untagged animals and are never touched here.
    await base44.entities.Animal.update(aid, {
      status: 'Sold', sold_date: date, sale_id: '',
      last_farm_id: a.current_farm_id || '', last_camp_id: a.current_camp_id || '',
    });
    animals.push(a);
    groupIds.push('');
  }
  return { group_id: groupIds[0] || '', group_ids: groupIds, animals };
}

// Reverse the population effects of a sale (undo), mirroring apply. Restores
// each tagged animal (and the group that was reduced for it, tracked per-animal
// via group_ids so standalone animals aren't over-restored).
export async function reverseSaleDeltas(base44, s) {
  if (s.type === 'bulk') {
    const { camp_id, farm_id, species, animal_class, quantity, date } = s;
    const sourceGroups = await base44.entities.Group.filter({ camp_id, species, animal_class });
    if (sourceGroups.length > 0) {
      await base44.entities.Group.update(sourceGroups[0].id, { quantity: sourceGroups[0].quantity + quantity });
    } else {
      await base44.entities.Group.create({ camp_id, farm_id, species, animal_class, quantity, date, from_source: 'Sale reversal', note: '' });
    }
    return;
  }

  const ids = taggedIds(s);
  if (ids.length === 0) return;
  // Mirror of apply: each animal's status comes back; no bulk group is touched.
  for (const aid of ids) {
    let a;
    try { a = await base44.entities.Animal.get(aid); } catch { continue; }
    if (a.status === 'Sold') {
      await base44.entities.Animal.update(aid, { status: 'Alive', sold_date: '', sale_id: '' });
    }
  }
}