import { useSpecies } from '@/lib/species';

// Multi-select for the species groups a breeding male breeds with.
// value is stored as an array on Animal.breeds_species; legacy single-string
// values are normalised to a one-element array for display.
export default function BreedsWithSelect({ value, onChange }) {
  const { species: speciesMaster, loading } = useSpecies();
  const selected = Array.isArray(value) ? value : (value ? [value] : []);

  const toggle = (name) => {
    if (selected.includes(name)) onChange(selected.filter((s) => s !== name));
    else onChange([...selected, name]);
  };

  if (loading) {
    return <p className="text-xs text-stone-400 italic">Loading species…</p>;
  }
  if (speciesMaster.length === 0) {
    return <p className="text-xs text-stone-400 italic">No species available.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 mt-1">
      {speciesMaster.map((s) => (
        <label key={s.id} className="flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" checked={selected.includes(s.name)} onChange={() => toggle(s.name)} className="w-4 h-4" />
          {s.name}
        </label>
      ))}
    </div>
  );
}