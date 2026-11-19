import InchFractionInput from '@/components/InchFractionInput';

// Controlled set of horn measurement fields. Used in the Add Animal dialog
// (initial measurement) and the Horn Measurements section (add/edit form).
// value is an object with measurement_date, horn_length_left, etc.
export default function HornMeasurementFields({ value = {}, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3">
      <div>
        <span className="text-[11px] text-stone-500 uppercase tracking-wide">Measurement Date</span>
        <input
          type="date"
          value={value.measurement_date || ''}
          onChange={(e) => set('measurement_date', e.target.value)}
          className="auc-input mt-1"
        />
      </div>
      <InchFractionInput label="Inches" value={value.inches} onChange={(v) => set('inches', v)} />
      <div className="grid grid-cols-2 gap-3">
        <InchFractionInput label="Horn Length L" value={value.horn_length_left} onChange={(v) => set('horn_length_left', v)} />
        <InchFractionInput label="Horn Length R" value={value.horn_length_right} onChange={(v) => set('horn_length_right', v)} />
      </div>
      <InchFractionInput label="Tip to Tip" value={value.tip_to_tip} onChange={(v) => set('tip_to_tip', v)} />
      <div className="grid grid-cols-2 gap-3">
        <InchFractionInput label="Tips L" value={value.tips_left} onChange={(v) => set('tips_left', v)} />
        <InchFractionInput label="Tips R" value={value.tips_right} onChange={(v) => set('tips_right', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InchFractionInput label="Base L" value={value.base_left} onChange={(v) => set('base_left', v)} />
        <InchFractionInput label="Base R" value={value.base_right} onChange={(v) => set('base_right', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[11px] text-stone-500 uppercase tracking-wide">Rings L</span>
          <input
            type="number"
            value={value.rings_left ?? ''}
            onChange={(e) => set('rings_left', e.target.value === '' ? null : Number(e.target.value))}
            className="auc-input mt-1"
          />
        </div>
        <div>
          <span className="text-[11px] text-stone-500 uppercase tracking-wide">Rings R</span>
          <input
            type="number"
            value={value.rings_right ?? ''}
            onChange={(e) => set('rings_right', e.target.value === '' ? null : Number(e.target.value))}
            className="auc-input mt-1"
          />
        </div>
      </div>
    </div>
  );
}