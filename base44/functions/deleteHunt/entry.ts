import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { reverseHuntLineDeltas } from '../../shared/huntOps.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { id } = body;
    if (!id) return Response.json({ error: 'Hunt id required' }, { status: 400 });
    const existing = await base44.entities.HuntEvent.get(id);
    if (!existing) return Response.json({ error: 'Hunt not found' }, { status: 404 });
    if (existing.deleted) return Response.json({ error: 'Hunt already deleted' }, { status: 400 });

    const huntDate = existing.end_date || existing.start_date;
    for (const li of (existing.line_items || [])) {
      try { await reverseHuntLineDeltas(base44, li, huntDate); } catch (_) {}
    }
    await base44.entities.HuntEvent.update(id, { deleted: true, deleted_date: new Date().toISOString().slice(0, 10) });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}