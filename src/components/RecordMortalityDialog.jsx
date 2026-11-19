import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';

const CLASSES = ['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'];

export default function RecordMortalityDialog({ open, onOpenChange, camp, onDone }) {
  const [mode, setMode] = useState('bulk');
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({
    farm_id: '', camp_id: camp?.id || '', species: '', animal_class: 'Females',
    quantity: '', date: new Date().toISOString().slice(0, 10),
    animal_id: '', cause: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    (async () => {
      setFarms(await base44.entities.Farm.list('-created_date', 100));
      setCamps(await base44.entities.Camp.list('-created_date', 200));
      setAnimals(await base44.entities.Animal.filter({ status: 'Alive' }, '-created_date', 500));
    })();
  }, [open]);

  const selectedAnimal = animals.find((a) => a.id === form.animal_id) || null;
  const campFarms = farms;
  const campOptions = camps.filter((c) => !form.farm_id || c.farm_id === form.farm_id);
  const filteredAnimals = animals.filter((a) =>
    !q || a.tag_number.toLowerCase().includes(q.toLowerCase())
  );

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        type: mode, date: form.date, cause: form.cause, notes: form.notes,
        camp_id: mode === 'bulk' ? form.camp_id : (selectedAnimal?.current_camp_id || form.camp_id),
      };
      if (mode === 'bulk') {
        payload.farm_id = form.farm_id;
        payload.species = form.species;
        payload.animal_class = form.animal_class;
        payload.quantity = Number(form.quantity);
      } else {
        payload.animal_id = form.animal_id;
        payload.species = selectedAnimal?.species || '';
      }
      const res = await base44.functions.invoke('recordMortality', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      onDone?.();
      onOpenChange(false);
      setForm({ farm_id: '', camp_id: camp?.id || '', species: '', animal_class: 'Females', quantity: '', date: new Date().toISOString().slice(0, 10), animal_id: '', cause: '', notes: '' });
      setQ('');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Mortality failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = mode === 'bulk'
    ? form.camp_id && form.species && form.quantity > 0
    : !!form.animal_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Mortality</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setMode('bulk')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'bulk' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Bulk / Untagged</button>
          <button onClick={() => setMode('individual')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'individual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Tagged Individual</button>
        </div>
        <div className="space-y-3">
          {mode === 'bulk' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Farm</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.farm_id} onChange={(e) => set('farm_id', e.target.value)}>
                    <option value="">— Select —</option>
                    {campFarms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Number dead</Label>
                  <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="3" />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Search tagged animal</Label>
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tag number…" className="w-full h-10 pl-9 pr-3 rounded-md border border-stone-200 bg-white text-sm" />
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto border border-stone-200 rounded-md divide-y">
                  {filteredAnimals.length === 0 && <p className="p-3 text-stone-400 text-sm italic">No animals</p>}
                  {filteredAnimals.map((a) => (
                    <button key={a.id} type="button" onClick={() => set('animal_id', a.id)} className={`w-full text-left p-2.5 text-sm ${form.animal_id === a.id ? 'bg-stone-100' : 'bg-white'}`}>
                      <span className="font-semibold">{a.tag_number}</span>{' '}
                      <span className="text-stone-500">{a.species} · {a.sex}</span>
                    </button>
                  ))}
                </div>
              </div>
              {selectedAnimal && (
                <div className="bg-stone-50 border border-stone-200 rounded-md p-2.5 text-xs space-y-0.5">
                  <p><b>Species:</b> {selectedAnimal.species}</p>
                  <p><b>Sex:</b> {selectedAnimal.sex}{selectedAnimal.is_breeding_male && ' · Breeding male'}</p>
                  <p><b>Current:</b> {farms.find((f) => f.id === selectedAnimal.current_farm_id)?.name || '—'} → {camps.find((c) => c.id === selectedAnimal.current_camp_id)?.name || '—'}</p>
                </div>
              )}
              <div>
                <Label>Date of death</Label>
                <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
              </div>
            </>
          )}
          <div>
            <Label>Cause (optional)</Label>
            <Input value={form.cause} onChange={(e) => set('cause', e.target.value)} placeholder="e.g. Predator, disease" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            {mode === 'bulk'
              ? 'Reduces the live population of the selected group. The mortality record is permanent.'
              : 'Marks the animal Deceased and reduces its group by 1 (if it was part of one). The full animal record, pedigree and history are retained.'}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !canSubmit} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : 'Record Mortality'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}