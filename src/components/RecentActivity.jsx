import { ChevronDown, ArrowLeftRight, ShoppingCart, Skull } from 'lucide-react';
import { byEventDateDesc } from '@/lib/sortHelpers';

export default function RecentActivity({ open, onToggle, movements, sales, mortalities, farmId, camps, navigate, saleFinance = {}, canViewFinance = true }) {
  const campName = (cid) => camps.find((c) => c.id === cid)?.name || '—';

  const items = [
    ...movements.filter((m) => m.from_farm_id === farmId || m.to_farm_id === farmId).map((m) => ({
      id: m.id, kind: 'movement', date: m.date || '', created_date: m.created_date || '', to: `/movement/${m.id}`,
      title: m.type === 'bulk'
        ? `${m.quantity || 0} ${m.species || ''} ${m.animal_class || ''}`.trim()
        : (m.animal_tags?.length ? m.animal_tags.join(', ') : 'Individual move'),
      sub: `${campName(m.from_camp_id)} → ${m.destination_type === 'manual' ? (m.destination_text || 'External') : campName(m.to_camp_id)}`,
    })),
    ...sales.filter((s) => s.farm_id === farmId).map((s) => ({
      id: s.id, kind: 'sale', date: s.date || '', created_date: s.created_date || '', to: `/sale/${s.id}`,
      title: s.type === 'bulk'
        ? `${s.quantity || 0} ${s.species || ''} ${s.animal_class || ''}`.trim()
        : (s.animal_tag || 'Animal'),
      sub: `${campName(s.camp_id)}${canViewFinance && saleFinance[s.id]?.total_price ? ' · R' + Number(saleFinance[s.id].total_price).toLocaleString() : ''}`,
    })),
    ...mortalities.filter((m) => m.farm_id === farmId).map((m) => ({
      id: m.id, kind: 'mortality', date: m.date || '', created_date: m.created_date || '', to: `/mortality/${m.id}`,
      title: m.type === 'individual'
        ? `1 ${m.species || ''} ${m.animal_tag || ''}`.trim()
        : `${m.quantity || 1} ${m.species || ''} ${m.animal_class || ''}`.trim(),
      sub: campName(m.camp_id),
    })),
  ].sort(byEventDateDesc).slice(0, 5);

  const Icon = { movement: ArrowLeftRight, sale: ShoppingCart, mortality: Skull };
  const color = { movement: 'text-emerald-600', sale: 'text-amber-600', mortality: 'text-red-500' };

  return (
    <div className="auc-card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3.5">
        <span className="font-bold text-stone-900 text-sm">Recent Activity</span>
        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2">
          {items.length === 0 ? (
            <p className="text-stone-400 text-sm italic py-4 text-center">No recent activity on this farm.</p>
          ) : items.map((it) => {
            const Ic = Icon[it.kind];
            return (
              <button
                key={it.kind + it.id}
                onClick={() => navigate(`${it.to}?from=${encodeURIComponent('/?farm=' + farmId)}`)}
                className="w-full text-left bg-stone-50 border border-stone-100 rounded-lg px-3 py-2 hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-stone-800 text-sm">
                    <Ic className={`w-3.5 h-3.5 ${color[it.kind]}`} /> {it.title}
                  </span>
                  <span className="text-xs text-stone-400">{it.date}</span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">{it.sub}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}