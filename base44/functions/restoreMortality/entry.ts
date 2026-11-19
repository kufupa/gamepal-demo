import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyMortalityDeltas } from '../../shared/mortalityOps.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json();
    const { id } = body;
    if (!id) return Response.json({ error: 'Mortality id required' }, { status: 400 });
    const existing = await base44.entities.Mortality.get(id);
    if (!existing) return Response.json({ error: 'Mortality not found' }, { status: 404 });
    if (!existing.deleted) return Response.json({ error: 'Mortality is not deleted' }, { status: 400 });
    // Re-apply the mortality (animal marked deceased / source group reduced), then un-delete.
    const res = await applyMortalityDeltas(base44, existing);
    const patch = { deleted: false, deleted_date: '' };
    if (res && res.group_id != null) patch.group_id = res.group_id;
    await base44.entities.Mortality.update(id, patch);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}