import { useState } from 'react';
import { Search } from 'lucide-react';
import SpeciesSelect from '@/components/SpeciesSelect';

// Multi-select picker for tagged animals, constrained to ONE camp + ONE species
// so only compatible animals (same farm, same camp, same species) can be sold
// together in a single tagged sale. Reports the selection plus the resolved
// location/quantity/tags to the parent through onChange.
//
// onChange({ animal_ids, animal_tags, camp_id, farm_id, species, quantity })
export default function TaggedAnimalPicker({
  farms = [], camps = [], animals = [],
  initialFarmId = '', initialCampId = '', initialSpecies = '', initialIds = [],
  onChange,
}) {
  const [farmId, setFarmId] = useState(initialFarmId || '');
  const [campId, setCampId] = useState(initialCampId || '');
  const [species, setSpecies] = useState(initialSpecies || '');
  const [ids, setIds] = useState(initialIds || []);
  const [q, setQ] = useState('');

  const filteredCamps = farmId ? camps.filter((c) => c.farm_id === farmId) : camps;
  const campName = (id) => camps.find((c) => c.id === id)?.name || '—';
  const liveAnimals = animals.filter((a) => a.status === 'Alive');
  const matching = liveAnimals.filter((a) => {
    if (campId && a.current_camp_id !== campId) return false;
    if (species && a.species !== species) return false;
    return true;
  });
  // Keep already-selected animals visible even if they no longer match the
  // active filters (e.g. an animal sold by the sale being edited).
  const selected = ids.map((id) => animals.find((a) => a.id === id)).filter(Boolean);
  const merged = [...matching];
  for (const a of selected) if (!merged.find((x) => x.id === a.id)) merged.push(a);
  const list = q ? merged.filter((a) => (a.tag_number || '').toLowerCase().includes(q.toLowerCase())) : merged;

  const report = (nextIds, nextCamp, nextSpecies, nextFarm) => {
    const tags = nextIds.map((id) => animals.find((a) => a.id === id)?.tag_number).filter(Boolean);
    const camp = camps.find((c) => c.id === nextCamp);
    onChange?.({
      animal_ids: nextIds,
      animal_tags: tags,
      camp_id: nextCamp,
      farm_id: nextFarm || camp?.farm_id || '',
      species: nextSpecies,
      quantity: nextIds.length,
    });
  };

  const toggle = (id) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    setIds(next);
    report(next, campId, species, farmId);
  };
  const onFarm = (v) => { setFarmId(v); setCampId(''); setIds([]); report([], '', species, v); };
  const onCamp = (v) => { setCampId(v); setIds([]); report([], v, species, farmId); };
  const onSpecies = (v) => { setSpecies(v); setIds([]); report([], campId, v, farmId); };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-500">Farm</label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={farmId} onChange={(e) => onFarm(e.target.value)}>
            <option value="">All farms</option>
            {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-stone-500">Camp *</label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={campId} onChange={(e) => onCamp(e.target.value)}>
            <option value="">— Select —</option>
            {filteredCamps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-stone-500">Species *</label>
        <SpeciesSelect value={species} onChange={(v) => onSpecies(v)} required />
      </div>
      <div>
        <label className="text-xs text-stone-500">Select tagged animals — {ids.length} selected</label>
        <div className="relative mt-1 mb-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tag…" className="w-full h-9 pl-8 pr-3 rounded-md border border-input bg-background text-sm" />
        </div>
        <div className="border border-stone-200 rounded-md max-h-44 overflow-y-auto divide-y divide-stone-100">
          {!campId || !species ? (
            <p className="text-xs text-stone-400 p-3 text-center">Select a camp and species to list compatible animals.</p>
          ) : list.length === 0 ? (
            <p className="text-xs text-stone-400 p-3 text-center">No live tagged animals match this camp & species.</p>
          ) : list.map((a) => (
            <label key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50">
              <input type="checkbox" checked={ids.includes(a.id)} onChange={() => toggle(a.id)} className="w-4 h-4" />
              <span className="font-medium text-stone-800">{a.tag_number}</span>
              <span className="text-stone-500">{a.sex} · {campName(a.current_camp_id)}</span>
            </label>
          ))}
        </div>
        {ids.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selected.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-[11px] px-2 py-0.5 rounded-full">
                {a.tag_number}
                <button type="button" onClick={() => toggle(a.id)} className="text-stone-400 hover:text-stone-600">×</button>
              </span>
            ))}
          </div>
        )}
        <p className="text-[11px] text-stone-500 mt-1">Quantity auto = {ids.length}. Only animals from the same camp & species can be sold together.</p>
      </div>
    </div>
  );
}