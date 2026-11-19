import { useState, useEffect } from 'react';
import { RotateCcw, Trash2, ArrowLeftRight, ShoppingCart, Skull, Crosshair, Gavel, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const RESTORE_FN = { movement: 'restoreMovement', sale: 'restoreSale', mortality: 'restoreMortality', hunt: 'restoreHunt', auction: 'restoreAuction', 'capture event': 'restoreMovementEvent' };
const ENTITY = { movement: 'Movement', sale: 'Sale', mortality: 'Mortality', hunt: 'HuntEvent', auction: 'AuctionEvent', 'capture event': 'MovementEvent' };

export default function RecycleBin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [fin, setFin] = useState({ sale: {}, hunt: {}, auction: {} });

  const load = async () => {
    setLoading(true);
    const [mv, sl, mo, hu, au, ce, sf, hf, af] = await Promise.all([
      base44.entities.Movement.filter({ deleted: true }, '-deleted_date', 200),
      base44.entities.Sale.filter({ deleted: true }, '-deleted_date', 200),
      base44.entities.Mortality.filter({ deleted: true }, '-deleted_date', 200),
      base44.entities.HuntEvent.filter({ deleted: true }, '-deleted_date', 200),
      base44.entities.AuctionEvent.filter({ deleted: true }, '-deleted_date', 200),
      base44.entities.MovementEvent.filter({ deleted: true }, '-deleted_date', 200),
      base44.entities.SaleFinance.list('-created_date', 1000),
      base44.entities.HuntFinance.list('-created_date', 1000),
      base44.entities.AuctionFinance.list('-created_date', 1000),
    ]);
    const idx = (rows, key) => { const m = {}; for (const r of rows) m[r[key]] = r; return m; };
    setFin({ sale: idx(sf, 'sale_id'), hunt: idx(hf, 'hunt_id'), auction: idx(af, 'auction_id') });
    const flat = [
      ...mv.map((m) => ({ ...m, _kind: 'movement', _icon: ArrowLeftRight })),
      ...sl.map((s) => ({ ...s, _kind: 'sale', _icon: ShoppingCart })),
      ...mo.map((m) => ({ ...m, _kind: 'mortality', _icon: Skull })),
      ...hu.map((h) => ({ ...h, _kind: 'hunt', _icon: Crosshair, date: h.end_date || h.start_date || '' })),
      ...au.map((a) => ({ ...a, _kind: 'auction', _icon: Gavel, date: a.auction_date || '' })),
      ...ce.map((e) => ({ ...e, _kind: 'capture event', _icon: Camera, date: e.date || '' })),
    ].sort((a, b) => (b.deleted_date || '').localeCompare(a.deleted_date || ''));
    setItems(flat);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const summary = (it) => {
    if (it._kind === 'movement') {
      return it.type === 'bulk'
        ? `${it.quantity || 0} ${it.species || ''} ${it.animal_class || ''}`.trim()
        : (it.animal_tags?.length ? it.animal_tags.join(', ') : 'Individual move');
    }
    if (it._kind === 'hunt') {
      const rev = fin.hunt[it.id]?.total_revenue;
      return `${it.name || 'Hunt'} · ${it.total_animals || 0} animal(s)${rev ? ` · R${Number(rev).toLocaleString()}` : ''}`;
    }
    if (it._kind === 'auction') {
      const rev = fin.auction[it.id]?.total_revenue;
      return `${it.name || 'Auction'} · ${it.total_animals || 0} animal(s)${rev ? ` · R${Number(rev).toLocaleString()}` : ''}`;
    }
    if (it._kind === 'capture event') {
      return it.name || `Capture Event — ${it.date}`;
    }
    const base = it.type === 'bulk'
      ? `${it.quantity || 0} ${it.species || ''} ${it.animal_class || ''}`.trim()
      : `${it.animal_tag || 'Animal'} · ${it.species || ''}`;
    const saleTotal = fin.sale[it.id]?.total_price;
    return it._kind === 'sale' && saleTotal ? `${base} · R${Number(saleTotal).toLocaleString()}` : base;
  };

  const restore = async (it) => {
    if (!confirm(`Restore this ${it._kind} record? Its effect on population totals will be reapplied.`)) return;
    setBusy(it.id);
    try {
      const res = await base44.functions.invoke(RESTORE_FN[it._kind], { id: it.id });
      if (res?.data?.error) throw new Error(res.data.error);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Restore failed');
    } finally {
      setBusy('');
    }
  };

  const permanentDelete = async (it) => {
    if (!confirm(`PERMANENTLY delete this ${it._kind} record? This cannot be undone.`)) return;
    if (!confirm('Are you absolutely sure? This removes it from the database forever.')) return;
    setBusy(it.id);
    try {
      await base44.entities[ENTITY[it._kind]].delete(it.id);
      // The protected finance row belongs to this record only — remove it too.
      if (it._kind === 'sale') await base44.entities.SaleFinance.deleteMany({ sale_id: it.id });
      if (it._kind === 'hunt') await base44.entities.HuntFinance.deleteMany({ hunt_id: it.id });
      if (it._kind === 'auction') await base44.entities.AuctionFinance.deleteMany({ auction_id: it.id });
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">Deleted movements, sales and mortality records are kept here with their population effect already reversed. Restoring a record reapplies its effect on totals. Records are not permanently removed until you delete them here.</p>
      {loading ? (
        <p className="text-center text-stone-400 text-sm py-6">Loading…</p>
      ) : items.length === 0 ? (
        <div className="auc-empty"><Trash2 className="w-9 h-9 mx-auto mb-2 opacity-40" /><p className="text-sm">Recycle Bin is empty.</p></div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const Ic = it._icon;
            return (
              <div key={it._kind + it.id} className="auc-record p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase text-stone-500">
                    <Ic className="w-3.5 h-3.5" /> {it._kind}
                  </span>
                  <span className="text-xs text-stone-400">Deleted {it.deleted_date || '—'}</span>
                </div>
                <p className="text-sm font-medium text-stone-800">{summary(it)}</p>
                <p className="text-xs text-stone-400">Record date: {it.date || '—'}</p>
                <div className="flex gap-3 mt-2 pt-2 border-t border-stone-100 text-xs">
                  <button onClick={() => restore(it)} disabled={busy === it.id} className="flex items-center gap-1 text-stone-700 disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5" /> Restore</button>
                  <button onClick={() => permanentDelete(it)} disabled={busy === it.id} className="flex items-center gap-1 text-red-500 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Delete forever</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-stone-400">Note: restoring a record whose source camp or animal has since changed may fail safely — nothing is changed if the restore cannot be applied cleanly.</p>
    </div>
  );
}