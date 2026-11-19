import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { sireLabel } from '@/lib/animalHelpers';

// Collapsible list of tagged individual animals for one species block on the
// Camp Profile. Collapsed by default; the count is always visible in the
// heading. Display only — counting is done in animalHelpers, untouched here.
export default function TaggedAnimalsSection({ animals, allAnimals }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!animals || animals.length === 0) return null;

  return (
    <div className="pt-2 border-t border-stone-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="text-[11px] font-bold tracking-wide text-stone-500 uppercase">
          Tagged Animals ({animals.length})
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5">
          {animals.map((a) => {
            const sire = sireLabel(a, allAnimals);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(`/animal/${a.id}`)}
                className="block text-left bg-stone-50 rounded-md px-2.5 py-1.5 w-full"
              >
                <p className="text-sm font-semibold text-stone-900 leading-tight">{a.tag_number}</p>
                <p className="text-[11px] text-stone-500">Sire: {sire === 'Unknown' ? '—' : sire}</p>
                <p className="text-[11px] text-stone-500">{a.sex}</p>
              </button>
            );
          })}
          <p className="text-[11px] text-stone-400">Each animal here counts individually in the camp total.</p>
        </div>
      )}
    </div>
  );
}