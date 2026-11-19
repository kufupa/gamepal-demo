import moment from 'moment';

// Read-only list of the mortality records already recorded against one camp.
// Display only — it never recomputes, adjusts or reverses any quantity.
export default function CampMortalityHistory({ mortalities, campId, navigate }) {
  if (!mortalities || mortalities.length === 0) {
    return <p className="text-stone-400 text-sm italic">No mortality recorded from this camp</p>;
  }

  return (
    <div className="space-y-2">
      {mortalities.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => navigate(`/mortality/${m.id}?from=/camp/${campId}`)}
          className="w-full text-left bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-red-600">
              {m.type === 'bulk'
                ? `${m.quantity || 0} ${m.species || ''}${m.animal_class ? ` · ${m.animal_class}` : ''}`
                : `${m.animal_tag || 'Tagged animal'}${m.species ? ` · ${m.species}` : ''}`}
            </span>
            <span className="text-xs text-stone-400 shrink-0">{moment(m.date).format('D MMM YYYY')}</span>
          </div>
          {m.cause && <p className="text-stone-600 text-xs mt-0.5">{m.cause}</p>}
          {m.notes && <p className="text-stone-500 text-xs mt-0.5 italic">{m.notes}</p>}
        </button>
      ))}
    </div>
  );
}