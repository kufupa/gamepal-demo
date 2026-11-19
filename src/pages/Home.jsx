import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, MapPin, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, Pencil, Trash2, Trees, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import CampCard from '@/components/CampCard';
import { useUserRole } from '@/lib/useUserRole';
import { financeBy } from '@/lib/finance';
import { campTotalAnimals, aggregateCamps } from '@/lib/animalHelpers';
import FarmSnapshot from '@/components/FarmSnapshot';
import RecentActivity from '@/components/RecentActivity';
import PlannedMovementsSection from '@/components/PlannedMovementsSection';

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, canViewFinance } = useUserRole();
  const [farms, setFarms] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allCamps, setAllCamps] = useState([]);
  const [allAnimals, setAllAnimals] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingFarm, setAddingFarm] = useState(false);
  const [farmName, setFarmName] = useState({ name: '', location: '', size_hectares: '' });
  const [editingFarm, setEditingFarm] = useState(null);
  const [showAnimals, setShowAnimals] = useState(false);
  const [showCamps, setShowCamps] = useState(false);
  const [movements, setMovements] = useState([]);
  const [sales, setSales] = useState([]);
  const [mortalities, setMortalities] = useState([]);
  const [plannedMovements, setPlannedMovements] = useState([]);
  const [campSearch, setCampSearch] = useState('');
  const [showActivity, setShowActivity] = useState(false);
  const [showPlanned, setShowPlanned] = useState(false);
  const [saleFinance, setSaleFinance] = useState({});
  const persistCampOrderRef = useRef(null);
  const persistFarmOrderRef = useRef(null);

  const reloadAll = async () => {
    const [f, g, c, a, mv, sl, mo, pm] = await Promise.all([
      base44.entities.Farm.list('-created_date', 100),
      base44.entities.Group.list('-created_date', 500),
      base44.entities.Camp.list('-created_date', 300),
      base44.entities.Animal.list('-created_date', 500),
      base44.entities.Movement.list('-date', 200),
      base44.entities.Sale.list('-date', 200),
      base44.entities.Mortality.list('-date', 200),
      base44.entities.PlannedMovement.list('-created_date', 300),
    ]);
    // One-time migration: assign sort_order to legacy farms/camps so they can be reordered.
    if (f.some((x) => x.sort_order == null)) {
      await Promise.all(f.map((x, i) => base44.entities.Farm.update(x.id, { sort_order: i })));
      f.forEach((x, i) => (x.sort_order = i));
    }
    if (c.some((x) => x.sort_order == null)) {
      const byFarm = {};
      c.forEach((x) => (byFarm[x.farm_id] ??= []).push(x));
      const ups = [];
      Object.values(byFarm).forEach((arr) => arr.forEach((x, i) => ups.push(base44.entities.Camp.update(x.id, { sort_order: i }))));
      await Promise.all(ups);
      c.forEach((x) => (x.sort_order = byFarm[x.farm_id].indexOf(x)));
    }
    setFarms(f); setAllGroups(g); setAllCamps(c); setAllAnimals(a);
    setMovements(mv.filter((m) => !m.deleted)); setSales(sl.filter((s) => !s.deleted)); setMortalities(mo.filter((m) => !m.deleted));
    setPlannedMovements(pm.filter((p) => p.status === 'Planned'));
    if (canViewFinance) {
      const sf = await base44.entities.SaleFinance.list('-created_date', 1000);
      setSaleFinance(financeBy(sf, 'sale_id'));
    }
    setLoading(false);
  };

  useEffect(() => {
    const fid = new URLSearchParams(location.search).get('farm');
    if (fid) setSelectedFarmId(fid);
    reloadAll();
  }, [location.search]);

  useEffect(() => {
    const reset = () => setSelectedFarmId('');
    window.addEventListener('aucamp-reset-home', reset);
    return () => window.removeEventListener('aucamp-reset-home', reset);
  }, []);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);
  const sortedFarms = [...farms].sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));
  const farmCamps = selectedFarmId ? allCamps.filter((c) => c.farm_id === selectedFarmId).sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER)) : [];

  const createFarm = async () => {
    if (!farmName.name) return;
    await base44.entities.Farm.create({ name: farmName.name, location: farmName.location, size_hectares: farmName.size_hectares === '' ? null : Number(farmName.size_hectares), sort_order: sortedFarms.length });
    setFarmName({ name: '', location: '', size_hectares: '' });
    setAddingFarm(false);
    reloadAll();
  };
  const saveFarm = async () => {
    await base44.entities.Farm.update(editingFarm.id, { name: editingFarm.name, location: editingFarm.location, notes: editingFarm.notes || '', size_hectares: editingFarm.size_hectares === '' || editingFarm.size_hectares == null ? null : Number(editingFarm.size_hectares) });
    setEditingFarm(null);
    reloadAll();
  };
  const deleteFarm = async (f) => {
    if (!confirm(`Delete ${f.name} and all its camps? This cannot be undone.`)) return;
    await base44.entities.Camp.deleteMany({ farm_id: f.id });
    await base44.entities.Group.deleteMany({ farm_id: f.id });
    if (selectedFarmId === f.id) setSelectedFarmId('');
    reloadAll();
  };
  const addCamp = async () => {
    const name = prompt('Camp name');
    if (!name) return;
    await base44.entities.Camp.create({ farm_id: selectedFarmId, name, sort_order: farmCamps.length });
    reloadAll();
  };

  const moveFarm = (farm, dir) => {
    const ordered = [...sortedFarms];
    const i = ordered.findIndex((x) => x.id === farm.id);
    const j = i + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    const orderMap = {};
    ordered.forEach((x, idx) => (orderMap[x.id] = idx));
    setFarms((prev) => prev.map((f) => (orderMap[f.id] != null ? { ...f, sort_order: orderMap[f.id] } : f)));
    if (persistFarmOrderRef.current) clearTimeout(persistFarmOrderRef.current);
    persistFarmOrderRef.current = setTimeout(() => {
      Promise.all(ordered.map((x, idx) => base44.entities.Farm.update(x.id, { sort_order: idx })))
        .catch(() => {})
        .finally(() => { persistFarmOrderRef.current = null; });
    }, 300);
  };

  const moveCamp = (camp, dir) => {
    const ordered = [...farmCamps];
    const i = ordered.findIndex((x) => x.id === camp.id);
    const j = i + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    const orderMap = {};
    ordered.forEach((x, idx) => (orderMap[x.id] = idx));
    setAllCamps((prev) => prev.map((c) => (orderMap[c.id] != null ? { ...c, sort_order: orderMap[c.id] } : c)));
    if (persistCampOrderRef.current) clearTimeout(persistCampOrderRef.current);
    persistCampOrderRef.current = setTimeout(() => {
      Promise.all(ordered.map((x, idx) => base44.entities.Camp.update(x.id, { sort_order: idx })))
        .catch(() => {})
        .finally(() => { persistCampOrderRef.current = null; });
    }, 300);
  };

  const farmTotal = (fid) => aggregateCamps(allCamps.filter((c) => c.farm_id === fid), allGroups, allAnimals).total;

  const farmAggregate = aggregateCamps(farmCamps, allGroups, allAnimals);
  const farmSpeciesTotals = farmAggregate.bySpecies;
  const farmGrandTotal = farmAggregate.total;

  const visibleCamps = campSearch.trim()
    ? farmCamps.filter((c) => (c.name || '').toLowerCase().includes(campSearch.trim().toLowerCase()))
    : farmCamps;

  return (
    <Layout>
      <BrandHeader subtitle={selectedFarm ? selectedFarm.name : 'All Farms Overview'} />

      <div className="px-4 py-4 space-y-3">
        {!selectedFarm ? (
          <>
            <button
              onClick={() => navigate('/all-animals-overview')}
              className="w-full flex items-center justify-between auc-card px-4 py-3.5 hover:border-stone-300 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                <BarChart3 className="w-4 h-4 text-amber-500" /> All Animals Overview
              </span>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900 flex items-center gap-1.5"><Trees className="w-4 h-4 text-amber-500" /> Farms</h2>
              {isAdmin && (
                <button onClick={() => setAddingFarm(true)} className="flex items-center gap-1 text-sm font-medium text-stone-900">
                  <Plus className="w-4 h-4" /> Add Farm
                </button>
              )}
            </div>

            {addingFarm && (
              <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-2">
                <input value={farmName.name} onChange={(e) => setFarmName((f) => ({ ...f, name: e.target.value }))} placeholder="Farm name" className="auc-input" />
                <input value={farmName.location} onChange={(e) => setFarmName((f) => ({ ...f, location: e.target.value }))} placeholder="Location (optional)" className="auc-input" />
                <input type="number" step="0.1" min="0" value={farmName.size_hectares} onChange={(e) => setFarmName((f) => ({ ...f, size_hectares: e.target.value }))} placeholder="Size (hectares, optional)" className="auc-input" />
                <div className="flex gap-2">
                  <button onClick={createFarm} className="flex-1 bg-stone-900 text-stone-50 text-sm py-2 rounded-md">Create Farm</button>
                  <button onClick={() => setAddingFarm(false)} className="px-3 border border-stone-200 text-sm py-2 rounded-md">Cancel</button>
                </div>
              </div>
            )}

            {farms.length === 0 && !addingFarm && (
              <div className="auc-empty">
                <Trees className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No farms yet. Add your first farm to begin.</p>
              </div>
            )}

            {sortedFarms.map((f, idx) => (
              <div key={f.id} className="auc-card overflow-hidden">
                <button onClick={() => setSelectedFarmId(f.id)} className="w-full text-left flex items-center justify-between px-4 py-4">
                  <div>
                    <p className="font-bold text-stone-900">{f.name}</p>
                    {f.location && <p className="text-xs text-stone-500 mt-0.5">{f.location}</p>}
                    {f.size_hectares != null && <p className="text-xs text-stone-500 mt-0.5">{Number(f.size_hectares).toLocaleString()} ha</p>}
                    <p className="text-xs text-stone-500 mt-0.5">{farmTotal(f.id)} animals</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400" />
                </button>
                {isAdmin && (
                  <div className="flex border-t border-stone-100 text-xs">
                    <button onClick={() => moveFarm(f, -1)} disabled={idx === 0} className="flex-1 py-2 text-stone-500 flex items-center justify-center gap-1 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveFarm(f, 1)} disabled={idx === sortedFarms.length - 1} className="flex-1 py-2 text-stone-500 flex items-center justify-center gap-1 border-l border-stone-100 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingFarm({ ...f })} className="flex-1 py-2 text-stone-500 flex items-center justify-center gap-1 border-l border-stone-100"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                    <button onClick={() => deleteFarm(f)} className="flex-1 py-2 text-red-500 flex items-center justify-center gap-1 border-l border-stone-100"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  </div>
                )}
              </div>
            ))}

            {editingFarm && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center pb-14" onClick={() => setEditingFarm(null)}>
                <div className="auc-sheet" onClick={(e) => e.stopPropagation()}>
                  <h3 className="font-bold mb-1">Edit Farm</h3>
                  <input value={editingFarm.name || ''} onChange={(e) => setEditingFarm((f) => ({ ...f, name: e.target.value }))} placeholder="Farm name" className="auc-input" />
                  <input value={editingFarm.location || ''} onChange={(e) => setEditingFarm((f) => ({ ...f, location: e.target.value }))} placeholder="Location" className="auc-input" />
                <input type="number" step="0.1" min="0" value={editingFarm.size_hectares ?? ''} onChange={(e) => setEditingFarm((f) => ({ ...f, size_hectares: e.target.value }))} placeholder="Size (hectares, optional)" className="auc-input" />
                  <textarea value={editingFarm.notes || ''} onChange={(e) => setEditingFarm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" rows={2} />
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveFarm} className="flex-1 bg-stone-900 text-stone-50 text-sm py-2 rounded-md">Save</button>
                    <button onClick={() => setEditingFarm(null)} className="px-4 border border-stone-200 text-sm py-2 rounded-md">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setSelectedFarmId('')} className="flex items-center gap-1 text-sm text-stone-500 mb-1">
              <ArrowLeft className="w-4 h-4" /> All farms
            </button>

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900 text-lg">{selectedFarm.name}</h2>
              {isAdmin && (
                <button onClick={addCamp} className="flex items-center gap-1 text-sm font-medium text-stone-900">
                  <Plus className="w-4 h-4" /> Add Camp
                </button>
              )}
            </div>
            {selectedFarm.location && <p className="text-xs text-stone-500 -mt-1">{selectedFarm.location}</p>}

            <FarmSnapshot sizeHa={selectedFarm.size_hectares} totalAnimals={farmGrandTotal} totalSpecies={Object.keys(farmSpeciesTotals).length} totalCamps={farmCamps.length} />

            {/* Animal Overview — collapsible, info only, auto-calculated from camp populations */}
            <div className="auc-card overflow-hidden">
              <button onClick={() => setShowAnimals((v) => !v)} className="w-full flex items-center justify-between px-4 py-3.5">
                <span className="font-bold text-stone-900 text-sm">Animal Overview</span>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${showAnimals ? 'rotate-180' : ''}`} />
              </button>
              {showAnimals && (
                <div className="px-4 pb-4 border-t border-stone-100 pt-3">
                  {Object.keys(farmSpeciesTotals).length === 0 ? (
                    <p className="text-stone-400 text-sm italic">No animals recorded yet.</p>
                  ) : (
                    <>
                      <div className="space-y-1">
                        {Object.entries(farmSpeciesTotals).sort((a, b) => b[1] - a[1]).map(([sp, n]) => (
                          <div key={sp} className="flex justify-between text-sm">
                            <span className="text-stone-700">{sp}</span>
                            <span className="font-semibold">{n}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-sm pt-2 mt-2 border-t border-stone-100">
                        <span className="font-black text-stone-900">Total Animals</span>
                        <span className="font-black text-stone-900">{farmGrandTotal}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Camp Overview — collapsible */}
            <div className="auc-card overflow-hidden">
              <button onClick={() => setShowCamps((v) => !v)} className="w-full flex items-center justify-between px-4 py-3.5">
                <span className="font-bold text-stone-900 text-sm">Camp Overview</span>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${showCamps ? 'rotate-180' : ''}`} />
              </button>
              {showCamps && (
                <div className="px-4 pb-4 pt-1 space-y-3">
                  {loading ? (
                    <div className="py-8 text-center text-stone-400 text-sm">Loading camps…</div>
                  ) : farmCamps.length === 0 ? (
                    <div className="text-center py-10 text-stone-400">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No camps yet.{isAdmin ? ' Add a camp to start recording animals.' : ''}</p>
                    </div>
                  ) : (
                    <>
                      <input value={campSearch} onChange={(e) => setCampSearch(e.target.value)} placeholder="Search camps…" className="w-full h-9 rounded-md border border-stone-200 px-3 text-sm" />
                      {visibleCamps.length === 0 ? (
                        <p className="text-stone-400 text-sm italic py-6 text-center">No camps match "{campSearch}".</p>
                      ) : (
                        <div className="space-y-3">
                          {visibleCamps.map((c) => {
                            const cg = allGroups.filter((g) => g.camp_id === c.id);
                            const ca = allAnimals.filter((a) => a.current_camp_id === c.id);
                            const cIdx = farmCamps.findIndex((x) => x.id === c.id);
                            return <CampCard key={c.id} camp={c} groups={cg} animals={ca} total={campTotalAnimals(cg, ca)} isAdmin={isAdmin} isFirst={cIdx === 0} isLast={cIdx === farmCamps.length - 1} onUp={() => moveCamp(c, -1)} onDown={() => moveCamp(c, 1)} />;
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {plannedMovements.filter((p) => p.from_farm_id === selectedFarmId).length > 0 && (
              <div className="auc-card overflow-hidden">
                <button onClick={() => setShowPlanned((v) => !v)} className="w-full flex items-center justify-between px-4 py-3.5">
                  <span className="font-bold text-stone-900 text-sm">Planned Movements</span>
                  <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${showPlanned ? 'rotate-180' : ''}`} />
                </button>
                {showPlanned && (
                  <div className="px-4 pb-4 pt-1">
                    <PlannedMovementsSection plans={plannedMovements.filter((p) => p.from_farm_id === selectedFarmId)} mode="farm" farms={farms} camps={allCamps} navigate={navigate} />
                  </div>
                )}
              </div>
            )}

            <RecentActivity open={showActivity} onToggle={() => setShowActivity((v) => !v)} movements={movements} sales={sales} mortalities={mortalities} farmId={selectedFarmId} camps={allCamps} navigate={navigate} saleFinance={saleFinance} canViewFinance={canViewFinance} />
          </>
        )}
      </div>
    </Layout>
  );
}