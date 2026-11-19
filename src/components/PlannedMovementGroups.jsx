import { ArrowRight } from 'lucide-react';
import { sortByPriorityAsc } from '@/lib/sortHelpers';

// Renders active planned movements grouped visually by shared priority number.
// plans: active (Planned) movements
// mode: 'farm' | 'camp'
export default function PlannedMovementGroups({ plans, mode = 'farm', camps = [], campId, navigate }) {
  const campName = (cid) => camps.find((c) => c.id === cid)?.name || '—';

  const subject = (p) => p.type === 'bulk'
    ? `${p.quantity || 0} ${p.species || ''} ${p.animal_class || ''}`.trim()
    : (p.animal_tags?.length ? p.animal_tags.join(', ') : 'Tagged animals');

  let items = plans;
  if (mode === 'camp' && campId) {
    items = plans.filter((p) => p.from_camp_id === campId || (p.destination_type === 'camp' && p.to_camp_id === campId));
  }
  const sorted = sortByPriorityAsc(items);

  // Group consecutive same-priority plans into batches.
  const groups = [];
  sorted.forEach((p) => {
    const key = p.priority != null ? String(p.priority) : '__none';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(p);
    else groups.push({ key, priority: p.priority, items: [p] });
  });

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const hasPriority = g.priority != null;
        return (
          <div key={g.key} className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-soft">
            <div className="flex items-center justify-between px-3 py-2 bg-stone-50/80 border-b border-stone-100">
              <span className={`auc-badge ${hasPriority ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'}`}>
                {hasPriority ? `PRIORITY ${g.priority}` : 'PLANNED'}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                {g.items.length} {g.items.length === 1 ? 'line' : 'lines'}
              </span>
            </div>
            <div className="divide-y divide-stone-100">
              {g.items.map((p) => {
                const isOut = mode === 'camp' ? p.from_camp_id === campId : false;
                const from = campName(p.from_camp_id);
                const other = p.destination_type === 'camp' ? campName(p.to_camp_id) : (p.destination_text || 'External');
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/planned-movement/${p.id}?from=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                    className="w-full text-left px-3 py-2.5 hover:bg-stone-50 transition-colors"
                  >
                    {mode === 'camp' && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 block mb-0.5">
                        {isOut ? 'Out →' : 'In ←'}
                      </span>
                    )}
                    <p className="font-medium text-stone-800 text-sm">{subject(p)}</p>
                    <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                      {mode === 'camp' && !isOut ? <>from {from}</> : (
                        <>{from} <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" /> <span className="font-medium text-stone-700">{other}</span></>
                      )}
                    </p>
                    {p.note && <p className="text-xs text-stone-400 mt-1 italic truncate">{p.note}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}