// Resolve a parent label for an animal, preferring a linked record, then
// manual pedigree text, then "Unknown".
export function parentLabel(parentId, parentManual, allAnimals) {
  if (parentId) {
    const found = allAnimals?.find((a) => a.id === parentId);
    if (found) return found.tag_number;
  }
  if (parentManual) return parentManual;
  return 'Unknown';
}

export function sireLabel(animal, allAnimals) {
  return parentLabel(animal.sire_id, animal.sire_manual, allAnimals);
}

export function damLabel(animal, allAnimals) {
  return parentLabel(animal.dam_id, animal.dam_manual, allAnimals);
}

// POPULATION RULE — the single source of truth for every total in the app:
//   - a Bulk Group quantity represents UNTAGGED animals only
//   - every live tagged Animal record always counts +1
// Nothing is inferred from species, sex or class, and no tagged animal is ever
// treated as being inside a group. An animal is "in a group" only in the sense
// that a bulk row is a number with no records behind it.
const isLive = (a) => a.status !== 'Deceased' && a.status !== 'Sold' && a.status !== 'Hunted';
const bulkQty = (g) => Math.max(0, Number(g.quantity) || 0);

// Live animals in a camp = sum of positive bulk quantities + live tagged animals.
export function campTotalAnimals(groups, animals) {
  const groupSum = (groups || []).reduce((s, g) => s + bulkQty(g), 0);
  return groupSum + (animals || []).filter(isLive).length;
}

// Breakdown of a camp's live animals by species (bulk quantities + tagged animals).
export function campBreakdown(groups, animals) {
  const bySpecies = {};
  for (const g of groups || []) {
    bySpecies[g.species] = (bySpecies[g.species] || 0) + bulkQty(g);
  }
  for (const a of (animals || []).filter(isLive)) {
    bySpecies[a.species] = (bySpecies[a.species] || 0) + 1;
  }
  const total = Object.values(bySpecies).reduce((s, n) => s + n, 0);
  return { total, bySpecies };
}

// Aggregate live animals across multiple camps (a farm, or all farms) using
// one consistent calculation.
export function aggregateCamps(camps, allGroups, allAnimals) {
  const bySpecies = {};
  let total = 0;
  for (const c of camps || []) {
    const cg = (allGroups || []).filter((g) => g.camp_id === c.id);
    const ca = (allAnimals || []).filter((a) => a.current_camp_id === c.id);
    const bd = campBreakdown(cg, ca);
    total += bd.total;
    for (const [sp, n] of Object.entries(bd.bySpecies)) {
      bySpecies[sp] = (bySpecies[sp] || 0) + n;
    }
  }
  return { total, bySpecies };
}

// The list of species groups a breeding male breeds with. Stored as an array
// on Animal.breeds_species; legacy records may still hold a single string.
export function breedsList(animal) {
  const v = animal?.breeds_species;
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) return [v];
  return [];
}