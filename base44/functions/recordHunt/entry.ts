import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyHuntLineDeltas, reverseHuntLineDeltas, normalizeLineItem, huntTotals } from '../../shared/huntOps.ts';
import { splitLineFinances, upsertFinance } from '../../shared/finance.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { name, farm_id, start_date, end_date, hunter_client, notes, line_items } = body;
    if (!name || !farm_id || !start_date) {
      return Response.json({ error: 'Name, farm and start date are required' }, { status: 400 });
    }
    if (!Array.isArray(line_items) || line_items.length === 0) {
      return Response.json({ error: 'Add at least one hunted-animal line item' }, { status: 400 });
    }

    // Normalize all line items first (validation + reads only, no writes).
    const normalized = [];
    for (const li of line_items) {
      normalized.push(await normalizeLineItem(base44, li));
    }
    const huntDate = end_date || start_date;

    // Apply population deltas sequentially; reverse on partial failure.
    const applied = [];
    for (const li of normalized) {
      try {
        await applyHuntLineDeltas(base44, li, huntDate);
        applied.push(li);
      } catch (e) {
        for (let i = applied.length - 1; i >= 0; i--) {
          try { await reverseHuntLineDeltas(base44, applied[i], huntDate); } catch (_) {}
        }
        return Response.json({ error: e.message }, { status: 400 });
      }
    }

    const totals = huntTotals(normalized);
    const { operational, financeLines, total_revenue } = splitLineFinances(normalized);
    const hunt = await base44.entities.HuntEvent.create({
      name, farm_id, start_date, end_date: end_date || '',
      hunter_client: hunter_client || '', notes: notes || '',
      line_items: operational,
      total_animals: totals.total_animals, total_species: totals.total_species,
    });
    await upsertFinance(base44, 'HuntFinance', 'hunt_id', hunt.id, { total_revenue, line_items: financeLines });
    return Response.json({ ok: true, hunt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}