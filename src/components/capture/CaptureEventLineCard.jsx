import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SpeciesSelect from '@/components/SpeciesSelect';

export const EMPTY_LINE = {
  type: 'bulk',
  from_camp_id: '',
  destination_type: 'camp',
  to_camp_id: '',
  destination_text: '',
  species: '',
  animal_class: '',
  quantity: '',
  animal_ids: [],
  note: '',
};

export const isLineComplete = (l) => !!(
  l.from_camp_id &&
  (l.destination_type === 'manual' ? l.destination_text : l.to_camp_id) &&
  (l.type === 'bulk'
    ? l.species && l.animal_class && Number(l.quantity) > 0
    : l.animal_ids && l.animal_ids.length > 0)
);

// One movement line inside the Capture Event builder: a compact card that
// collapses to a summary once complete, expands to edit all line fields.
export default function CaptureEventLineCard({ index, line, camps = [], animals = [], onChange, onRemove }) {
  const [open, setOpen] = useState(true);
  const set = (k, v) => onChange({ ...line, [k]: v });
  const campName = (id) => camps.find((c) => c.id === id)?.name || '—';
  const destCamps = camps.filter((c) => c.id !== line.from_camp_id);
  const sourceAnimals = animals.filter((a) => a.current_camp_id === line.from_camp_id && a.status !== 'Deceased');
  const destLabel = line.destination_type === 'manual' ? (line.destination_text || 'External') : campName(line.to_camp_id);
  const summary = !line.from_camp_id
    ? 'Select a source camp'
    : line.type === 'bulk'
      ? `${line.quantity || '?'} ${line.species || '—'} ${line.animal_class || ''} → ${destLabel}`
      : `${line.animal_ids.length} tagged → ${destLabel}`;

  const toggleAnimal = (id) => set('animal_ids', line.animal_ids.includes(id) ? line.animal_ids.filter((x) => x !== id) : [...line.animal_ids, id]);

  return (
    <div className={`rounded-lg border ${isLineComplete(line) ? 'border-stone-200 bg-white' : 'border-amber-300 bg-amber-50'}`}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left">
        <span className="text-sm text-stone-800 truncate">
          <span className="auc-badge bg-stone-100 text-stone-600 mr-1.5">{line.type === 'bulk' ? 'BULK' : 'TAGGED'}</span>
          <span className="font-medium">Line {index + 1}:</span> {summary}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-3 space-y-3 border-t border-stone-100">
          <div className="flex gap-2">
            <button type="button" onClick={() => set('type', 'bulk')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${line.type === 'bulk' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Bulk Group</button>
            <button type="button" onClick={() => set('type', 'individual')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${line.type === 'individual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Tagged Animals</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From (source camp)</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={line.from_camp_id} onChange={(e) => set('from_camp_id', e.target.value)}>
                <option value="">— Select —</option>
                {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Destination type</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => set('destination_type', 'camp')} className={`flex-1 py-2 rounded-md text-xs font-medium border ${line.destination_type !== 'manual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Camp</button>
                <button type="button" onClick={() => set('destination_type', 'manual')} className={`flex-1 py-2 rounded-md text-xs font-medium border ${line.destination_type === 'manual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Manual</button>
              </div>
            </div>
          </div>

          {line.destination_type === 'manual' ? (
            <div>
              <Label>Destination (manual)</Label>
              <Input value={line.destination_text} onChange={(e) => set('destination_text', e.target.value)} placeholder="e.g. Buyer, Capture boma, Other farm" />
            </div>
          ) : (
            <div>
              <Label>Move to (camp)</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={line.to_camp_id} onChange={(e) => set('to_camp_id', e.target.value)} disabled={!line.from_camp_id}>
                <option value="">— Select destination —</option>
                {destCamps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {line.type === 'bulk' ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Species</Label>
                <SpeciesSelect value={line.species} onChange={(v) => set('species', v)} required />
              </div>
              <div>
                <Label>Class</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={line.animal_class} onChange={(e) => set('animal_class', e.target.value)}>
                  <option value="">—</option>
                  {['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={line.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="10" />
              </div>
            </div>
          ) : (
            <div>
              <Label>Select tagged animals in source camp ({sourceAnimals.length})</Label>
              <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-md divide-y">
                {!line.from_camp_id && <p className="p-3 text-stone-400 text-sm italic">Select a source camp first</p>}
                {line.from_camp_id && sourceAnimals.length === 0 && <p className="p-3 text-stone-400 text-sm italic">No tagged animals in this camp</p>}
                {sourceAnimals.map((a) => (
                  <label key={a.id} className="flex items-center gap-2.5 p-2.5 text-sm">
                    <input type="checkbox" checked={line.animal_ids.includes(a.id)} onChange={() => toggleAnimal(a.id)} className="w-4 h-4" />
                    <span className="font-semibold">{a.tag_number}</span>
                    <span className="text-stone-500">{a.species} · {a.sex}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Line note</Label>
            <Textarea rows={2} value={line.note} onChange={(e) => set('note', e.target.value)} />
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={onRemove} className="flex items-center gap-1 text-xs text-red-500">
              <Trash2 className="w-3.5 h-3.5" /> Remove this line
            </button>
          </div>
        </div>
      )}
    </div>
  );
}