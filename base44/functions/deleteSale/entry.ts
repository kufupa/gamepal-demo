import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { reverseSaleDeltas } from '../../shared/saleOps.ts';

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
    if (existing.deleted) return Response.json({ error: 'Sale already deleted' }, { status: 400 });
    // Soft-delete: reverse the sale's population/revenue effect now, then flag as deleted.
    await reverseSaleDeltas(base44, existing);
    await base44.entities.Sale.update(id, { deleted: true, deleted_date: new Date().toISOString().slice(0, 10) });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}