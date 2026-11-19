import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';

const CLASSES = ['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'];

export default function AddPlannedMovementDialog({ open, onOpenChange, farms = [], camps = [], animals = [], plan = null, onDone }) {
  const [mode, setMode] = useState('bulk');
  const [destType, setDestType] = useState('camp');
  const [form, setForm] = useState({
    priority: '', from_camp_id: '', to_camp_id: '', destination_text: '',
    species: '', animal_class: '', quantity: '', note: '', selected: [],
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isEdit = !!plan;

  useEffect(() => {
    if (!open) return;
    if (plan) {
      setMode(plan.type || 'bulk');
      setDestType(plan.destination_type || 'camp');
      setForm({
        priority: plan.priority ?? '',
        from_camp_id: plan.from_camp_id || '',
        to_camp_id: plan.to_camp_id || '',
        destination_text: plan.destination_text || '',
        species: plan.species || '',
        animal_class: plan.animal_class || '',
        quantity: plan.quantity ?? '',
        note: plan.note || '',
        selected: plan.animal_ids || [],
      });
    } else {
      setMode('bulk');
      setDestType('camp');
      setForm({ priority: '', from_camp_id: '', to_camp_id: '', destination_text: '', species: '', animal_class: '', quantity: '', note: '', selected: [] });
    }
  }, [open, plan]);

  const sourceCamp = camps.find((c) => c.id === form.from_camp_id);
  const sourceFarmId = sourceCamp?.farm_id || '';
  const destCamps = camps.filter((c) => c.id !== form.from_camp_id);
  const sourceAnimals = animals.filter((a) => a.current_camp_id === form.from_camp_id && a.status !== 'Deceased');

  const toggle = (id) => setForm((f) => ({
    ...f,
    selected: f.selected.includes(id) ? f.selected.filter((x) => x !== id) : [...f.selected, id],
  }));

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        status: 'Planned',
        type: mode,
        priority: form.priority === '' ? null : Number(form.priority),
        from_farm_id: sourceFarmId,
        from_camp_id: form.from_camp_id,
        destination_type: destType,
        to_farm_id: destType === 'camp' ? (camps.find((c) => c.id === form.to_camp_id)?.farm_id || null) : null,
        to_camp_id: destType === 'camp' ? form.to_camp_id : null,
        destination_text: destType === 'manual' ? form.destination_text : null,
        note: form.note || '',
      };
      if (mode === 'bulk') {
        payload.species = form.species;
        payload.animal_class = form.animal_class;
        payload.quantity = Number(form.quantity) || 0;
      } else {
        payload.animal_ids = form.selected;
        payload.animal_tags = animals.filter((a) => form.selected.includes(a.id)).map((a) => a.tag_number);
      }

      if (isEdit) {
        await base44.entities.PlannedMovement.update(plan.id, payload);
      } else {
        await base44.entities.PlannedMovement.create(payload);
      }
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = form.from_camp_id && Number(form.priority) > 0 && (
    destType === 'manual' ? form.destination_text : form.to_camp_id
  ) && (mode === 'bulk' ? form.species && form.animal_class && form.quantity : form.selected.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Planned Movement' : 'Add Planned Movement'}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-stone-500 bg-amber-50 border border-amber-200 rounded-md p-2 -mt-1">
          Planned movements do not change any live animal totals until completed.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setMode('bulk')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'bulk' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Bulk Group</button>
          <button onClick={() => setMode('individual')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'individual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Tagged Animals</button>
        </div>
        <div className="space-y-3">
          <div>
            <Label>From (source camp)</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.from_camp_id} onChange={(e) => set('from_camp_id', e.target.value)}>
              <option value="">— Select source —</option>
              {camps.map((c) => <option key={c.id} value={c.id}>{c.name} ({farms.find((f) => f.id === c.farm_id)?.name || ''})</option>)}
            </select>
          </div>

          <div>
            <Label>Destination type</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDestType('camp')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${destType === 'camp' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Existing Farm/Camp</button>
              <button type="button" onClick={() => setDestType('manual')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${destType === 'manual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Manual Destination</button>
            </div>
          </div>

          {destType === 'camp' ? (
            <div>
              <Label>To (destination camp)</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.to_camp_id} onChange={(e) => set('to_camp_id', e.target.value)} disabled={!form.from_camp_id}>
                <option value="">— Select destination —</option>
                {destCamps.map((c) => <option key={c.id} value={c.id}>{c.name} ({farms.find((f) => f.id === c.farm_id)?.name || ''})</option>)}
              </select>
            </div>
          ) : (
            <div>
              <Label>Destination (manual)</Label>
              <Input value={form.destination_text} onChange={(e) => set('destination_text', e.target.value)} placeholder="e.g. Vaalwater Auction, Buyer, Capture boma" />
            </div>
          )}

          <div>
            <Label>Priority *</Label>
            <Input type="number" min="1" value={form.priority} onChange={(e) => set('priority', e.target.value)} placeholder="1" />
            <p className="text-[11px] text-stone-500 mt-1">Priority 1 is handled first. Movements sharing a priority move together as one batch.</p>
          </div>

          {mode === 'bulk' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Species</Label>
                  <SpeciesSelect value={form.species} onChange={(v) => set('species', v)} required />
                </div>
                <div>
                  <Label>Class</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.animal_class} onChange={(e) => set('animal_class', e.target.value)}>
                    <option value="">—</option>
                    {CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="10" />
              </div>
            </>
          ) : (
            <div>
              <Label>Select tagged animals in source camp ({sourceAnimals.length})</Label>
              <div className="max-h-44 overflow-y-auto border border-stone-200 rounded-md divide-y">
                {!form.from_camp_id && <p className="p-3 text-stone-400 text-sm italic">Select a source camp first</p>}
                {form.from_camp_id && sourceAnimals.length === 0 && <p className="p-3 text-stone-400 text-sm italic">No tagged animals in this camp</p>}
                {sourceAnimals.map((a) => (
                  <label key={a.id} className="flex items-center gap-2.5 p-2.5 text-sm">
                    <input type="checkbox" checked={form.selected.includes(a.id)} onChange={() => toggle(a.id)} className="w-4 h-4" />
                    <span className="font-semibold">{a.tag_number}</span>
                    <span className="text-stone-500">{a.species} · {a.sex}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Notes / Reason / Comments</Label>
            <Textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !canSubmit} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : (isEdit ? 'Save Plan' : 'Add Plan')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}