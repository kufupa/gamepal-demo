import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Renames a species in the master list and cascades the new name to every
// record that stores the species name as text, so renaming never splits
// existing groups, animals, sales, mortality, movements or dashboard totals
// into "old name" vs "new name". Records keep referencing the same species;
// only its displayed name changes everywhere.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Only admins can rename species' }, { status: 403 });

    const body = await req.json();
    const { species_id, new_name } = body;
    if (!species_id || !new_name) return Response.json({ error: 'Missing species_id or new_name' }, { status: 400 });
    const newName = String(new_name).trim();
    if (!newName) return Response.json({ error: 'Name cannot be empty' }, { status: 400 });

    const sp = await base44.entities.Species.get(species_id);
    const oldName = sp.name;
    if (oldName === newName) return Response.json({ ok: true, renamed: false, message: 'No change' });

    // Prevent creating a duplicate species name.
    const existing = await base44.entities.Species.filter({ name: newName });
    if (existing.some((s) => s.id !== species_id)) {
      return Response.json({ error: `A species named "${newName}" already exists` }, { status: 400 });
    }

    // Update the master record.
    await base44.entities.Species.update(species_id, { name: newName });

    // Cascade the rename to every record storing the species name as text.
    const entities = ['Group', 'Animal', 'Movement', 'Mortality', 'Sale'];
    for (const e of entities) {
      let more = true;
      while (more) {
        const r = await base44.entities[e].updateMany({ species: oldName }, { $set: { species: newName } });
        more = r?.has_more === true;
      }
    }
    // Breeding-male "breeds_species" references the species name (stored as an
    // array so one male can breed multiple species). Update the matched element
    // in each array without replacing the whole array; legacy single-string
    // values are normalised to an array at the same time.
    const breeders = await base44.entities.Animal.filter({ breeds_species: oldName }, '-created_date', 500);
    if (breeders.length) {
      const updates = breeders.map((a) => {
        const arr = Array.isArray(a.breeds_species) ? a.breeds_species : (a.breeds_species ? [a.breeds_species] : []);
        return { id: a.id, breeds_species: arr.map((x) => x === oldName ? newName : x) };
      });
      for (let i = 0; i < updates.length; i += 500) {
        await base44.entities.Animal.bulkUpdate(updates.slice(i, i + 500));
      }
    }

    return Response.json({ ok: true, renamed: true, message: `Renamed "${oldName}" → "${newName}"`, oldName, newName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}