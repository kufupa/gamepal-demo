import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import { aggregateCamps } from '@/lib/animalHelpers';

export default function AllAnimalsOverview() {
  const navigate = useNavigate();
  const [farms, setFarms] = useState([]);
  const [allCamps, setAllCamps] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allAnimals, setAllAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [f, c, g, a] = await Promise.all([
        base44.entities.Farm.list('-created_date', 100),
        base44.entities.Camp.list('-created_date', 300),
        base44.entities.Group.list('-created_date', 500),
        base44.entities.Animal.list('-created_date', 500),
      ]);
      setFarms(f); setAllCamps(c); setAllGroups(g); setAllAnimals(a);
      setLoading(false);
    })();
  }, []);

  const farmAgg = (fid) => aggregateCamps(allCamps.filter((c) => c.farm_id === fid), allGroups, allAnimals);
  const allAgg = aggregateCamps(allCamps, allGroups, allAnimals);
  const allFarmsTotal = allAgg.total;
  const speciesTotals = allAgg.bySpecies;
  const allSpecies = Object.keys(speciesTotals).sort();
  const cell = (sp, fid) => farmAgg(fid).bySpecies[sp] || 0;
  const farmTotal = (fid) => farmAgg(fid).total;
  const speciesRowTotal = (sp) => speciesTotals[sp] || 0;

  return (
    <Layout>
      <BrandHeader subtitle="All Animals Overview" />

      <div className="px-4 py-4 space-y-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-stone-500">
          <ArrowLeft className="w-4 h-4" /> Back to Farms
        </button>

        <div className="auc-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-stone-900 text-sm">All Farms Overview</h2>
          </div>

          {loading ? (
            <p className="text-stone-400 text-sm italic">Loading…</p>
          ) : allSpecies.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No animals recorded yet.</p>
          ) : (
            <>
              <div className="flex justify-between text-sm pb-3 mb-1 border-b border-stone-100">
                <span className="font-black text-stone-900">Total Live Animals</span>
                <span className="font-black text-stone-900">{allFarmsTotal}</span>
              </div>

              <p className="auc-section-label mb-1">By Species</p>
              <div className="space-y-1 pb-3 mb-1 border-b border-stone-100">
                {allSpecies.map((sp) => (
                  <div key={sp} className="flex justify-between text-sm">
                    <span className="text-stone-700">{sp}</span>
                    <span className="font-semibold">{speciesRowTotal(sp)}</span>
                  </div>
                ))}
              </div>

              <p className="auc-section-label mb-1">Breakdown per Farm</p>

              {/* Mobile: stacked cards — fully visible without horizontal scroll */}
              <div className="sm:hidden space-y-2">
                {allSpecies.map((sp) => {
                  const farmCounts = farms.map((f) => ({ name: f.name, count: cell(sp, f.id) })).filter((x) => x.count > 0);
                  return (
                    <div key={sp} className="rounded-lg border border-stone-100 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-stone-800 text-sm">{sp}</span>
                        <span className="font-semibold text-sm">{speciesRowTotal(sp)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {farmCounts.length === 0 ? (
                          <span className="text-[11px] text-stone-400">—</span>
                        ) : farmCounts.map((fc) => (
                          <span key={fc.name} className="text-[11px] bg-stone-100 text-stone-600 rounded px-1.5 py-0.5">{fc.name}: {fc.count}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-lg bg-stone-50 border border-stone-100 p-2.5 flex items-center justify-between">
                  <span className="font-black text-stone-900 text-sm">Total Animals</span>
                  <span className="font-black text-stone-900 text-sm">{allFarmsTotal}</span>
                </div>
              </div>

              {/* Desktop: full table */}
              <div className="hidden sm:block overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-stone-500 border-b border-stone-100">
                      <th className="text-left font-bold py-1.5 pr-3">Species</th>
                      {farms.map((f) => (
                        <th key={f.id} className="text-right font-bold py-1.5 px-2 whitespace-nowrap">{f.name}</th>
                      ))}
                      <th className="text-right font-bold py-1.5 pl-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSpecies.map((sp) => (
                      <tr key={sp} className="border-b border-stone-50">
                        <td className="py-2 pr-3 font-medium text-stone-800">{sp}</td>
                        {farms.map((f) => (
                          <td key={f.id} className="text-right py-2 px-2 text-stone-600">{cell(sp, f.id) || '—'}</td>
                        ))}
                        <td className="text-right py-2 pl-2 font-semibold">{speciesRowTotal(sp)}</td>
                      </tr>
                    ))}
                    <tr className="bg-stone-50">
                      <td className="py-2 pr-3 font-black text-stone-900">Total Animals</td>
                      {farms.map((f) => (
                        <td key={f.id} className="text-right py-2 px-2 font-bold text-stone-700">{farmTotal(f.id) || '—'}</td>
                      ))}
                      <td className="text-right py-2 pl-2 font-black text-stone-900">{allFarmsTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}