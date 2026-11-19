import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { compactPlannedMovementPriorities } from '../../shared/plannedMovementPriority.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const result = await compactPlannedMovementPriorities(base44);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}