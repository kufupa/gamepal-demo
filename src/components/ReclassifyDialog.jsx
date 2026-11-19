import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';

const CLASSES = ['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'];

export default function ReclassifyDialog({ open, onOpenChange, camp, onDone }) {
  const [groups, setGroups] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [form, setForm] = useState({ species: '', from_class: 'Offspring', to_class: 'Females', quantity: '', selected: [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open || !camp) return;
    (async () => {
      setGroups(await base44.entities.Group.filter({ camp_id: camp.id }, '-created_date', 200));
      setAnimals(await base44.entities.Animal.filter({ current_camp_id: camp.id, status: 'Alive' }, '-created_date', 200));
    })();
  }, [open, camp]);

  const speciesOptions = [...new Set(groups.map((g) => g.species))];
  const fromTotal = groups
    .filter((g) => g.species === form.species && g.animal_class === form.from_class)
    .reduce((s, g) => s + (g.quantity || 0), 0);
  const taggedInSpecies = animals.filter((a) => a.species === form.species);

  const toggle = (id) => setForm((f) => ({
    ...f,
    selected: f.selected.includes(id) ? f.selected.filter((x) => x !== id) : [...f.selected, id],
  }));

  const submit = async () => {
    if (!form.species || !form.from_class || !form.to_class || form.from_class === form.to_class) return;
    if (Number(form.quantity) > fromTotal) { alert(`Only ${fromTotal} ${form.from_class} available.`); return; }
    setSaving(true);
    try {
      await base44.functions.invoke('reclassifyOffspring', {
        camp_id: camp.id,
        species: form.species,
        from_class: form.from_class,
        to_class: form.to_class,
        quantity: Number(form.quantity) || 0,
        animal_ids: form.selected,
      });
      onDone?.();
      onOpenChange(false);
      setForm({ species: '', from_class: 'Offspring', to_class: 'Females', quantity: '', selected: [] });
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Reclassify failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reclassify — {camp?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Species</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.species} onChange={(e) => set('species', e.target.value)}>
              <option value="">— Select —</option>
              {speciesOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From class</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.from_class} onChange={(e) => set('from_class', e.target.value)}>
                {CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>To class</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.to_class} onChange={(e) => set('to_class', e.target.value)}>
                {CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Quantity to reclassify (available: {fromTotal})</Label>
            <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="e.g. 8" />
          </div>
          {form.species && taggedInSpecies.length > 0 && (
            <div>
              <Label>Also reclassify tagged individuals (optional)</Label>
              <div className="max-h-40 overflow-y-auto border border-stone-200 rounded-md divide-y">
                {taggedInSpecies.map((a) => (
                  <label key={a.id} className="flex items-center gap-2.5 p-2.5 text-sm">
                    <input type="checkbox" checked={form.selected.includes(a.id)} onChange={() => toggle(a.id)} className="w-4 h-4" />
                    <span className="font-semibold">{a.tag_number}</span>
                    <span className="text-stone-500">{a.sex === 'Male' ? '♂' : '♀'} {a.sex}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            Moves animals from one class to another within the same camp & species. The total population stays the same — no animals are added, sold, moved or lost.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.species || form.from_class === form.to_class} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : 'Reclassify'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}