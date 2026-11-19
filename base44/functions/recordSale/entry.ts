import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applySaleDeltas } from '../../shared/saleOps.ts';
import { upsertFinance } from '../../shared/finance.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Only admins can record sales' }, { status: 403 });

    const body = await req.json();
    const { type, date, farm_id, camp_id, species, animal_class, quantity, unit_price, total_price, animal_id, animal_ids, notes, sale_type, sold_at } = body;

    if (!type || !date || !camp_id || !species) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'bulk') {
      if (!quantity || quantity <= 0) {
        return Response.json({ error: 'Bulk sale requires a positive quantity' }, { status: 400 });
      }
      const camp = await base44.entities.Camp.get(camp_id);
      const fid = farm_id || camp.farm_id;
      const deltas = await applySaleDeltas(base44, { type: 'bulk', camp_id, farm_id: fid, species, animal_class, quantity });
      const calcTotal = (total_price && total_price > 0) ? Number(total_price) : (Number(unit_price || 0) * quantity);
      const sale = await base44.entities.Sale.create({
        type, date, farm_id: fid, camp_id, species, animal_class: animal_class || '',
        quantity,
        sale_type: sale_type || '', sold_at: sold_at || '',
        notes: notes || '', group_id: deltas.group_id || '',
      });
      await upsertFinance(base44, 'SaleFinance', 'sale_id', sale.id, { unit_price: Number(unit_price || 0), total_price: calcTotal });
      return Response.json({ ok: true, sale, message: `Sold ${quantity} ${species} ${animal_class || ''}` });
    }

    if (type === 'individual') {
      const ids = Array.isArray(animal_ids) ? animal_ids.filter(Boolean) : (animal_id ? [animal_id] : []);
      if (ids.length === 0) {
        return Response.json({ error: 'Tagged sale requires at least one animal' }, { status: 400 });
      }
      const deltas = await applySaleDeltas(base44, { type: 'individual', animal_ids: ids, date });
      const animals = deltas.animals;
      const first = animals[0];
      const animal_tags = animals.map((a) => a.tag_number);
      const calcTotal = (total_price && total_price > 0) ? Number(total_price) : (Number(unit_price || 0) * ids.length);
      const sale = await base44.entities.Sale.create({
        type, date,
        farm_id: first.current_farm_id || farm_id || '',
        camp_id: first.current_camp_id || camp_id,
        species: first.species, animal_class: animal_class || '',
        quantity: ids.length,
        animal_id: ids[0], animal_tag: animal_tags[0], animal_ids: ids, animal_tags,
        group_id: deltas.group_ids[0] || '', group_ids: deltas.group_ids,
        sale_type: sale_type || '', sold_at: sold_at || '',
        notes: notes || '',
      });
      await upsertFinance(base44, 'SaleFinance', 'sale_id', sale.id, { unit_price: Number(unit_price || 0), total_price: calcTotal });
      // Link every sold animal to this sale record.
      for (const aid of ids) {
        await base44.entities.Animal.update(aid, { sale_id: sale.id, sold_date: date });
      }
      return Response.json({ ok: true, sale, message: `${ids.length} tagged animal(s) sold` });
    }

    return Response.json({ error: 'Unknown sale type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}