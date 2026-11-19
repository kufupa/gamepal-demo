// Financial values live in protected *Finance entities that Managers cannot
// read. Only Admin and Viewer (canViewFinance) fetch or display them.

export const rand = (n) => `R ${Number(n || 0).toLocaleString()}`;

// Index a finance list by its parent key: financeBy(list, 'sale_id')
export function financeBy(list, key) {
  const map = {};
  for (const row of list || []) map[row[key]] = row;
  return map;
}

// Merge protected line prices back onto operational line items for an event.
export function mergeLineFinances(lines, financeRecord) {
  const prices = {};
  for (const f of financeRecord?.line_items || []) prices[f.line_id] = f;
  return (lines || []).map((li) => ({
    ...li,
    unit_price: prices[li.id]?.unit_price ?? '',
    line_total: prices[li.id]?.line_total ?? '',
  }));
}

// Revenue of one event for summing (returns 0 when no finance was loaded).
export const eventRevenue = (financeRecord) => Number(financeRecord?.total_revenue || 0);