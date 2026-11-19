import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Moves animals from one class to another within the same camp & species
// (e.g. Offspring -> Females when they mature). The total population is
// unchanged — no animals are added, sold, moved or lost. Optionally updates
// the sex / breeding-male flag of selected tagged individuals to match the
// target class.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Only admins can reclassify' }, { status: 403 });

    const body = await req.json();
    const { camp_id, species, from_class, to_class, quantity, animal_ids } = body;

    if (!camp_id || !species || !from_class || !to_class) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (from_class === to_class) {
      return Response.json({ error: 'From and to class are the same' }, { status: 400 });
    }
    const qty = Number(quantity) || 0;
    if (qty < 0) return Response.json({ error: 'Quantity cannot be negative' }, { status: 400 });

    // 1) Move bulk quantity from the from_class group(s) to a to_class group.
    if (qty > 0) {
      const fromGroups = await base44.entities.Group.filter({ camp_id, species, animal_class: from_class });
      let remaining = qty;
      for (const g of fromGroups) {
        if (remaining <= 0) break;
        const take = Math.min(g.quantity, remaining);
        remaining -= take;
        await base44.entities.Group.update(g.id, { quantity: g.quantity - take });
      }
      if (remaining > 0) {
        return Response.json({ error: `Source only had ${qty - remaining} ${from_class}. Reclassify aborted.` }, { status: 400 });
      }
      const toGroups = await base44.entities.Group.filter({ camp_id, species, animal_class: to_class });
      if (toGroups.length > 0) {
        await base44.entities.Group.update(toGroups[0].id, { quantity: toGroups[0].quantity + qty });
      } else {
        const camp = await base44.entities.Camp.get(camp_id);
        await base44.entities.Group.create({
          camp_id, farm_id: camp.farm_id, species, animal_class: to_class,
          quantity: qty, date: new Date().toISOString().slice(0, 10),
          from_source: 'Reclassified', note: `Reclassified from ${from_class}`,
        });
      }
    }

    // 2) Reclassify selected tagged individuals to match the target class.
    if (Array.isArray(animal_ids) && animal_ids.length > 0) {
      const c = String(to_class).toLowerCase();
      for (const id of animal_ids) {
        try {
          const a = await base44.entities.Animal.get(id);
          if (a.status !== 'Alive') continue;
          const patch = {};
          if (c.includes('breeding')) {
            patch.sex = 'Male';
            patch.is_breeding_male = true;
            patch.breeds_species = a.breeds_species || a.species;
          } else if (c.includes('male')) {
            patch.sex = 'Male';
            patch.is_breeding_male = false;
          } else if (c.includes('female') || c.includes('ewe')) {
            patch.sex = 'Female';
            patch.is_breeding_male = false;
          }
          if (Object.keys(patch).length > 0) {
            await base44.entities.Animal.update(id, patch);
          }
        } catch { /* skip individual failures */ }
      }
    }

    return Response.json({ ok: true, message: `Reclassified ${qty} ${from_class} → ${to_class}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}