import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applySaleDeltas } from '../../shared/saleOps.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json();
    const { id } = body;
    if (!id) return Response.json({ error: 'Sale id required' }, { status: 400 });
    const existing = await base44.entities.Sale.get(id);
    if (!existing) return Response.json({ error: 'Sale not found' }, { status: 404 });
    if (!existing.deleted) return Response.json({ error: 'Sale is not deleted' }, { status: 400 });
    // Re-apply the sale (animals marked sold / source group reduced, revenue restored), then un-delete.
    const res = await applySaleDeltas(base44, existing);
    const patch = { deleted: false, deleted_date: '' };
    if (res && res.group_id != null) patch.group_id = res.group_id;
    if (Array.isArray(res?.group_ids)) patch.group_ids = res.group_ids;
    await base44.entities.Sale.update(id, patch);
    // Re-link every tagged animal in this sale to the sale record.
    const ids = Array.isArray(existing.animal_ids) && existing.animal_ids.length > 0
      ? existing.animal_ids
      : (existing.animal_id ? [existing.animal_id] : []);
    for (const aid of ids) {
      try { await base44.entities.Animal.update(aid, { sale_id: id }); } catch (_) {}
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}