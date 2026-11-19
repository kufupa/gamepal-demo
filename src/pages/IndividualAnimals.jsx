import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Tag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import AddAnimalDialog from '@/components/AddAnimalDialog';
import { useSpecies } from '@/lib/species';
import { sireLabel } from '@/lib/animalHelpers';
import { useUserRole } from '@/lib/useUserRole';

export default function IndividualAnimals() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [animals, setAnimals] = useState([]);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ species: '', classification: '', farm_id: '', camp_id: '' });
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const { species: speciesMaster } = useSpecies();

  const load = async () => {
    setLoading(true);
    setAnimals(await base44.entities.Animal.list('-created_date', 500));
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setCamps(await base44.entities.Camp.list('-created_date', 200));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const sires = animals.filter((a) => a.sex === 'Male' && a.status !== 'Deceased' && a.status !== 'Sold');

  const filtered = animals.filter((a) => {
    if (q && !a.tag_number.toLowerCase().includes(q.toLowerCase())) return false;
    if (filters.species && a.species !== filters.species) return false;
    if (filters.classification === 'Females' && a.sex !== 'Female') return false;
    if (filters.classification === 'Males' && !(a.sex === 'Male' && !a.is_breeding_male)) return false;
    if (filters.classification === 'Breeding Males' && !a.is_breeding_male) return false;
    if (filters.farm_id && a.current_farm_id !== filters.farm_id) return false;
    if (filters.camp_id && a.current_camp_id !== filters.camp_id) return false;
    return true;
  });

  const speciesOptions = speciesMaster.map((s) => s.name);
  const farmName = (id) => farms.find((f) => f.id === id)?.name || '—';
  const campName = (id) => camps.find((c) => c.id === id)?.name || '—';

  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <Layout>
      <BrandHeader subtitle={`${animals.length} individual animals`} />
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-stone-900 text-lg flex items-center gap-1.5"><Tag className="w-4 h-4 text-amber-500" /> Individual Animals</h2>
          {isAdmin && (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-sm font-medium text-stone-900">
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        <div className="auc-card p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <FilterSelect label="Species" value={filters.species} onChange={(v) => setFilters((f) => ({ ...f, species: v }))} options={speciesOptions} />
            <FilterSelect label="Classification" value={filters.classification} onChange={(v) => setFilters((f) => ({ ...f, classification: v }))} options={['Females', 'Males', 'Breeding Males']} />
            <FilterSelect label="Farm" value={filters.farm_id} onChange={(v) => setFilters((f) => ({ ...f, farm_id: v, camp_id: '' }))} options={farms.map((f) => ({ value: f.id, label: f.name }))} />
            <FilterSelect label="Camp" value={filters.camp_id} onChange={(v) => setFilters((f) => ({ ...f, camp_id: v }))} options={camps.filter((c) => !filters.farm_id || c.farm_id === filters.farm_id).map((c) => ({ value: c.id, label: c.name }))} />
          </div>
          {activeFilters > 0 && (
            <button onClick={() => setFilters({ species: '', classification: '', farm_id: '', camp_id: '' })} className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tag number…"
            className="w-full h-11 pl-9 pr-9 rounded-lg border border-stone-200 bg-white text-sm font-medium"
          />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-stone-400" /></button>}
        </div>

        {loading ? (
          <p className="text-center text-stone-400 text-sm py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-8 italic">No animals match.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => (
              <button key={a.id} onClick={() => navigate(`/animal/${a.id}`)}               className={`w-full text-left auc-record px-3.5 py-3 hover:border-stone-300 ${a.status === 'Deceased' ? 'border-red-200 opacity-70' : a.status === 'Sold' ? 'border-amber-200 opacity-80' : 'border-stone-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-900">{a.tag_number}</span>
                    <span className="text-stone-500 text-sm ml-2">{a.species}</span>
                    {a.status === 'Deceased' && <span className="ml-2 text-[10px] uppercase tracking-wide text-red-500">Deceased</span>}
                    {a.status === 'Sold' && <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-600">Sold</span>}
                  </div>
                  <span className={`text-xs font-medium ${a.sex === 'Male' ? 'text-amber-600' : 'text-stone-500'}`}>{a.sex === 'Male' ? '♂ Male' : '♀ Female'}</span>
                </div>
                <p className="text-xs text-stone-500 mt-1">{a.status === 'Alive' ? `${farmName(a.current_farm_id)} → ${campName(a.current_camp_id)}` : `Last: ${farmName(a.last_farm_id)} → ${campName(a.last_camp_id)}`}</p>
                <p className="text-xs text-stone-400 mt-0.5">Sire: {sireLabel(a, animals)}</p>
                {a.tag_colour && <p className="text-xs text-stone-400 mt-0.5">Tag Colour: {a.tag_colour}</p>}
                {a.horn_length && <p className="text-xs text-stone-400 mt-0.5">Horn Length: {a.horn_length}"</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      {adding && <AddAnimalDialog open onOpenChange={(v) => !v && setAdding(false)} camp={null} farm={null} sires={sires} dams={animals.filter((a) => a.sex === 'Female' && a.status !== 'Deceased')} farms={farms} camps={camps} onDone={load} />}
    </Layout>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="auc-section-label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 rounded-lg border border-stone-200 bg-white px-2 text-sm mt-1">
        <option value="">All</option>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );
}