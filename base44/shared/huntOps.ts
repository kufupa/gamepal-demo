// Stable id generator for embedded hunt line items.
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Apply the population effect of one hunt line item (reduce source group for
// bulk, or mark tagged animals deceased) WITHOUT writing the HuntEvent record.
// Mirrors the proven saleOps pattern so live population drops consistently.
// li: { camp_id, species, animal_class, quantity, animal_ids: string[] }
export async function applyHuntLineDeltas(base44, li, huntDate) {
  const animalIds = Array.isArray(li.animal_ids) ? li.animal_ids.filter(Boolean) : [];

  if (animalIds.length > 0) {
    // A tagged animal is counted individually: hunting it changes only its
    // status, never a bulk group (groups hold untagged animals only).
    for (const aid of animalIds) {
      const a = await base44.entities.Animal.get(aid);
      if (a.status !== 'Alive') {
        throw new Error(`${a.tag_number} is not available (status: ${a.status})`);
      }
      await base44.entities.Animal.update(aid, {
        status: 'Hunted', hunted_date: huntDate,
        last_farm_id: a.current_farm_id || '', last_camp_id: a.current_camp_id || '',
      });
    }
    return;
  }

  // Bulk (untagged) line item — deduct from matching source group(s).
  const { camp_id, species, animal_class, quantity } = li;
  if (!camp_id || !species || !quantity || quantity <= 0) {
    throw new Error('Bulk hunt line requires a camp, species and positive quantity');
  }
  const sourceGroups = await base44.entities.Group.filter({ camp_id, species, animal_class });
  let remaining = quantity;
  for (const g of sourceGroups) {
    if (remaining <= 0) break;
    const take = Math.min(g.quantity, remaining);
    remaining -= take;
    await base44.entities.Group.update(g.id, { quantity: g.quantity - take });
  }
  if (remaining > 0) {
    throw new Error(`Camp only had ${quantity - remaining} ${animal_class || species}. Hunt aborted.`);
  }
}

// Reverse the population effect of one hunt line item, mirroring apply.
export async function reverseHuntLineDeltas(base44, li, huntDate) {
  const animalIds = Array.isArray(li.animal_ids) ? li.animal_ids.filter(Boolean) : [];

  if (animalIds.length > 0) {
    // Mirror of apply: only the animal's status comes back, never a bulk group.
    for (const aid of animalIds) {
      let a;
      try { a = await base44.entities.Animal.get(aid); } catch { continue; }
      if (a.status === 'Hunted') {
        await base44.entities.Animal.update(aid, { status: 'Alive', hunted_date: '' });
      }
    }
    return;
  }

  // Bulk reverse — add quantity back to a matching group, or recreate one.
  const { camp_id, species, animal_class, quantity } = li;
  if (!camp_id) return;
  const sourceGroups = await base44.entities.Group.filter({ camp_id, species, animal_class });
  if (sourceGroups.length > 0) {
    await base44.entities.Group.update(sourceGroups[0].id, { quantity: sourceGroups[0].quantity + quantity });
  } else {
    let farmId = '';
    try { const camp = await base44.entities.Camp.get(camp_id); farmId = camp.farm_id; } catch {}
    await base44.entities.Group.create({
      camp_id, farm_id: farmId, species, animal_class: animal_class || '',
      quantity, date: huntDate, from_source: 'Hunt reversal', note: '',
    });
  }
}

// Normalize a raw line item (from the client) into the stored shape, resolving
// animal tags and computing quantity / line_total. Throws on invalid input.
export async function normalizeLineItem(base44, li) {
  const animalIds = Array.isArray(li.animal_ids) ? li.animal_ids.filter(Boolean) : [];
  const isTagged = animalIds.length > 0;
  if (!li.camp_id) throw new Error('Every hunted-animal line needs a camp');
  if (!li.species) throw new Error('Every hunted-animal line needs a species');
  const quantity = isTagged ? animalIds.length : Number(li.quantity) || 0;
  if (!isTagged && quantity <= 0) throw new Error('Bulk line needs a positive quantity');
  const unit_price = Number(li.unit_price) || 0;
  const lt = Number(li.line_total);
  const line_total = (!isNaN(lt) && lt > 0) ? lt : unit_price * quantity;
  let animal_tags = [];
  if (isTagged) {
    for (const aid of animalIds) {
      try { const a = await base44.entities.Animal.get(aid); animal_tags.push(a.tag_number); } catch {}
    }
  }
  return {
    id: li.id || uid(),
    camp_id: li.camp_id, species: li.species, animal_class: li.animal_class || '',
    quantity, animal_ids: animalIds, animal_tags,
    unit_price, line_total, notes: li.notes || '',
  };
}

export function huntTotals(lineItems) {
  const total_animals = lineItems.reduce((s, li) => s + (Number(li.quantity) || 0), 0);
  const total_species = new Set(lineItems.map((li) => li.species).filter(Boolean)).size;
  const total_revenue = lineItems.reduce((s, li) => s + (Number(li.line_total) || 0), 0);
  return { total_animals, total_species, total_revenue };
}