import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { reverseAuctionLineDeltas } from '../../shared/auctionOps.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { id } = body;
    if (!id) return Response.json({ error: 'Auction id required' }, { status: 400 });
    const existing = await base44.entities.AuctionEvent.get(id);
    if (!existing) return Response.json({ error: 'Auction not found' }, { status: 404 });
    if (existing.deleted) return Response.json({ error: 'Auction already deleted' }, { status: 400 });

    for (const li of (existing.line_items || [])) {
      try { await reverseAuctionLineDeltas(base44, li, existing.auction_date); } catch (_) {}
    }
    await base44.entities.AuctionEvent.update(id, { deleted: true, deleted_date: new Date().toISOString().slice(0, 10) });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}