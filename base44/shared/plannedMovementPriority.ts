// Keeps active planned-movement priorities as a contiguous 1..N sequence.
// Priorities are a work batch/group, so duplicates are allowed; only when a
// whole priority group becomes empty (last record completed/deleted/cancelled)
// do the higher groups shift down to close the gap. Plans without a priority
// (legacy records) are left untouched and sort after prioritised ones.

export async function compactPlannedMovementPriorities(base44) {
  const active = await base44.entities.PlannedMovement.filter({ status: 'Planned' });
  const distinct = [...new Set(active.map((p) => p.priority).filter((v) => v != null && !Number.isNaN(v)))].sort((a, b) => a - b);
  const mapping = {};
  distinct.forEach((v, i) => { mapping[v] = i + 1; });
  const toUpdate = active
    .filter((p) => p.priority != null && mapping[p.priority] != null && mapping[p.priority] !== p.priority)
    .map((p) => ({ id: p.id, priority: mapping[p.priority] }));
  if (toUpdate.length) {
    await base44.entities.PlannedMovement.bulkUpdate(toUpdate);
  }
  return { compacted: toUpdate.length };
}