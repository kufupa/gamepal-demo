import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';

const CLASSES = ['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'];

export default function EditMovementDialog({ open, onOpenChange, movement, farms, camps, onDone }) {
  const [form, setForm] = useState(null);
  const [destType, setDestType] = useState('camp');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => (f ? { ...f, [k]: v } : f));

  useEffect(() => {
    if (!movement) return;
    const dt = movement.destination_type || (movement.to_camp_id ? 'camp' : 'manual');
    setDestType(dt);
    setForm({
      from_camp_id: movement.from_camp_id || '',
      to_camp_id: movement.to_camp_id || '',
      destination_text: movement.destination_text || '',
      species: movement.species || '',
      animal_class: movement.animal_class || '',
      quantity: movement.quantity ?? '',
      date: movement.date || new Date().toISOString().slice(0, 10),
      note: movement.note || '',
    });
  }, [movement]);

  if (!form || !movement) return null;

  const submit = async () => {
    setSaving(true);
    try {
      const fromCamp = camps.find((c) => c.id === form.from_camp_id);
      const toCamp = camps.find((c) => c.id === form.to_camp_id);
      const manual = destType === 'manual';
      const payload = {
        id: movement.id,
        date: form.date,
        from_farm_id: fromCamp?.farm_id,
        from_camp_id: form.from_camp_id,
        destination_type: destType,
        to_farm_id: manual ? null : toCamp?.farm_id,
        to_camp_id: manual ? null : form.to_camp_id,
        destination_text: manual ? form.destination_text : null,
        note: form.note,
      };
      if (movement.type === 'bulk') {
        payload.species = form.species;
        payload.animal_class = form.animal_class;
        payload.quantity = Number(form.quantity);
      }
      const res = await base44.functions.invoke('editMovement', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Edit failed');
    } finally {
      setSaving(false);
    }
  };

  const manual = destType === 'manual';
  const canSubmit = form.from_camp_id && (manual ? form.destination_text : form.to_camp_id) &&
    (!manual && form.from_camp_id === form.to_camp_id ? false : true) &&
    (movement.type === 'individual' || (form.species && form.animal_class && Number(form.quantity) > 0));

  const campLabel = (c) => `${farms.find((f) => f.id === c.farm_id)?.name || '?'} → ${c.name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Movement ({movement.type === 'bulk' ? 'Bulk' : 'Individual'})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>From (source camp)</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.from_camp_id} onChange={(e) => set('from_camp_id', e.target.value)}>
              <option value="">— Select —</option>
              {camps.map((c) => <option key={c.id} value={c.id}>{campLabel(c)}</option>)}
            </select>
          </div>

          <div>
            <Label>Destination type</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDestType('camp')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${destType === 'camp' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Existing Farm/Camp</button>
              <button type="button" onClick={() => setDestType('manual')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${destType === 'manual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Manual Destination</button>
            </div>
          </div>

          {manual ? (
            <div>
              <Label>Destination (manual)</Label>
              <Input value={form.destination_text} onChange={(e) => set('destination_text', e.target.value)} placeholder="e.g. Vaalwater Auction, Buyer, Capture boma" />
            </div>
          ) : (
            <div>
              <Label>To (destination camp)</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.to_camp_id} onChange={(e) => set('to_camp_id', e.target.value)}>
                <option value="">— Select —</option>
                {camps.map((c) => <option key={c.id} value={c.id}>{campLabel(c)}</option>)}
              </select>
            </div>
          )}

          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          {movement.type === 'bulk' && (
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
                <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
              </div>
            </>
          )}
          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            Editing reverses the old movement and applies the corrected one, so camp totals stay accurate.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !canSubmit} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}