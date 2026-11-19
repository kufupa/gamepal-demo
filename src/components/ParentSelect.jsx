import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Dual-mode sire/dam field: pick an existing tagged animal, or enter a manual
// pedigree/reference. Outputs (id, manual) — only one is set at a time.
export default function ParentSelect({ label, candidates = [], parentId, parentManual, onChange, required }) {
  const [mode, setMode] = useState(parentManual ? 'manual' : 'select');

  const switchMode = (m) => {
    if (m === mode) return;
    setMode(m);
    if (m === 'manual') onChange('', parentManual || '');
    else onChange(parentId || '', '');
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}{required && <span className="text-red-500"> *</span>}</Label>
        <div className="flex gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => switchMode('select')}
            className={`px-2 py-0.5 rounded-full border ${mode === 'select' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}
          >
            Select existing
          </button>
          <button
            type="button"
            onClick={() => switchMode('manual')}
            className={`px-2 py-0.5 rounded-full border ${mode === 'manual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}
          >
            Manual
          </button>
        </div>
      </div>
      {mode === 'select' ? (
        <select
          className="w-full h-10 mt-1 rounded-md border border-input bg-background px-3 text-sm"
          value={parentId || ''}
          onChange={(e) => onChange(e.target.value, '')}
        >
          <option value="">{required ? '— Select —' : '— None —'}</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.tag_number} ({c.species})</option>
          ))}
        </select>
      ) : (
        <Input
          className="mt-1"
          value={parentManual || ''}
          onChange={(e) => onChange('', e.target.value)}
          placeholder="e.g. Bellevue Ram A23"
        />
      )}
    </div>
  );
}