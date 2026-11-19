import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { applySaleDeltas } from '../../shared/saleOps.ts';
import { upsertFinance } from '../../shared/finance.ts';

// Completes a Planned Sale by applying the real live-sale logic (deduct the
// source group / mark the tagged animals sold) and recording a proper Sale,
// then marking the plan Completed. The admin may correct any detail that
// differs from the original plan before confirming. Supports multiple tagged
// animals in one tagged (individual) sale.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { id, date, farm_id, camp_id, species, animal_class, quantity, unit_price, total_price, animal_id, animal_ids, sale_type, sold_at, notes } = body;

    if (!id) return Response.json({ error: 'Plan id required' }, { status: 400 });
    const plan = await base44.entities.PlannedSale.get(id);
    if (!plan) return Response.json({ error: 'Planned sale not found' }, { status: 404 });
    if (plan.status !== 'Planned') return Response.json({ error: 'Plan is no longer active' }, { status: 400 });

    if (!date || !camp_id || !species) return Response.json({ error: 'Missing required fields' }, { status: 400 });

    let saleRecord;
    if (plan.type === 'bulk') {
      const qty = Number(quantity);
      if (!qty || qty <= 0) return Response.json({ error: 'A positive quantity is required' }, { status: 400 });
      const camp = await base44.entities.Camp.get(camp_id);
      const fid = farm_id || camp.farm_id;
      const deltas = await applySaleDeltas(base44, { type: 'bulk', camp_id, farm_id: fid, species, animal_class, quantity: qty });
      const calcTotal = (total_price && total_price > 0) ? Number(total_price) : (Number(unit_price || 0) * qty);
      saleRecord = await base44.entities.Sale.create({
        type: 'bulk', date, farm_id: fid, camp_id, species, animal_class: animal_class || '',
        quantity: qty,
        sale_type: sale_type || '', sold_at: sold_at || '', notes: notes || '', group_id: deltas.group_id || '',
      });
      await upsertFinance(base44, 'SaleFinance', 'sale_id', saleRecord.id, { unit_price: Number(unit_price || 0), total_price: calcTotal });
    } else {
      const ids = Array.isArray(animal_ids) ? animal_ids.filter(Boolean) : (animal_id ? [animal_id] : []);
      if (ids.length === 0) return Response.json({ error: 'Tagged sale requires at least one animal' }, { status: 400 });
      for (const aid of ids) {
        const a = await base44.entities.Animal.get(aid);
        if (a.status === 'Sold') return Response.json({ error: `${a.tag_number} is already sold` }, { status: 400 });
        if (a.status === 'Deceased') return Response.json({ error: `${a.tag_number} is deceased and cannot be sold` }, { status: 400 });
      }
      const deltas = await applySaleDeltas(base44, { type: 'individual', animal_ids: ids, date });
      const animals = deltas.animals;
      const first = animals[0];
      const animal_tags = animals.map((a) => a.tag_number);
      const calcTotal = (total_price && total_price > 0) ? Number(total_price) : (Number(unit_price || 0) * ids.length);
      saleRecord = await base44.entities.Sale.create({
        type: 'individual', date,
        farm_id: first.current_farm_id || farm_id || '',
        camp_id: first.current_camp_id || camp_id,
        species: first.species, animal_class: animal_class || '',
        quantity: ids.length,
        animal_id: ids[0], animal_tag: animal_tags[0], animal_ids: ids, animal_tags,
        group_id: deltas.group_ids[0] || '', group_ids: deltas.group_ids,
        sale_type: sale_type || '', sold_at: sold_at || '', notes: notes || '',
      });
      await upsertFinance(base44, 'SaleFinance', 'sale_id', saleRecord.id, { unit_price: Number(unit_price || 0), total_price: calcTotal });
      for (const aid of ids) {
        await base44.entities.Animal.update(aid, { sale_id: saleRecord.id });
      }
    }

    await base44.entities.PlannedSale.update(id, {
      status: 'Completed',
      completed_sale_id: saleRecord.id,
      completed_date: date,
    });

    return Response.json({ ok: true, sale_id: saleRecord.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}