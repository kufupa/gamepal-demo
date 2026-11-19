import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { breedsList } from '@/lib/animalHelpers';

// Display order for classification labels — universal sex labels first.
const PRIORITY = ['Female', 'Male'];

export default function CampCard({ camp, groups, animals, total, isAdmin, isFirst, isLast, onUp, onDown }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const live = animals.filter((a) => a.status !== 'Deceased' && a.status !== 'Sold');

  // Per-species breakdown using the SAME counting logic as the camp total:
  //   - a bulk group quantity is untagged animals only, shown under its class
  //   - every live tagged animal counts +1 under its sex (Female / Male)
  //   - breeding males are listed by name under each species they breed with
  const bySpecies = {};
  const ensure = (sp) => (bySpecies[sp] ??= { classTotals: {}, males: [] });

  for (const g of groups) {
    const cls = g.animal_class || 'Unknown';
    const e = ensure(g.species);
    e.classTotals[cls] = (e.classTotals[cls] || 0) + (Number(g.quantity) || 0);
  }
  for (const a of live) {
    if (a.is_breeding_male) continue;
    const cls = a.sex === 'Female' ? 'Female' : 'Male';
    const e = ensure(a.species);
    e.classTotals[cls] = (e.classTotals[cls] || 0) + 1;
  }
  for (const m of live.filter((a) => a.is_breeding_male)) {
    const keys = breedsList(m).length ? breedsList(m) : [m.species];
    for (const k of keys) ensure(k).males.push(m);
  }

  const speciesNames = Object.keys(bySpecies);
  const hasBreakdown = speciesNames.length > 0;

  return (
    <div className="auc-card overflow-hidden">
      <div className="flex items-stretch">
        {/* Tapping the name opens the full camp page */}
        <button
          onClick={() => navigate(`/camp/${camp.id}`)}
          className="flex-1 flex items-center gap-2 px-4 py-3.5 text-left hover:bg-stone-50 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="font-bold tracking-wide text-stone-900 text-sm flex-1 min-w-0 truncate">
            {camp.name}
            {camp.size_hectares ? <span className="font-normal text-stone-400 text-xs ml-1">· {camp.size_hectares} ha</span> : null}
          </span>
          <span className="text-xs text-stone-500 font-semibold whitespace-nowrap">Total: {total ?? 0}</span>
        </button>
        {/* Tapping the arrow only expands/collapses the quick overview */}
        {hasBreakdown && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="px-3 flex items-center border-l border-stone-100 hover:bg-stone-50 transition-colors"
            aria-label={open ? 'Collapse overview' : 'Expand overview'}
          >
            <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {open && hasBreakdown && (
        <div className="px-4 py-3 space-y-3 border-t border-stone-100">
          {speciesNames.map((sp) => {
            const { classTotals, males } = bySpecies[sp];
            const classes = Object.entries(classTotals)
              .filter(([, n]) => n > 0)
              .sort((a, b) => {
                const pa = PRIORITY.indexOf(a[0]);
                const pb = PRIORITY.indexOf(b[0]);
                return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
              });
            return (
              <div key={sp}>
                <p className="text-[11px] font-bold tracking-[0.14em] text-stone-500 uppercase">{sp}</p>
                <div className="mt-1 space-y-0.5">
                  {classes.map(([cls, n]) => (
                    <p key={cls} className="text-sm text-stone-700">
                      <span className="text-stone-500">{cls}:</span> <span className="font-semibold">{n}</span>
                    </p>
                  ))}
                  {males.length > 0 && (
                    <p className="text-sm text-stone-700">
                      <span className="text-stone-500">Male:</span>{' '}
                      <span className="font-semibold text-stone-900">
                        {males.map((m) => `${m.tag_number}${m.species ? ` – ${m.species}` : ''}`).join(', ')}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {isAdmin && onUp && onDown && (
        <div className="flex border-t border-stone-100 text-xs">
          <button onClick={onUp} disabled={isFirst} className="flex-1 py-2 text-stone-500 flex items-center justify-center gap-1 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /> Up</button>
          <button onClick={onDown} disabled={isLast} className="flex-1 py-2 text-stone-500 flex items-center justify-center gap-1 border-l border-stone-100 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /> Down</button>
        </div>
      )}
    </div>
  );
}