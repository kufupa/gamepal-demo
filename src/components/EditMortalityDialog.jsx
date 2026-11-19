import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';

const CLASSES = ['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'];

export default function EditMortalityDialog({ open, onOpenChange, mortality, farms, camps, onDone }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => (f ? { ...f, [k]: v } : f));

  useEffect(() => {
    if (!mortality) return;
    setForm({
      farm_id: mortality.farm_id || '',
      camp_id: mortality.camp_id || '',
      species: mortality.species || '',
      animal_class: mortality.animal_class || '',
      quantity: mortality.quantity ?? '',
      date: mortality.date || new Date().toISOString().slice(0, 10),
      cause: mortality.cause || '',
      notes: mortality.notes || '',
    });
  }, [mortality]);

  if (!form || !mortality) return null;

  const campOptions = camps.filter((c) => !form.farm_id || c.farm_id === form.farm_id);

  const submit = async () => {
    setSaving(true);
    try {
      const payload = { id: mortality.id, date: form.date, cause: form.cause, notes: form.notes };
      if (mortality.type === 'bulk') {
        const camp = camps.find((c) => c.id === form.camp_id);
        payload.farm_id = camp?.farm_id || form.farm_id;
        payload.camp_id = form.camp_id;
        payload.species = form.species;
        payload.animal_class = form.animal_class;
        payload.quantity = Number(form.quantity);
      }
      const res = await base44.functions.invoke('editMortality', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Edit failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = mortality.type === 'individual' ? !!form.date : !!form.camp_id && !!form.species && Number(form.quantity) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Mortality ({mortality.type === 'bulk' ? 'Bulk' : 'Individual'})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {mortality.type === 'bulk' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Farm</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.farm_id} onChange={(e) => set('farm_id', e.target.value)}>
                    <option value="">— Select —</option>
                    {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Camp</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.camp_id} onChange={(e) => set('camp_id', e.target.value)}>
                    <option value="">— Select —</option>
                    {campOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Species</Label>
                  <SpeciesSelect value={form.species} onChange={(v) => set('species', v)} required />
                </div>
                <div>
                  <Label>Class</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.animal_class} onChange={(e) => set('animal_class', e.target.value)}>
                    {CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Number dead</Label>
                <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
              </div>
            </>
          ) : (
            <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-md p-2">
              Individual mortality for <b>{mortality.animal_tag}</b> · {mortality.species}. The animal record stays linked; edit date, cause and notes below.
            </p>
          )}
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <Label>Cause</Label>
            <Input value={form.cause} onChange={(e) => set('cause', e.target.value)} placeholder="e.g. Predator, disease" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            Editing reverses the old mortality and applies the corrected record, so live populations stay accurate.
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