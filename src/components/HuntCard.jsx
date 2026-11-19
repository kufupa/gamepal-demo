import { Crosshair } from 'lucide-react';

function fmtRange(start, end) {
  if (!start && !end) return '—';
  if (!end || start === end) return start;
  return `${start} – ${end}`;
}

export default function HuntCard({ hunt, farmName, isAdmin, onEdit, onDelete, onOpen, showLabel = false, finance, canViewFinance = true }) {
  return (
    <div className="auc-record p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase text-stone-600">
          <Crosshair className="w-3.5 h-3.5 text-stone-500" /> {showLabel ? 'HUNTING' : 'HUNT'}
        </span>
        <span className="text-xs text-stone-400">{hunt.end_date || hunt.start_date}</span>
      </div>
      <p className="text-sm font-semibold text-stone-900 uppercase tracking-wide">{hunt.name}</p>
      <p className="text-xs text-stone-500 mt-0.5">{farmName(hunt.farm_id)} · {fmtRange(hunt.start_date, hunt.end_date)}</p>
      <p className="text-xs text-stone-500 mt-0.5">
        {hunt.total_animals || 0} animal{(hunt.total_animals || 0) === 1 ? '' : 's'} · {hunt.total_species || 0} specie{(hunt.total_species || 0) === 1 ? '' : 's'}
      </p>
      {canViewFinance && (finance?.total_revenue || 0) > 0 && <p className="text-xs text-stone-700 font-medium mt-0.5">Total: R {Number(finance.total_revenue).toLocaleString()}</p>}
      <button onClick={onOpen} className="text-xs text-stone-500 underline mt-1">View details</button>
      {isAdmin && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-stone-100 text-xs">
          <button onClick={onEdit} className="text-stone-500">Edit</button>
          <button onClick={onDelete} className="text-red-500">Delete</button>
        </div>
      )}
    </div>
  );
}