import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import { useSpecies } from '@/lib/species';

export default function Breeding() {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState([]);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [speciesSel, setSpeciesSel] = useState('');
  const [sireSel, setSireSel] = useState('');
  const { species: speciesMaster } = useSpecies();

  useEffect(() => {
    (async () => {
      const [a, f, c] = await Promise.all([
        base44.entities.Animal.list('-created_date', 500),
        base44.entities.Farm.list('-created_date', 100),
        base44.entities.Camp.list('-created_date', 200),
      ]);
      setAnimals(a);
      setFarms(f);
      setCamps(c);
    })();
  }, []);

  const males = animals.filter((a) => (a.is_breeding_male || a.sex === 'Male') && a.status !== 'Deceased' && a.status !== 'Sold');
  const speciesOptions = speciesMaster.map((s) => s.name);
  const siresOfSpecies = males.filter((a) => !speciesSel || a.species === speciesSel);
  const selectedSire = siresOfSpecies.find((s) => s.id === sireSel) || null;
  const offspring = selectedSire ? animals.filter((a) => a.sire_id === selectedSire.id) : [];

  const campName = (cid) => camps.find((c) => c.id === cid)?.name || '—';
  const farmName = (fid) => farms.find((f) => f.id === fid)?.name || '—';

  return (
    <Layout>
      <BrandHeader subtitle="Genetics & breeding view" />
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-stone-900 text-lg">Breeding</h2>
        </div>
        <p className="text-sm text-stone-500 -mt-2">Select a species, then a breeding male to see his tagged offspring and where they are now.</p>

        {/* Step 1: Species */}
        <div>
          <p className="auc-section-label mb-2">1 · Species</p>
          {speciesOptions.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No breeding males recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {speciesOptions.map((sp) => (
                <button key={sp} onClick={() => { setSpeciesSel(sp === speciesSel ? '' : sp); setSireSel(''); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border ${speciesSel === sp ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>
                  {sp}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Sire */}
        {siresOfSpecies.length > 0 && (
          <div>
            <p className="auc-section-label mb-2">2 · Breeding Male</p>
            <div className="space-y-2">
              {siresOfSpecies.map((s) => (
                <button key={s.id} onClick={() => setSireSel(s.id)}
                  className={`w-full text-left rounded-xl border p-3 ${sireSel === s.id ? 'border-stone-900 bg-stone-900 text-stone-50' : 'bg-white border-stone-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold">{s.tag_number}</span>
                      <span className={`text-sm ml-2 ${sireSel === s.id ? 'text-stone-300' : 'text-stone-500'}`}>{s.species}</span>
                    </div>
                    <span className={`text-xs ${sireSel === s.id ? 'text-stone-400' : 'text-stone-500'}`}>{farmName(s.current_farm_id)} → {campName(s.current_camp_id)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Offspring */}
        {selectedSire && (
          <div>
            <p className="auc-section-label mb-2">3 · Tagged Offspring ({offspring.length})</p>
            {offspring.length === 0 ? (
              <p className="text-stone-400 text-sm italic">No tagged offspring recorded for {selectedSire.tag_number}.</p>
            ) : (
              <div className="space-y-2">
                {offspring.map((o) => (
                  <button key={o.id} onClick={() => navigate(`/animal/${o.id}`)} className="w-full text-left auc-record px-3.5 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm">{o.tag_number}</span>
                      <span className="text-stone-500 text-xs ml-2">{o.sex === 'Male' ? '♂' : '♀'} {o.species}</span>
                      {o.status === 'Deceased' && <span className="ml-2 text-[10px] uppercase tracking-wide text-red-500">Deceased</span>}
                    {o.status === 'Sold' && <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-600">Sold</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">{campName(o.current_camp_id)}</span>
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}