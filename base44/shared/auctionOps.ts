// Stable id generator for embedded auction line items.
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Apply the population effect of one auction line item (reduce source group for
// bulk, or mark tagged animals Sold) WITHOUT writing the AuctionEvent record.
// Mirrors the proven saleOps/huntOps pattern so live population drops consistently.
// li: { camp_id, species, animal_class, quantity, animal_ids: string[] }
export async function applyAuctionLineDeltas(base44, li, auctionDate) {
  const animalIds = Array.isArray(li.animal_ids) ? li.animal_ids.filter(Boolean) : [];

  if (animalIds.length > 0) {
    for (const aid of animalIds) {
      const a = await base44.entities.Animal.get(aid);
      if (a.status === 'Sold') throw new Error(`${a.tag_number} is already sold`);
      if (a.status === 'Deceased') throw new Error(`${a.tag_number} is deceased and cannot be sold`);
      if (a.status === 'Hunted') throw new Error(`${a.tag_number} is already hunted`);
      // A tagged animal is counted individually: selling it changes only its
      // status, never a bulk group (groups hold untagged animals only).
      await base44.entities.Animal.update(aid, {
        status: 'Sold', sold_date: auctionDate, sale_id: '',
        last_farm_id: a.current_farm_id || '', last_camp_id: a.current_camp_id || '',
      });
    }
    return;
  }

  // Bulk (untagged) line item — deduct from matching source group(s).
  const { camp_id, species, animal_class, quantity } = li;
  if (!camp_id || !species || !quantity || quantity <= 0) {
    throw new Error('Bulk auction line requires a camp, species and positive quantity');
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
    throw new Error(`Camp only had ${quantity - remaining} ${animal_class || species}. Auction aborted.`);
  }
}

// Reverse the population effect of one auction line item, mirroring apply.
export async function reverseAuctionLineDeltas(base44, li, auctionDate) {
  const animalIds = Array.isArray(li.animal_ids) ? li.animal_ids.filter(Boolean) : [];

  if (animalIds.length > 0) {
    // Mirror of apply: only the animal's status comes back, never a bulk group.
    for (const aid of animalIds) {
      let a;
      try { a = await base44.entities.Animal.get(aid); } catch { continue; }
      if (a.status === 'Sold') {
        await base44.entities.Animal.update(aid, { status: 'Alive', sold_date: '', sale_id: '' });
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
      quantity, date: auctionDate, from_source: 'Auction reversal', note: '',
    });
  }
}

// Normalize a raw line item (from the client) into the stored shape, resolving
// animal tags and computing quantity / line_total. Throws on invalid input.
export async function normalizeAuctionLineItem(base44, li) {
  const animalIds = Array.isArray(li.animal_ids) ? li.animal_ids.filter(Boolean) : [];
  const isTagged = animalIds.length > 0;
  if (!li.camp_id) throw new Error('Every auction line needs a camp');
  if (!li.species) throw new Error('Every auction line needs a species');
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

export function auctionTotals(lineItems) {
  const total_animals = lineItems.reduce((s, li) => s + (Number(li.quantity) || 0), 0);
  const total_species = new Set(lineItems.map((li) => li.species).filter(Boolean)).size;
  const total_revenue = lineItems.reduce((s, li) => s + (Number(li.line_total) || 0), 0);
  return { total_animals, total_species, total_revenue };
}