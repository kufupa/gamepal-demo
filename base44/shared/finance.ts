// Financial values live in protected finance entities (readable by Admin and
// Viewer, never Manager). Operational records never carry money.

// Create or update the single finance row belonging to a parent record.
export async function upsertFinance(base44, entity, key, parentId, payload) {
  const rows = await base44.entities[entity].filter({ [key]: parentId });
  if (rows[0]) return base44.entities[entity].update(rows[0].id, payload);
  return base44.entities[entity].create({ [key]: parentId, ...payload });
}

// Split price-bearing line items into the operational shape (no money) and the
// protected finance shape (per-line prices keyed by the line id).
export function splitLineFinances(lineItems) {
  const financeLines = lineItems.map((li) => ({
    line_id: li.id,
    unit_price: Number(li.unit_price) || 0,
    line_total: Number(li.line_total) || 0,
  }));
  const operational = lineItems.map((li) => {
    const { unit_price, line_total, ...rest } = li;
    return rest;
  });
  const total_revenue = financeLines.reduce((s, l) => s + (l.line_total || 0), 0);
  return { operational, financeLines, total_revenue };
}