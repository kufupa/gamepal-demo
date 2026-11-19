import { useSpecies } from '@/lib/species';

export default function SpeciesSelect({ value, onChange, required, placeholder, className }) {
  const { species, loading } = useSpecies();
  return (
    <select
      className={`w-full h-10 rounded-md border border-input bg-background px-3 text-sm ${className || ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{required ? (placeholder || '— Select species —') : (placeholder || '— None —')}</option>
      {loading && <option disabled>Loading…</option>}
      {species.map((s) => (
        <option key={s.id} value={s.name}>{s.name}</option>
      ))}
    </select>
  );
}