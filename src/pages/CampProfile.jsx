import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ArrowLeftRight, MapPin, Pencil, Trash2, Repeat, Tag } from 'lucide-react';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import AddGroupDialog from '@/components/AddGroupDialog';
import AddAnimalDialog from '@/components/AddAnimalDialog';
import AddOffspringDialog from '@/components/AddOffspringDialog';
import MoveAnimalsDialog from '@/components/MoveAnimalsDialog';
import EditCampDialog from '@/components/EditCampDialog';
import EditGroupDialog from '@/components/EditGroupDialog';
import ReclassifyDialog from '@/components/ReclassifyDialog';
import ConvertToIndividualsDialog from '@/components/ConvertToIndividualsDialog';
import PlannedMovementsSection from '@/components/PlannedMovementsSection';
import CampSalesHistory from '@/components/CampSalesHistory';
import CampMortalityHistory from '@/components/CampMortalityHistory';
import AnimalAccordion from '@/components/AnimalAccordion';
import { financeBy } from '@/lib/finance';
import { campTotalAnimals, campBreakdown, breedsList } from '@/lib/animalHelpers';
import TaggedAnimalsSection from '@/components/TaggedAnimalsSection';
import { useUserRole } from '@/lib/useUserRole';
import { sortByEventDateDesc } from '@/lib/sortHelpers';

export default function CampProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canViewFinance } = useUserRole();
  const [camp, setCamp] = useState(null);
  const [farm, setFarm] = useState(null);
  const [groups, setGroups] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [movements, setMovements] = useState([]);
  const [movementEvents, setMovementEvents] = useState([]);
  const [plannedMovements, setPlannedMovements] = useState([]);
  const [sales, setSales] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [saleFin, setSaleFin] = useState({});
  const [auctionFin, setAuctionFin] = useState({});
  const [hunts, setHunts] = useState([]);
  const [mortalities, setMortalities] = useState([]);
  const [allCamps, setAllCamps] = useState([]);
  const [allAnimals, setAllAnimals] = useState([]);
  const [allFarms, setAllFarms] = useState([]);
  const [allCampsAll, setAllCampsAll] = useState([]);
  const [dlg, setDlg] = useState(null);
  const [editCamp, setEditCamp] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [reclassify, setReclassify] = useState(false);
  const [convertGroup, setConvertGroup] = useState(null);
  const [movePreselect, setMovePreselect] = useState([]);

  const load = async () => {
    const c = await base44.entities.Camp.get(id);
    setCamp(c);
    // Wave 1 — core data needed to render the camp profile
    const [farms, allCampsAll, allAnimals, campGroups] = await Promise.all([
      base44.entities.Farm.list('-created_date', 100),
      base44.entities.Camp.list('-created_date', 300),
      base44.entities.Animal.list('-created_date', 300),
      base44.entities.Group.filter({ camp_id: id }, '-created_date', 200),
    ]);
    setFarm(farms.find((x) => x.id === c.farm_id));
    setGroups(campGroups);
    setAnimals(allAnimals.filter((a) => a.current_camp_id === id));
    setAllCamps(allCampsAll.filter((c2) => c2.farm_id === c.farm_id));
    setAllFarms(farms);
    setAllCampsAll(allCampsAll);
    setAllAnimals(allAnimals);
    // Wave 2 — below-the-fold history, fetched after core renders to stay under the API rate limit
    const [mv, sl, ae, he, pm, me, mo] = await Promise.all([
      base44.entities.Movement.list('-date', 200),
      base44.entities.Sale.list('-date', 500),
      base44.entities.AuctionEvent.list('-created_date', 300),
      base44.entities.HuntEvent.list('-created_date', 300),
      base44.entities.PlannedMovement.list('-created_date', 300),
      base44.entities.MovementEvent.list('-created_date', 200),
      base44.entities.Mortality.filter({ camp_id: id }, '-date', 500),
    ]);
    setMovementEvents(me.filter((e) => !e.deleted));
    setMortalities(sortByEventDateDesc(mo.filter((m) => !m.deleted)));
    setMovements(sortByEventDateDesc(mv.filter((m) => !m.deleted && (m.from_camp_id === id || m.to_camp_id === id))));
    setSales(sortByEventDateDesc(sl.filter((s) => !s.deleted && s.camp_id === id)));
    setAuctions(ae.filter((a) => !a.deleted && (a.line_items || []).some((li) => li.camp_id === id)));
    setHunts(he.filter((h) => !h.deleted && (h.line_items || []).some((li) => li.camp_id === id)));
    setPlannedMovements(pm.filter((p) => p.status === 'Planned' && (p.from_camp_id === id || (p.destination_type === 'camp' && p.to_camp_id === id))));
    if (canViewFinance) {
      const [sf, af] = await Promise.all([
        base44.entities.SaleFinance.list('-created_date', 1000),
        base44.entities.AuctionFinance.list('-created_date', 1000),
      ]);
      setSaleFin(financeBy(sf, 'sale_id'));
      setAuctionFin(financeBy(af, 'auction_id'));
    }
  };

  useEffect(() => { load(); }, [id]);

  if (!camp) return <Layout><BrandHeader /><div className="py-16 text-center text-stone-400 text-sm">Loading camp…</div></Layout>;

  const sires = allAnimals.filter((a) => a.sex === 'Male' && a.status !== 'Deceased');
  const dams = allAnimals.filter((a) => a.sex === 'Female' && a.status !== 'Deceased');

  // group by species
  const speciesMap = {};
  for (const g of groups) {
    if (!speciesMap[g.species]) speciesMap[g.species] = { groups: [], animals: [] };
    speciesMap[g.species].groups.push(g);
  }
  for (const a of animals) {
    if (a.is_breeding_male) {
      // a breeding male may breed with multiple species groups — show him
      // under each, but he is still one individual (counted once in the total)
      const breeds = breedsList(a);
      const keys = breeds.length ? breeds : [a.species];
      for (const k of keys) {
        if (!speciesMap[k]) speciesMap[k] = { groups: [], animals: [] };
        speciesMap[k].animals.push(a);
      }
    } else {
      if (!speciesMap[a.species]) speciesMap[a.species] = { groups: [], animals: [] };
      speciesMap[a.species].animals.push(a);
    }
  }

  // Display only: a species card total is that species' positive bulk
  // quantities plus its live tagged animals — the same rule as the camp total.
  const speciesTotals = campBreakdown(groups, animals).bySpecies;

  const campMovements = movements;

  // Hunts whose line items include at least one from this camp, newest hunt date first.
  const campHunts = [...hunts].sort((a, b) => {
    const ad = a.end_date || a.start_date || '';
    const bd = b.end_date || b.start_date || '';
    return bd.localeCompare(ad) || (b.created_date || '').localeCompare(a.created_date || '');
  });
  const fmtHuntDate = (start, end) => {
    if (!start) return '—';
    const s = moment(start);
    if (!end) return s.format('D MMM YYYY');
    const e = moment(end);
    if (s.isSame(e, 'month') && s.isSame(e, 'year')) return `${s.format('D')}–${e.format('D MMM YYYY')}`;
    return `${s.format('D MMM YYYY')} – ${e.format('D MMM YYYY')}`;
  };

  const deleteGroup = async (g) => {
    const [morts, sales] = await Promise.all([
      base44.entities.Mortality.filter({ group_id: g.id }),
      base44.entities.Sale.filter({ group_id: g.id }),
    ]);
    if (morts.length > 0 || sales.length > 0) {
      alert(`Cannot delete this group: it has ${morts.length} mortality and ${sales.length} sale record(s) linked to it. These historical records are protected. Edit the quantity instead to correct it.`);
      return;
    }
    if (!confirm('Are you sure you want to delete this group? Tagged animals are not affected — they are always counted on their own.')) return;
    await base44.entities.Group.delete(g.id);
    load();
  };

  return (
    <Layout>
      <BrandHeader subtitle={`${farm?.name} · ${camp.name}`} />
      <div className="px-4 py-4 space-y-5">
        <button onClick={() => navigate(`/?farm=${camp.farm_id}`)} className="flex items-center gap-1 text-sm text-stone-500">
          <ArrowLeft className="w-4 h-4" /> Back to camps
        </button>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-stone-900 text-lg leading-tight">{camp.name}</h2>
              <span className="text-xs font-semibold text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">Total: {campTotalAnimals(groups, animals)}</span>
              {camp.size_hectares != null && <span className="text-xs text-stone-400">{camp.size_hectares} ha</span>}
            </div>
            <p className="text-xs text-stone-500">{farm?.name}</p>
          </div>
          {isAdmin && (
            <button onClick={() => setEditCamp(true)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"><Pencil className="w-4 h-4" /></button>
          )}
        </div>

        {/* Action buttons */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn label="Add Group" onClick={() => setDlg('group')} />
            <ActionBtn label="Add Individual" onClick={() => setDlg('animal')} />
            <ActionBtn label="Add Offspring" onClick={() => setDlg('offspring')} />
            <ActionBtn label="Move Animals" onClick={() => setDlg('move')} dark />
          </div>
        )}
        {isAdmin && (
          <button onClick={() => setReclassify(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border bg-white text-stone-700 border-stone-200 hover:bg-stone-50">
            <Repeat className="w-4 h-4" /> Reclassify Offspring
          </button>
        )}

        {/* Species sections */}
        {Object.keys(speciesMap).length === 0 && (
          <p className="text-stone-400 text-sm italic text-center py-8">No animals recorded in this camp yet.</p>
        )}
        {Object.entries(speciesMap).map(([sp, data]) => {
          const live = data.animals.filter((a) => a.status !== 'Deceased');
          const breedingMales = live.filter((a) => a.is_breeding_male);
          const taggedLive = live.filter((a) => !a.is_breeding_male);
          // Display only: zero-quantity bulk rows stay in the data (and in every
          // total) but are hidden from the camp profile for a cleaner scan.
          const visibleGroups = data.groups.filter((g) => (Number(g.quantity) || 0) > 0);
          if (visibleGroups.length === 0 && breedingMales.length === 0 && taggedLive.length === 0) return null;
          return (
            <div key={sp} className="auc-card p-4 space-y-3">
              <h3 className="text-sm font-black tracking-[0.12em] text-stone-900 uppercase border-b border-stone-100 pb-2">
                {sp} <span className="text-stone-400">— {speciesTotals[sp] || 0}</span>
              </h3>
              <div className="space-y-1">
                {visibleGroups.map((g) => (
                  <div key={g.id} className="flex justify-between items-center text-sm group">
                    <span className="text-stone-600">{g.animal_class}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{g.quantity}</span>
                      {isAdmin && (
                        <span className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setConvertGroup(g)} title="Tag / Convert to individuals" className="text-stone-400 hover:text-amber-600 p-0.5"><Tag className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditGroup(g)} className="text-stone-400 hover:text-stone-900 p-0.5"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteGroup(g)} className="text-stone-400 hover:text-red-500 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {breedingMales.length > 0 && (
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-[11px] font-bold tracking-wide text-stone-500 uppercase mb-1">Breeding Male</p>
                  {breedingMales.map((m) => (
                    <button key={m.id} onClick={() => navigate(`/animal/${m.id}`)} className="block text-sm text-left">
                      <span className="text-amber-600 font-bold">♂</span>{' '}
                      <span className="font-semibold underline decoration-stone-300">{m.tag_number}</span>
                    </button>
                  ))}
                </div>
              )}
              <TaggedAnimalsSection animals={taggedLive} allAnimals={allAnimals} />
            </div>
          );
        })}

        <AnimalAccordion title="Planned Movements" count={plannedMovements.length}>
          <PlannedMovementsSection plans={plannedMovements} mode="camp" campId={id} farms={allFarms} camps={allCampsAll} navigate={navigate} />
        </AnimalAccordion>

        <AnimalAccordion title="Movement History" count={campMovements.length}>
          {campMovements.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No movements recorded</p>
          ) : (
            <div className="space-y-2">
              {campMovements.map((m) => {
                const out = m.from_camp_id === id;
                const ev = m.movement_event_id ? movementEvents.find((e) => e.id === m.movement_event_id) : null;
                return (
                  <button key={m.id} type="button" onClick={() => navigate(`/movement/${m.id}?from=/camp/${id}`)} className="w-full text-left bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm hover:bg-stone-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${out ? 'text-red-600' : 'text-green-700'}`}>{out ? 'Out →' : 'In ←'}</span>
                      <span className="text-xs text-stone-400">{m.date}</span>
                    </div>
                    <p className="text-stone-600 text-xs mt-0.5">
                      {m.type === 'bulk'
                        ? `${m.quantity} ${m.species} ${m.animal_class}`
                        : `${m.animal_tags?.join(', ') || 'animals'}`}
                      {' · '}
                      {out
                        ? (m.destination_type === 'manual'
                          ? `to ${m.destination_text || 'External'}`
                          : `to ${allFarms.find((f) => f.id === m.to_farm_id)?.name || '?'} → ${allCampsAll.find((c) => c.id === m.to_camp_id)?.name || '?'}`)
                        : `from ${allFarms.find((f) => f.id === m.from_farm_id)?.name || '?'} → ${allCampsAll.find((c) => c.id === m.from_camp_id)?.name || '?'}`}
                    </p>
                    {ev && (
                      <p className="text-[10px] italic text-stone-400 mt-0.5">Part of {ev.name || `Capture Event — ${ev.date}`}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </AnimalAccordion>

        <AnimalAccordion title="Sales History" count={sales.length + auctions.length}>
          <CampSalesHistory sales={sales} auctions={auctions} campId={id} navigate={navigate} saleFinance={saleFin} auctionFinance={auctionFin} canViewFinance={canViewFinance} />
        </AnimalAccordion>

        <AnimalAccordion title="Hunting History" count={campHunts.length}>
          {campHunts.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No hunts recorded from this camp</p>
          ) : (
            <div className="space-y-2">
              {campHunts.map((h) => (
                <button key={h.id} type="button" onClick={() => navigate(`/hunt/${h.id}?from=/camp/${id}`)} className="w-full text-left bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm hover:bg-stone-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-900 uppercase tracking-wide">{h.name}</span>
                    <span className="text-xs text-stone-500">{h.total_animals || 0} animals</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-stone-500">{fmtHuntDate(h.start_date, h.end_date)}</span>
                    <span className="text-stone-800 font-semibold text-xs">R {Number(h.total_revenue || 0).toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </AnimalAccordion>

        <AnimalAccordion title="Mortality History" count={mortalities.length}>
          <CampMortalityHistory mortalities={mortalities} campId={id} navigate={navigate} />
        </AnimalAccordion>
      </div>

      {dlg === 'group' && <AddGroupDialog open onOpenChange={(v) => !v && setDlg(null)} camp={camp} farm={farm} onDone={load} />}
      {dlg === 'animal' && <AddAnimalDialog open onOpenChange={(v) => !v && setDlg(null)} camp={camp} farm={farm} sires={sires} dams={dams} onDone={load} />}
      {dlg === 'offspring' && <AddOffspringDialog open onOpenChange={(v) => !v && setDlg(null)} camp={camp} farm={farm} sires={sires} dams={dams} onDone={load} />}
      {dlg === 'move' && <MoveAnimalsDialog open onOpenChange={(v) => { if (!v) { setDlg(null); setMovePreselect([]); } }} camp={camp} farm={farm} allCamps={allCamps} campGroups={groups} campAnimals={animals} onDone={load} preselectedIds={movePreselect} />}
      {editCamp && <EditCampDialog open onOpenChange={(v) => !v && setEditCamp(false)} camp={camp} onDone={load} />}
      {editGroup && <EditGroupDialog open onOpenChange={(v) => !v && setEditGroup(null)} group={editGroup} onDone={load} />}
      {reclassify && <ReclassifyDialog open onOpenChange={(v) => !v && setReclassify(false)} camp={camp} onDone={load} />}
      {convertGroup && <ConvertToIndividualsDialog open onOpenChange={(v) => !v && setConvertGroup(null)} group={convertGroup} camp={camp} sires={sires} onDone={load} onMoveNew={(ids) => { setMovePreselect(ids); setDlg('move'); }} />}
    </Layout>
  );
}

function ActionBtn({ label, onClick, dark }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border ${dark ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-700 border-stone-200'}`}>
      <Plus className="w-4 h-4" /> {label}
    </button>
  );
}