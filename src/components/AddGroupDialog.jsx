import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';

const CLASSES = ['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'];

export default function AddGroupDialog({ open, onOpenChange, camp, farm, onDone }) {
  const [form, setForm] = useState({ species: '', animal_class: 'Females', quantity: '', from_source: '', date: new Date().toISOString().slice(0, 10), note: '' });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.species || !form.quantity) return;
    setSaving(true);
    try {
      await base44.entities.Group.create({
        camp_id: camp.id,
        farm_id: camp.farm_id,
        species: form.species,
        animal_class: form.animal_class,
        quantity: Number(form.quantity),
        from_source: form.from_source,
        date: form.date,
        note: form.note,
      });
      onDone?.();
      onOpenChange(false);
      setForm({ species: '', animal_class: 'Females', quantity: '', from_source: '', date: new Date().toISOString().slice(0, 10), note: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Group — {camp?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Species</Label>
            <SpeciesSelect value={form.species} onChange={(v) => set('species', v)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Class</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.animal_class} onChange={(e) => set('animal_class', e.target.value)}>
                {CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From / Source</Label>
              <Input value={form.from_source} onChange={(e) => set('from_source', e.target.value)} placeholder="Purchase / born here" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.species || !form.quantity} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : 'Add Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}