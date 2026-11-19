import { CalendarClock, ChevronRight } from 'lucide-react';
import moment from 'moment';

// Compact card for an active planned sale in the Planned Sales tab.
export default function PlannedSaleCard({ p, farmName, campName, onOpen, finance, canViewFinance = true }) {
  const subject = p.type === 'bulk'
    ? `${p.quantity || 0} ${p.species || ''} ${p.animal_class || ''}`.trim()
    : (p.type === 'individual' && ((p.animal_tags?.length) || (p.animal_id ? 1 : 0)) > 1
        ? `${p.quantity || p.animal_tags?.length || 0} tagged · ${(p.animal_tags && p.animal_tags.length > 0 ? p.animal_tags : [p.animal_tag]).filter(Boolean).join(', ')}`
        : (p.animal_tag || 'Tagged animal'));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left auc-record p-3 hover:bg-stone-50 transition-colors"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="auc-badge bg-amber-100 text-amber-700">PLANNED SALE</span>
        {p.planned_date && (
          <span className="flex items-center gap-1 text-xs text-stone-400">
            <CalendarClock className="w-3 h-3" /> {moment(p.planned_date).format('D MMM YYYY')}
          </span>
        )}
      </div>
      <p className="font-medium text-stone-800 text-sm">{subject}</p>
      <p className="text-xs text-stone-500 mt-0.5">{farmName(p.farm_id)} → {campName(p.camp_id)}</p>
      {p.buyer_venue && <p className="text-xs text-stone-500 mt-0.5">Planned: {p.buyer_venue}</p>}
      {canViewFinance && (
        <p className="text-xs text-stone-500 mt-0.5">
          Target: R {Number(finance?.target_price || 0).toLocaleString()} per animal · Expected Total: R {Number(finance?.expected_total || 0).toLocaleString()}
        </p>
      )}
      {p.notes && <p className="text-xs text-stone-400 mt-1 italic line-clamp-2">{p.notes}</p>}
      <span className="inline-flex items-center gap-0.5 text-amber-600 text-[11px] font-medium mt-1">
        View Details <ChevronRight className="w-3 h-3" />
      </span>
    </button>
  );
}