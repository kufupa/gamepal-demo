import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applySaleDeltas, reverseSaleDeltas } from '../../shared/saleOps.ts';
import { upsertFinance } from '../../shared/finance.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { id, ...overrides } = body;
    if (!id) return Response.json({ error: 'Sale id required' }, { status: 400 });
    const existing = await base44.entities.Sale.get(id);
    if (!existing) return Response.json({ error: 'Sale not found' }, { status: 404 });
    // Prices live in the protected finance record now; fall back to it so a
    // partial edit can never zero out a historical sale.
    const finRows = await base44.entities.SaleFinance.filter({ sale_id: id });
    const existingFin = finRows[0] || null;

    const updated = {
      type: existing.type,
      date: overrides.date ?? existing.date,
      farm_id: overrides.farm_id ?? existing.farm_id,
      camp_id: overrides.camp_id ?? existing.camp_id,
      species: overrides.species ?? existing.species,
      animal_class: overrides.animal_class ?? existing.animal_class,
      quantity: overrides.quantity ?? existing.quantity,
      unit_price: overrides.unit_price ?? existingFin?.unit_price ?? 0,
      total_price: overrides.total_price ?? existingFin?.total_price ?? 0,
      animal_id: existing.animal_id,
      animal_ids: existing.animal_ids || [],
      notes: overrides.notes ?? existing.notes,
      sale_type: overrides.sale_type ?? existing.sale_type,
      sold_at: overrides.sold_at ?? existing.sold_at,
    };

    if (updated.type === 'bulk') {
      if (!updated.camp_id || !updated.species || !updated.quantity || updated.quantity <= 0) {
        return Response.json({ error: 'Bulk sale requires camp, species and a positive quantity' }, { status: 400 });
      }
      const camp = await base44.entities.Camp.get(updated.camp_id);
      updated.farm_id = camp.farm_id;
      updated.animal_id = '';
      updated.animal_ids = [];
      updated.total_price = (overrides.total_price && overrides.total_price > 0)
        ? Number(overrides.total_price)
        : (Number(updated.unit_price || 0) > 0 ? Number(updated.unit_price) * Number(updated.quantity) : Number(updated.total_price || 0));
    } else {
      const ids = Array.isArray(overrides.animal_ids) ? overrides.animal_ids.filter(Boolean) : (overrides.animal_id ? [overrides.animal_id] : []);
      if (ids.length === 0) return Response.json({ error: 'Tagged sale requires at least one animal' }, { status: 400 });
      for (const aid of ids) {
        const a = await base44.entities.Animal.get(aid);
        if (a.status === 'Deceased') return Response.json({ error: `${a.tag_number} is deceased` }, { status: 400 });
      }
      const first = await base44.entities.Animal.get(ids[0]);
      updated.animal_ids = ids;
      updated.animal_id = ids[0];
      updated.farm_id = first.current_farm_id || '';
      updated.camp_id = first.current_camp_id || '';
      updated.species = first.species;
      updated.quantity = ids.length;
      updated.total_price = (overrides.total_price && overrides.total_price > 0)
        ? Number(overrides.total_price)
        : (Number(updated.unit_price || 0) > 0 ? Number(updated.unit_price) * ids.length : Number(updated.total_price || 0));
    }

    // Reverse the old sale, then apply the corrected one.
    await reverseSaleDeltas(base44, existing);
    let res;
    try {
      res = await applySaleDeltas(base44, updated);
    } catch (e) {
      // Rollback: re-apply the original sale to restore state.
      try { await applySaleDeltas(base44, existing); } catch (_) {}
      return Response.json({ error: e.message }, { status: 400 });
    }

    const recordUpdate = {
      date: updated.date,
      farm_id: updated.farm_id,
      camp_id: updated.camp_id,
      species: updated.species,
      animal_class: updated.animal_class || '',
      quantity: updated.quantity,
      sale_type: updated.sale_type || '',
      sold_at: updated.sold_at || '',
      notes: updated.notes || '',
      group_id: res.group_id || '',
      group_ids: res.group_ids || [],
    };
    if (updated.type === 'individual') {
      recordUpdate.animal_id = updated.animal_id;
      recordUpdate.animal_ids = updated.animal_ids;
      recordUpdate.animal_tag = res.animals[0] ? res.animals[0].tag_number : existing.animal_tag;
      recordUpdate.animal_tags = res.animals.map((a) => a.tag_number);
      recordUpdate.sex = res.animals[0] ? res.animals[0].sex : existing.sex;
      // Link every sold animal to this sale record.
      for (const aid of updated.animal_ids) {
        await base44.entities.Animal.update(aid, { sale_id: id, sold_date: updated.date });
      }
    }
    await base44.entities.Sale.update(id, recordUpdate);
    await upsertFinance(base44, 'SaleFinance', 'sale_id', id, {
      unit_price: Number(updated.unit_price) || 0,
      total_price: Number(updated.total_price) || 0,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}