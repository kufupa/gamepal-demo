import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Pencil, Trash2, Filter, Crosshair, Gavel, CalendarClock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { sortByEventDateDesc, sortByPlannedDateAsc } from '@/lib/sortHelpers';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import RecordSaleDialog from '@/components/RecordSaleDialog';
import EditSaleDialog from '@/components/EditSaleDialog';
import HuntCard from '@/components/HuntCard';
import HuntFormDialog from '@/components/HuntFormDialog';
import AuctionCard from '@/components/AuctionCard';
import AuctionFormDialog from '@/components/AuctionFormDialog';
import PlannedSaleCard from '@/components/PlannedSaleCard';
import AddPlannedSaleDialog from '@/components/AddPlannedSaleDialog';
import { useUserRole } from '@/lib/useUserRole';
import { financeBy } from '@/lib/finance';

const TABS = [
  { id: 'live', label: 'Live Sales' },
  { id: 'hunting', label: 'Hunting' },
  { id: 'planned', label: 'Planned Sales' },
  { id: 'all', label: 'All' },
];

export default function Sales() {
  const { isAdmin, canViewFinance } = useUserRole();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [hunts, setHunts] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [tab, setTab] = useState('live');
  const [recording, setRecording] = useState(false);
  const [recordingHunt, setRecordingHunt] = useState(false);
  const [recordingAuction, setRecordingAuction] = useState(false);
  const [plannedSales, setPlannedSales] = useState([]);
  const [addingPlannedSale, setAddingPlannedSale] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [f, setF] = useState({ farm_id: '', species: '', sale_type: '', from: '', to: '' });
  const [saleFin, setSaleFin] = useState({});
  const [huntFin, setHuntFin] = useState({});
  const [auctionFin, setAuctionFin] = useState({});
  const [plannedFin, setPlannedFin] = useState({});

  const load = async () => {
    const [sl, hu, au, ps] = await Promise.all([
      base44.entities.Sale.list('-date', 500),
      base44.entities.HuntEvent.list('-created_date', 300),
      base44.entities.AuctionEvent.list('-created_date', 300),
      base44.entities.PlannedSale.list('-created_date', 300),
    ]);
    setSales(sortByEventDateDesc(sl.filter((s) => !s.deleted)));
    setHunts(sortByEventDateDesc(hu.filter((h) => !h.deleted).map((h) => ({ ...h, date: h.end_date || h.start_date || '' }))));
    setAuctions(au.filter((a) => !a.deleted));
    setPlannedSales(ps.filter((p) => p.status === 'Planned'));
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setCamps(await base44.entities.Camp.list('-created_date', 200));
    setAnimals(await base44.entities.Animal.list('-created_date', 500));
    if (canViewFinance) {
      const [sf, hf, af, pf] = await Promise.all([
        base44.entities.SaleFinance.list('-created_date', 1000),
        base44.entities.HuntFinance.list('-created_date', 1000),
        base44.entities.AuctionFinance.list('-created_date', 1000),
        base44.entities.PlannedSaleFinance.list('-created_date', 1000),
      ]);
      setSaleFin(financeBy(sf, 'sale_id'));
      setHuntFin(financeBy(hf, 'hunt_id'));
      setAuctionFin(financeBy(af, 'auction_id'));
      setPlannedFin(financeBy(pf, 'planned_sale_id'));
    }
  };
  useEffect(() => { load(); }, []);

  const farmName = (id) => farms.find((x) => x.id === id)?.name || '—';
  const campName = (id) => camps.find((x) => x.id === id)?.name || '—';
  const filteredSales = useMemo(() => sales.filter((s) => {
    if (f.farm_id && s.farm_id !== f.farm_id) return false;
    if (f.species && s.species !== f.species) return false;
    if (f.sale_type && s.sale_type !== f.sale_type) return false;
    if (f.from && (s.date || '') < f.from) return false;
    if (f.to && (s.date || '') > f.to) return false;
    return true;
  }), [sales, f]);

  const filteredHunts = useMemo(() => hunts.filter((h) => {
    if (f.farm_id && h.farm_id !== f.farm_id) return false;
    if (f.species && !(h.line_items || []).some((li) => li.species === f.species)) return false;
    const hd = h.end_date || h.start_date || '';
    if (f.from && hd < f.from) return false;
    if (f.to && hd > f.to) return false;
    return true;
  }), [hunts, f]);

  const filteredAuctions = useMemo(() => auctions.filter((a) => {
    if (f.farm_id && a.farm_id !== f.farm_id) return false;
    if (f.species && !(a.line_items || []).some((li) => li.species === f.species)) return false;
    // Auctions are inherently "Auction" type — only show when the Sale Type
    // filter is unset or explicitly set to Auction.
    if (f.sale_type && f.sale_type !== 'Auction') return false;
    const ad = a.auction_date || '';
    if (f.from && ad < f.from) return false;
    if (f.to && ad > f.to) return false;
    return true;
  }), [auctions, f]);

  const filteredPlannedSales = useMemo(() => sortByPlannedDateAsc(plannedSales.filter((p) => {
    if (f.farm_id && p.farm_id !== f.farm_id) return false;
    if (f.species && p.species !== f.species) return false;
    if (f.sale_type && p.sale_type !== f.sale_type) return false;
    const pd = p.planned_date || '';
    if (f.from && pd && pd < f.from) return false;
    if (f.to && pd && pd > f.to) return false;
    return true;
  })), [plannedSales, f]);

  // Live Sales list: one compact card per Auction Event + normal sale cards,
  // sorted newest event date first.
  const liveCombined = useMemo(() => {
    const items = [
      ...filteredAuctions.map((a) => ({ kind: 'auction', date: a.auction_date || '', created: a.created_date || '', auction: a })),
      ...filteredSales.map((s) => ({ kind: 'sale', date: s.date || '', created: s.created_date || '', sale: s })),
    ];
    return items.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created || '').localeCompare(a.created || ''));
  }, [filteredAuctions, filteredSales]);

  const activeFilterCount = [f.farm_id, f.species, f.sale_type, f.from, f.to].filter(Boolean).length;

  const deleteSale = async (s) => {
    if (!confirm('Move this sale to the Recycle Bin? Its population effect and revenue will be reversed and can be restored later.')) return;
    try {
      const res = await base44.functions.invoke('deleteSale', { id: s.id });
      if (res?.data?.error) throw new Error(res.data.error);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    }
  };

  const deleteHunt = async (h) => {
    if (!confirm('Move this hunt to the Recycle Bin? All line-item population deductions and revenue will be reversed and can be restored later.')) return;
    try {
      const res = await base44.functions.invoke('deleteHunt', { id: h.id });
      if (res?.data?.error) throw new Error(res.data.error);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    }
  };

  const deleteAuction = async (a) => {
    if (!confirm('Move this auction to the Recycle Bin? All line-item population deductions and revenue will be reversed and can be restored later.')) return;
    try {
      const res = await base44.functions.invoke('deleteAuction', { id: a.id });
      if (res?.data?.error) throw new Error(res.data.error);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    }
  };

  const combined = useMemo(() => {
    const items = [
      ...filteredAuctions.map((a) => ({ kind: 'auction', date: a.auction_date || '', created: a.created_date || '', auction: a })),
      ...filteredSales.map((s) => ({ kind: 'sale', date: s.date || '', created: s.created_date || '', sale: s })),
      ...filteredHunts.map((h) => ({ kind: 'hunt', date: h.end_date || h.start_date || '', created: h.created_date || '', hunt: h })),
    ];
    return items.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created || '').localeCompare(a.created || ''));
  }, [filteredAuctions, filteredSales, filteredHunts]);

  const revenueLabel = tab === 'live' ? 'Live Sales Revenue' : tab === 'hunting' ? 'Hunting Revenue' : 'Total Revenue';
  const auctionRev = filteredAuctions.reduce((s, a) => s + Number(auctionFin[a.id]?.total_revenue || 0), 0);
  const liveRev = filteredSales.reduce((s, sale) => s + Number(saleFin[sale.id]?.total_price || 0), 0) + auctionRev;
  const huntRev = filteredHunts.reduce((s, h) => s + Number(huntFin[h.id]?.total_revenue || 0), 0);
  const revenueValue = tab === 'hunting' ? huntRev : tab === 'live' ? liveRev : liveRev + huntRev;

  return (
    <Layout>
      <BrandHeader subtitle={`${sales.length} sales · ${auctions.length} auctions · ${hunts.length} hunts · ${plannedSales.length} planned`} />
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-stone-900 text-lg">Sales</h2>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              {(tab === 'live' || tab === 'all') && (
                <>
                  <button onClick={() => setRecordingAuction(true)} className="flex items-center gap-1 text-sm font-medium text-stone-900"><Gavel className="w-3.5 h-3.5 text-stone-500" /> Record Auction</button>
                  <button onClick={() => setRecording(true)} className="flex items-center gap-1 text-sm font-medium text-stone-900">+ Record Sale</button>
                </>
              )}
              {(tab === 'hunting' || tab === 'all') && (
                <button onClick={() => setRecordingHunt(true)} className="flex items-center gap-1 text-sm font-medium text-stone-900"><Crosshair className="w-3.5 h-3.5 text-stone-500" /> Record Hunt</button>
              )}
              {tab === 'planned' && (
                <button onClick={() => setAddingPlannedSale(true)} className="flex items-center gap-1 text-sm font-medium text-stone-900">+ Add Planned Sale</button>
              )}
            </div>
          )}
        </div>

        {tab === 'planned' ? (
          <div className="auc-card p-4">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Planned Sales</span>
              <span className="font-black text-stone-900">{filteredPlannedSales.length}</span>
            </div>
          </div>
        ) : canViewFinance ? (
          <div className="auc-card p-4">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">{revenueLabel}</span>
              <span className="font-black text-stone-900">R {revenueValue.toLocaleString()}</span>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-4 gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${tab === t.id ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={() => setShowFilters((v) => !v)} className="w-full flex items-center justify-between auc-card px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
            <Filter className="w-3.5 h-3.5 text-stone-400" /> Filters{activeFilterCount > 0 && <span className="text-xs text-stone-400">({activeFilterCount})</span>}
          </span>
          <span className="text-xs text-stone-400">{showFilters ? 'Hide' : 'Show'}</span>
        </button>

        {showFilters && (
          <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-stone-500 uppercase tracking-wide">Farm</label>
                <select value={f.farm_id} onChange={(e) => setF({ ...f, farm_id: e.target.value })} className="w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-sm mt-0.5">
                  <option value="">All</option>
                  {farms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-stone-500 uppercase tracking-wide">Species</label>
                <select value={f.species} onChange={(e) => setF({ ...f, species: e.target.value })} className="w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-sm mt-0.5">
                  <option value="">All</option>
                  {[...new Set(sales.map((s) => s.species).filter(Boolean))].sort().map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-stone-500 uppercase tracking-wide">Sale Type</label>
              <select value={f.sale_type} onChange={(e) => setF({ ...f, sale_type: e.target.value })} className="w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-sm mt-0.5">
                <option value="">All</option>
                <option value="Auction">Auction</option>
                <option value="Private Sale">Private Sale</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-stone-500 uppercase tracking-wide">From</label>
                <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="w-full h-9 rounded-md border border-stone-200 px-2 text-sm mt-0.5" />
              </div>
              <div>
                <label className="text-[11px] text-stone-500 uppercase tracking-wide">To</label>
                <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="w-full h-9 rounded-md border border-stone-200 px-2 text-sm mt-0.5" />
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => setF({ farm_id: '', species: '', sale_type: '', from: '', to: '' })} className="text-xs text-red-500">Clear filters</button>
            )}
          </div>
        )}

        {tab === 'live' && (
          (sales.length === 0 && auctions.length === 0) ? (
            <div className="auc-empty"><ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No sales recorded yet.</p></div>
          ) : liveCombined.length === 0 ? (
            <p className="text-stone-400 text-sm italic text-center py-8">No sales match the selected filters.</p>
          ) : (
            <div className="space-y-2">
              {liveCombined.map((it) => it.kind === 'auction'
                ? <AuctionCard key={'a' + it.auction.id} auction={it.auction} farmName={farmName} isAdmin={isAdmin} finance={auctionFin[it.auction.id]} canViewFinance={canViewFinance} onEdit={() => setEditing({ auction: it.auction })} onDelete={() => deleteAuction(it.auction)} onOpen={() => navigate(`/auction/${it.auction.id}?from=/sales`)} />
                : <SaleCard key={'s' + it.sale.id} s={it.sale} finance={saleFin[it.sale.id]} canViewFinance={canViewFinance} farmName={farmName} campName={campName} isAdmin={isAdmin} onEdit={() => setEditing(it.sale)} onDelete={() => deleteSale(it.sale)} onOpen={() => navigate(`/sale/${it.sale.id}?from=/sales`)} />)}
            </div>
          )
        )}

        {tab === 'hunting' && (
          hunts.length === 0 ? (
            <div className="auc-empty"><Crosshair className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No hunts recorded yet.</p></div>
          ) : filteredHunts.length === 0 ? (
            <p className="text-stone-400 text-sm italic text-center py-8">No hunts match the selected filters.</p>
          ) : (
            <div className="space-y-2">
              {filteredHunts.map((h) => (
                <HuntCard key={h.id} hunt={h} farmName={farmName} isAdmin={isAdmin} finance={huntFin[h.id]} canViewFinance={canViewFinance}
                  onEdit={() => setEditing({ hunt: h })}
                  onDelete={() => deleteHunt(h)}
                  onOpen={() => navigate(`/hunt/${h.id}?from=/sales`)} />
              ))}
            </div>
          )
        )}

        {tab === 'planned' && (
          plannedSales.length === 0 ? (
            <div className="auc-empty"><CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No planned sales yet.{isAdmin ? ' Add one to start planning ahead.' : ''}</p></div>
          ) : filteredPlannedSales.length === 0 ? (
            <p className="text-stone-400 text-sm italic text-center py-8">No planned sales match the selected filters.</p>
          ) : (
            <div className="space-y-2">
              {filteredPlannedSales.map((p) => (
                <PlannedSaleCard key={p.id} p={p} finance={plannedFin[p.id]} canViewFinance={canViewFinance} farmName={farmName} campName={campName} onOpen={() => navigate(`/planned-sale/${p.id}?from=/sales`)} />
              ))}
            </div>
          )
        )}

        {tab === 'all' && (
          combined.length === 0 ? (
            <p className="text-stone-400 text-sm italic text-center py-8">No records match the selected filters.</p>
          ) : (
            <div className="space-y-2">
              {combined.map((it) => it.kind === 'auction'
                ? <AuctionCard key={'a' + it.auction.id} auction={it.auction} farmName={farmName} isAdmin={isAdmin} showLabel finance={auctionFin[it.auction.id]} canViewFinance={canViewFinance} onEdit={() => setEditing({ auction: it.auction })} onDelete={() => deleteAuction(it.auction)} onOpen={() => navigate(`/auction/${it.auction.id}?from=/sales`)} />
                : it.kind === 'sale'
                ? <SaleCard key={'s' + it.sale.id} s={it.sale} finance={saleFin[it.sale.id]} canViewFinance={canViewFinance} farmName={farmName} campName={campName} isAdmin={isAdmin} showLabel onEdit={() => setEditing(it.sale)} onDelete={() => deleteSale(it.sale)} onOpen={() => navigate(`/sale/${it.sale.id}?from=/sales`)} />
                : <HuntCard key={'h' + it.hunt.id} hunt={it.hunt} farmName={farmName} isAdmin={isAdmin} showLabel finance={huntFin[it.hunt.id]} canViewFinance={canViewFinance} onEdit={() => setEditing({ hunt: it.hunt })} onDelete={() => deleteHunt(it.hunt)} onOpen={() => navigate(`/hunt/${it.hunt.id}?from=/sales`)} />
              )}
            </div>
          )
        )}
      </div>

      {recording && <RecordSaleDialog open onOpenChange={(v) => !v && setRecording(false)} farms={farms} camps={camps} animals={animals} onDone={load} />}
      {recordingAuction && <AuctionFormDialog open onOpenChange={(v) => !v && setRecordingAuction(false)} auction={null} farms={farms} camps={camps} animals={animals} onDone={load} />}
      {recordingHunt && <HuntFormDialog open onOpenChange={(v) => !v && setRecordingHunt(false)} hunt={null} farms={farms} camps={camps} animals={animals} onDone={load} />}
      {editing && !editing.hunt && !editing.auction && <EditSaleDialog open onOpenChange={(v) => !v && setEditing(null)} sale={editing} farms={farms} camps={camps} animals={animals} onDone={load} />}
      {editing && editing.hunt && <HuntFormDialog open onOpenChange={(v) => !v && setEditing(null)} hunt={editing.hunt} farms={farms} camps={camps} animals={animals} onDone={load} />}
      {editing && editing.auction && <AuctionFormDialog open onOpenChange={(v) => !v && setEditing(null)} auction={editing.auction} farms={farms} camps={camps} animals={animals} onDone={load} />}
      {addingPlannedSale && <AddPlannedSaleDialog open onOpenChange={(v) => !v && setAddingPlannedSale(false)} farms={farms} camps={camps} animals={animals} onDone={load} />}
    </Layout>
  );
}

function SaleCard({ s, finance, canViewFinance = true, farmName, campName, isAdmin, showLabel, onEdit, onDelete, onOpen }) {
  return (
    <div className="auc-record p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {showLabel && <span className="auc-badge bg-stone-900 text-stone-50">LIVE SALE</span>}
          <span className={`auc-badge ${s.type === 'bulk' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>
            {s.type === 'bulk' ? 'BULK' : 'TAGGED'}
          </span>
        </div>
        <span className="text-xs text-stone-400">{s.date}</span>
      </div>
      <p className="text-sm font-medium text-stone-800">
        {s.type === 'bulk' ? `${s.quantity} ${s.species} ${s.animal_class || ''}` : `${s.animal_tag} · ${s.species}`}
      </p>
      <p className="text-xs text-stone-500 mt-0.5">{farmName(s.farm_id)} → {campName(s.camp_id)}</p>
      {canViewFinance && (
        <p className="text-xs text-stone-500 mt-0.5">Price per Animal: R {Number(finance?.unit_price || 0).toLocaleString()} · Total: R {Number(finance?.total_price || 0).toLocaleString()}</p>
      )}
      {(s.sale_type || s.sold_at) && (
        <p className="text-xs text-stone-500 mt-0.5">{s.sale_type}{s.sold_at ? ` · ${s.sold_at}` : ''}</p>
      )}
      {s.notes && <p className="text-xs text-stone-400 mt-1 italic">{s.notes}</p>}
      <button onClick={onOpen} className="text-xs text-stone-500 underline mt-1">View details</button>
      {isAdmin && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-stone-100 text-xs">
          <button onClick={onEdit} className="flex items-center gap-1 text-stone-500"><Pencil className="w-3.5 h-3.5" /> Edit</button>
          <button onClick={onDelete} className="flex items-center gap-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
        </div>
      )}
    </div>
  );
}