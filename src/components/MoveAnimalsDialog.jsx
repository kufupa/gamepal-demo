import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';

export default function MoveAnimalsDialog({ open, onOpenChange, camp, farm, allCamps = [], campGroups = [], campAnimals = [], allAnimals = [], onDone, preselectedIds = [], movementEventId = null }) {
  const [mode, setMode] = useState(preselectedIds.length > 0 ? 'individual' : 'bulk');
  const [destType, setDestType] = useState('camp');
  const [form, setForm] = useState({
    from_camp_id: '', to_camp_id: '', destination_text: '', species: '', animal_class: '', quantity: '',
    date: new Date().toISOString().slice(0, 10), note: '', selected: preselectedIds,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const hasSourceCamp = !!camp;
  const sourceCampId = hasSourceCamp ? camp.id : form.from_camp_id;
  const sourceCamp = allCamps.find((c) => c.id === sourceCampId);
  const destCamps = allCamps.filter((c) => c.id !== sourceCampId);
  const sourceAnimals = (hasSourceCamp ? campAnimals : allAnimals.filter((a) => a.current_camp_id === sourceCampId)).filter((a) => a.status !== 'Deceased');

  const toggle = (id) => setForm((f) => ({
    ...f,
    selected: f.selected.includes(id) ? f.selected.filter((x) => x !== id) : [...f.selected, id],
  }));

  const submit = async () => {
    setSaving(true);
    try {
      const dest = allCamps.find((c) => c.id === form.to_camp_id);
      const manual = destType === 'manual';
      const payload = {
        type: mode,
        date: form.date,
        from_farm_id: sourceCamp?.farm_id,
        from_camp_id: sourceCampId,
        destination_type: destType,
        to_farm_id: manual ? null : dest?.farm_id,
        to_camp_id: manual ? null : form.to_camp_id,
        destination_text: manual ? form.destination_text : null,
        note: form.note,
        movement_event_id: movementEventId || null,
      };
      if (mode === 'bulk') {
        payload.species = form.species;
        payload.animal_class = form.animal_class;
        payload.quantity = Number(form.quantity);
      } else {
        payload.animal_ids = form.selected;
      }
      await base44.functions.invoke('recordMovement', payload);
      onDone?.();
      onOpenChange(false);
      setForm({ from_camp_id: '', to_camp_id: '', destination_text: '', species: '', animal_class: '', quantity: '', date: new Date().toISOString().slice(0, 10), note: '', selected: [] });
      setDestType('camp');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Movement failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = sourceCampId && (
    destType === 'manual' ? form.destination_text : form.to_camp_id
  ) && (mode === 'bulk' ? form.species && form.animal_class && form.quantity : form.selected.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Animals{camp ? ` — ${camp.name}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setMode('bulk')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'bulk' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Bulk Group</button>
          <button onClick={() => setMode('individual')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'individual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Tagged Animals</button>
        </div>
        <div className="space-y-3">
          {!hasSourceCamp && (
            <div>
              <Label>From (source camp)</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.from_camp_id} onChange={(e) => set('from_camp_id', e.target.value)}>
                <option value="">— Select source —</option>
                {allCamps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <Label>Destination type</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDestType('camp')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${destType === 'camp' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Existing Farm/Camp</button>
              <button type="button" onClick={() => setDestType('manual')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${destType === 'manual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Manual Destination</button>
            </div>
          </div>

          {destType === 'camp' ? (
            <div>
              <Label>Move to (camp)</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.to_camp_id} onChange={(e) => set('to_camp_id', e.target.value)} disabled={!sourceCampId}>
                <option value="">— Select destination —</option>
                {destCamps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <Label>Destination (manual)</Label>
              <Input value={form.destination_text} onChange={(e) => set('destination_text', e.target.value)} placeholder="e.g. Vaalwater Auction, Buyer, Capture boma" />
            </div>
          )}

          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
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
                    {['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Quantity to move</Label>
                <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="10" />
              </div>
            </>
          ) : (
            <div>
              <Label>Select tagged animals in source camp ({sourceAnimals.length})</Label>
              <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-md divide-y">
                {!sourceCampId && <p className="p-3 text-stone-400 text-sm italic">Select a source camp first</p>}
                {sourceCampId && sourceAnimals.length === 0 && <p className="p-3 text-stone-400 text-sm italic">No tagged animals in this camp</p>}
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
            <Label>Note / Reason</Label>
            <Textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            {destType === 'manual'
              ? 'Animals leave the source camp only. They are not added to any internal camp. Origin and parentage are never changed by a move.'
              : 'Camp numbers and animal locations update automatically. Origin and parentage are never changed by a move.'}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !canSubmit} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Moving…' : 'Confirm Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}