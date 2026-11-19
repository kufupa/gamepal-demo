import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SpeciesSelect from '@/components/SpeciesSelect';

const CLASSES = ['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export default function HuntLineItemDialog({ open, onOpenChange, initial, farmId, camps = [], animals = [], onSave }) {
  const [form, setForm] = useState(null);
  const [mode, setMode] = useState('bulk');

  useEffect(() => {
    if (!open) return;
    const isTagged = initial && Array.isArray(initial.animal_ids) && initial.animal_ids.length > 0;
    setMode(isTagged ? 'tagged' : 'bulk');
    setForm({
      id: initial?.id || uid(),
      camp_id: initial?.camp_id || '',
      species: initial?.species || '',
      animal_class: initial?.animal_class || '',
      quantity: initial?.quantity ?? '',
      animal_ids: initial?.animal_ids || [],
      unit_price: initial?.unit_price ?? '',
      line_total: initial?.line_total ?? '',
      notes: initial?.notes || '',
    });
  }, [open, initial]);

  if (!form) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const filteredCamps = farmId ? camps.filter((c) => c.farm_id === farmId) : camps;
  const campName = (id) => camps.find((c) => c.id === id)?.name || '—';
  const liveAnimals = animals.filter((a) => a.status === 'Alive');
  const selectable = liveAnimals.filter((a) => {
    if (form.camp_id && a.current_camp_id !== form.camp_id) return false;
    if (form.species && a.species !== form.species) return false;
    return true;
  });
  // Keep already-selected tagged animals visible even if they no longer match (for edit).
  const existingTagged = (initial?.animal_ids || []).map((id) => animals.find((a) => a.id === id)).filter(Boolean);
  const merged = [...selectable];
  for (const a of existingTagged) if (!merged.find((x) => x.id === a.id)) merged.push(a);

  const qty = mode === 'tagged' ? form.animal_ids.length : (Number(form.quantity) || 0);
  const autoTotal = (Number(form.unit_price) || 0) * qty;

  const toggleAnimal = (id) => {
    setForm((f) => {
      const has = f.animal_ids.includes(id);
      return { ...f, animal_ids: has ? f.animal_ids.filter((x) => x !== id) : [...f.animal_ids, id] };
    });
  };

  const save = () => {
    const out = {
      id: form.id,
      camp_id: form.camp_id,
      species: form.species,
      animal_class: form.animal_class,
      unit_price: Number(form.unit_price) || 0,
      line_total: (Number(form.line_total) > 0) ? Number(form.line_total) : autoTotal,
      notes: form.notes,
    };
    if (mode === 'tagged') {
      out.animal_ids = form.animal_ids;
      out.animal_tags = form.animal_ids.map((id) => animals.find((a) => a.id === id)?.tag_number).filter(Boolean);
      out.quantity = form.animal_ids.length;
    } else {
      out.animal_ids = [];
      out.animal_tags = [];
      out.quantity = Number(form.quantity) || 0;
    }
    onSave(out);
    onOpenChange(false);
  };

  const canSubmit = form.camp_id && form.species && (mode === 'tagged' ? form.animal_ids.length > 0 : Number(form.quantity) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial && initial.id ? 'Edit' : 'Add'} Hunted Animal</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setMode('bulk')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'bulk' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Bulk / Untagged</button>
          <button onClick={() => setMode('tagged')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'tagged' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Tagged Individual(s)</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Camp</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.camp_id} onChange={(e) => set('camp_id', e.target.value)}>
                <option value="">— Select —</option>
                {filteredCamps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Species</Label>
              <SpeciesSelect value={form.species} onChange={(v) => set('species', v)} required />
            </div>
          </div>
          <div>
            <Label>Class</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.animal_class} onChange={(e) => set('animal_class', e.target.value)}>
              <option value="">—</option>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {mode === 'bulk' ? (
            <div>
              <Label>Quantity hunted</Label>
              <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="1" />
            </div>
          ) : (
            <div>
              <Label>Select tagged animal(s) — {form.animal_ids.length} selected</Label>
              <div className="border border-stone-200 rounded-md max-h-40 overflow-y-auto divide-y divide-stone-100">
                {merged.length === 0 ? (
                  <p className="text-xs text-stone-400 p-3 text-center">No live tagged animals in this camp/species.</p>
                ) : merged.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50">
                    <input type="checkbox" checked={form.animal_ids.includes(a.id)} onChange={() => toggleAnimal(a.id)} className="w-4 h-4" />
                    <span className="font-medium text-stone-800">{a.tag_number}</span>
                    <span className="text-stone-500">{a.species} · {campName(a.current_camp_id)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price per animal (R)</Label>
              <Input type="number" value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Line total (R)</Label>
              <Input type="number" value={form.line_total} onChange={(e) => set('line_total', e.target.value)} placeholder={autoTotal > 0 ? String(autoTotal) : '0.00'} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            {mode === 'tagged'
              ? 'Tagged animals are marked Hunted (record & pedigree kept) and — if counted in a bulk group — that group drops by one. Bulk lines deduct from the matching camp group.'
              : 'Bulk line items deduct the quantity from the matching camp/group.'}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!canSubmit} className="bg-stone-900 text-stone-50 hover:bg-stone-800">{initial && initial.id ? 'Save' : 'Add'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}