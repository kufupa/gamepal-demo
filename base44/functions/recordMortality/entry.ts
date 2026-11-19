import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { type, date, farm_id, camp_id, species, animal_class, quantity, animal_id, cause, notes } = body;

    if (!type || !date || !camp_id || !species) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'bulk') {
      if (!quantity || quantity <= 0) {
        return Response.json({ error: 'Bulk mortality requires a positive quantity' }, { status: 400 });
      }
      const camp = await base44.entities.Camp.get(camp_id);
      const fid = farm_id || camp.farm_id;
      const sourceGroups = await base44.entities.Group.filter({ camp_id, species, animal_class });
      let remaining = quantity;
      let reducedGroupId = null;
      for (const g of sourceGroups) {
        if (remaining <= 0) break;
        const take = Math.min(g.quantity, remaining);
        remaining -= take;
        await base44.entities.Group.update(g.id, { quantity: g.quantity - take });
        if (!reducedGroupId) reducedGroupId = g.id;
      }
      if (remaining > 0) {
        return Response.json({ error: `Source camp only had ${quantity - remaining} ${animal_class || species}. Mortality aborted.` }, { status: 400 });
      }
      await base44.entities.Mortality.create({
        type, date, farm_id: fid, camp_id, species, animal_class: animal_class || '',
        quantity, cause: cause || '', notes: notes || '', group_id: reducedGroupId || '',
      });
      return Response.json({ ok: true, message: `Recorded ${quantity} ${species} ${animal_class || ''} mortality` });
    }

    if (type === 'individual') {
      if (!animal_id) {
        return Response.json({ error: 'Individual mortality requires animal_id' }, { status: 400 });
      }
      const a = await base44.entities.Animal.get(animal_id);
      if (a.status === 'Deceased') {
        return Response.json({ error: `${a.tag_number} is already recorded as deceased` }, { status: 400 });
      }
      // A tagged animal is always counted individually: mortality changes only
      // its status. Bulk groups hold untagged animals and are never touched.
      await base44.entities.Animal.update(animal_id, {
        status: 'Deceased',
        deceased_date: date,
        last_farm_id: a.current_farm_id || '',
        last_camp_id: a.current_camp_id || '',
      });
      await base44.entities.Mortality.create({
        type, date,
        farm_id: a.current_farm_id || farm_id || '',
        camp_id: a.current_camp_id || camp_id,
        species: a.species,
        animal_class: animal_class || '',
        quantity: 1,
        animal_id, animal_tag: a.tag_number, sex: a.sex,
        cause: cause || '', notes: notes || '', group_id: '',
      });
      return Response.json({ ok: true, message: `${a.tag_number} marked deceased` });
    }

    return Response.json({ error: 'Unknown mortality type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}