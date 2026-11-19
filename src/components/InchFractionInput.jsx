import { Input } from '@/components/ui/input';

const FRACTIONS = [0, 1, 2, 3, 4, 5, 6, 7];

// Dual input: whole inches + fraction selector (eighths). Outputs a decimal
// number via onChange (e.g. 27 + 5/8 -> 27.625). Pass null to clear.
export default function InchFractionInput({ value, onChange, label }) {
  const val = value != null && value !== '' ? Number(value) : null;
  const whole = val != null ? Math.floor(val) : '';
  const eighths = val != null ? Math.round((val - Math.floor(val)) * 8) : '';

  const handleChange = (w, e) => {
    if ((w === '' || w == null) && (e === '' || e == null)) { onChange(null); return; }
    const wholeNum = Number(w) || 0;
    const eighthsNum = Number(e) || 0;
    onChange(wholeNum + eighthsNum / 8);
  };

  return (
    <div>
      {label && <span className="text-[11px] text-stone-500 uppercase tracking-wide">{label}</span>}
      <div className="flex gap-2 mt-1">
        <Input
          type="number"
          value={whole}
          onChange={(e) => handleChange(e.target.value, eighths)}
          placeholder="0"
          className="w-16 h-10"
        />
        <select
          className="flex-1 h-10 rounded-md border border-input bg-background px-2 text-sm"
          value={eighths}
          onChange={(e) => handleChange(whole, e.target.value)}
        >
          <option value="">—</option>
          {FRACTIONS.map((f) => (
            <option key={f} value={f}>{f}/8</option>
          ))}
        </select>
      </div>
    </div>
  );
}