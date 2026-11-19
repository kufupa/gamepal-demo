import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyAuctionLineDeltas, reverseAuctionLineDeltas, normalizeAuctionLineItem, auctionTotals } from '../../shared/auctionOps.ts';
import { splitLineFinances, upsertFinance } from '../../shared/finance.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { id, name, farm_id, auction_date, sold_at, buyer, notes, line_items } = body;
    if (!id) return Response.json({ error: 'Auction id required' }, { status: 400 });
    const existing = await base44.entities.AuctionEvent.get(id);
    if (!existing) return Response.json({ error: 'Auction not found' }, { status: 404 });
    if (!name || !farm_id || !auction_date) {
      return Response.json({ error: 'Name, farm and auction date are required' }, { status: 400 });
    }
    if (!Array.isArray(line_items) || line_items.length === 0) {
      return Response.json({ error: 'Add at least one sold-animal line item' }, { status: 400 });
    }

    const normalized = [];
    for (const li of line_items) {
      normalized.push(await normalizeAuctionLineItem(base44, li));
    }
    const oldDate = existing.auction_date;

    // Reverse all old line items first.
    for (const li of (existing.line_items || [])) {
      try { await reverseAuctionLineDeltas(base44, li, oldDate); } catch (_) {}
    }
    // Apply new line items; rollback to original on failure.
    const applied = [];
    try {
      for (const li of normalized) {
        await applyAuctionLineDeltas(base44, li, auction_date);
        applied.push(li);
      }
    } catch (e) {
      for (let i = applied.length - 1; i >= 0; i--) {
        try { await reverseAuctionLineDeltas(base44, applied[i], auction_date); } catch (_) {}
      }
      for (const li of (existing.line_items || [])) {
        try { await applyAuctionLineDeltas(base44, li, oldDate); } catch (_) {}
      }
      return Response.json({ error: e.message }, { status: 400 });
    }

    const totals = auctionTotals(normalized);
    const { operational, financeLines, total_revenue } = splitLineFinances(normalized);
    await base44.entities.AuctionEvent.update(id, {
      name, farm_id, auction_date,
      sold_at: sold_at || '', buyer: buyer || '', notes: notes || '',
      line_items: operational,
      total_animals: totals.total_animals, total_species: totals.total_species,
    });
    await upsertFinance(base44, 'AuctionFinance', 'auction_id', id, { total_revenue, line_items: financeLines });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}