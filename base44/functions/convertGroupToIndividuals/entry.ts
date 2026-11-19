import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Converts N animals out of a bulk group into individually-tagged records.
// One population transformation only:
//   - the bulk group quantity is reduced by exactly N
//   - N new tagged Animal records are created in the same farm/camp/species
//   - each new animal is marked `converted: true` so it is always counted as a
//     standalone individual and a later move/sale/mortality never deducts from
//     the bulk group again (preventing the double-deduction that happens when
//     a group is manually reduced AND a move then deducts the same animals).
// Total population is unchanged: (group - N) + N standalone = same.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Only admins can convert groups' }, { status: 403 });

    const body = await req.json();
    const { group_id, animals } = body;

    if (!group_id) return Response.json({ error: 'Missing group_id' }, { status: 400 });
    if (!Array.isArray(animals) || animals.length === 0) {
      return Response.json({ error: 'Provide one or more animals to convert' }, { status: 400 });
    }

    const group = await base44.entities.Group.get(group_id);
    const n = animals.length;
    if (n > group.quantity) {
      return Response.json({ error: `Cannot convert ${n} animals — this group only has ${group.quantity}.` }, { status: 400 });
    }

    // Validate each animal has the required fields.
    for (const a of animals) {
      if (!a.tag_number || !a.sex) {
        return Response.json({ error: 'Each animal needs at least a tag number and a sex' }, { status: 400 });
      }
    }

    const farmId = group.farm_id;
    const campId = group.camp_id;
    const species = group.species;

    const payload = animals.map((a) => ({
      tag_number: a.tag_number,
      species,
      sex: a.sex,
      date_of_birth: a.date_of_birth || '',
      birth_year: a.birth_year || '',
      current_farm_id: farmId,
      current_camp_id: campId,
      origin_farm_id: farmId,
      origin_camp_id: campId,
      sire_id: a.sire_id || '',
      sire_manual: a.sire_manual || '',
      dam_id: a.dam_id || '',
      dam_manual: a.dam_manual || '',
      is_breeding_male: !!a.is_breeding_male,
      breeds_species: a.is_breeding_male ? (Array.isArray(a.breeds_species) && a.breeds_species.length ? a.breeds_species : [species]) : [],
      notes: a.notes || '',
      tag_colour: a.tag_colour || '',
      horn_length: a.horn_length || '',
      tip_to_tip: a.tip_to_tip || '',
      photo_url: a.photo_url || '',
      status: 'Alive',
      converted: true,
    }));

    // Create the individuals first. If this fails, the group is untouched.
    const created = await base44.entities.Animal.bulkCreate(payload);

    // Purchase prices belong in the protected finance record, never on the animal.
    const withPrice = animals
      .map((a, i) => ({
        id: created[i]?.id,
        price: a.purchase_price === '' || a.purchase_price == null ? null : Number(a.purchase_price),
      }))
      .filter((x) => x.id && x.price != null);
    if (withPrice.length) {
      await base44.entities.AnimalPurchaseFinance.bulkCreate(withPrice.map((x) => ({ animal_id: x.id, purchase_price: x.price })));
    }

    // Then reduce the bulk group by exactly N. If this fails, roll back the
    // created animals so we never leave extra individuals with an unreduced group.
    try {
      await base44.entities.Group.update(group.id, { quantity: group.quantity - n });
    } catch (e) {
      await base44.entities.Animal.deleteMany({ id: { $in: created.map((a) => a.id) } });
      await base44.entities.AnimalPurchaseFinance.deleteMany({ animal_id: { $in: created.map((a) => a.id) } });
      throw e;
    }

    return Response.json({
      ok: true,
      message: `Converted ${n} ${species} into tagged individuals`,
      created_ids: created.map((a) => a.id),
      created_tags: created.map((a) => a.tag_number),
      new_group_quantity: group.quantity - n,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}