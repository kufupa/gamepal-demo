// Sorting helpers that standardise chronological ordering across the app.
// Historical records are ordered by the user-entered event date (newest first);
// planned movements are ordered by nearest upcoming planned date first.

// Historical records: newest event date first; same date → newest created_date first (stable tie-break).
export function byEventDateDesc(a, b) {
  return (b.date || '').localeCompare(a.date || '') || (b.created_date || '').localeCompare(a.created_date || '');
}
export function sortByEventDateDesc(arr) {
  return [...arr].sort(byEventDateDesc);
}

// Planned movements: nearest upcoming planned_date first; undated plans after (stable by created_date).
export function byPlannedDateAsc(a, b) {
  const ad = a.planned_date || '';
  const bd = b.planned_date || '';
  if (ad && bd) return ad.localeCompare(bd) || (a.created_date || '').localeCompare(b.created_date || '');
  if (ad && !bd) return -1;
  if (!ad && bd) return 1;
  return (a.created_date || '').localeCompare(b.created_date || '');
}
export function sortByPlannedDateAsc(arr) {
  return [...arr].sort(byPlannedDateAsc);
}

// Active planned movements: ascending priority (1 first); plans without a
// priority sort after prioritised ones, stable by created_date within a group.
export function byPriorityAsc(a, b) {
  const ap = a.priority ?? null;
  const bp = b.priority ?? null;
  if (ap == null && bp == null) return (a.created_date || '').localeCompare(b.created_date || '');
  if (ap == null) return 1;
  if (bp == null) return -1;
  return ap - bp || (a.created_date || '').localeCompare(b.created_date || '');
}
export function sortByPriorityAsc(arr) {
  return [...arr].sort(byPriorityAsc);
}