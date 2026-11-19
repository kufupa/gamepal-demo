import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyMovementDeltas } from '../../shared/movementOps.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json();
    const { id } = body;
    if (!id) return Response.json({ error: 'Movement id required' }, { status: 400 });
    const existing = await base44.entities.Movement.get(id);
    if (!existing) return Response.json({ error: 'Movement not found' }, { status: 404 });
    if (!existing.deleted) return Response.json({ error: 'Movement is not deleted' }, { status: 400 });
    // Re-apply the movement (animals/groups move back to the destination), then un-delete.
    // Because soft-delete already reversed the effect, the source camp holds the animals
    // again, so re-applying restores the exact original state.
    await applyMovementDeltas(base44, existing);
    await base44.entities.Movement.update(id, { deleted: false, deleted_date: '' });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}