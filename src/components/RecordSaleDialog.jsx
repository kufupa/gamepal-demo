import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';
import TaggedAnimalPicker from '@/components/TaggedAnimalPicker';

const CLASSES = ['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'];

export default function RecordSaleDialog({ open, onOpenChange, farms = [], camps = [], animals = [], onDone }) {
  const [mode, setMode] = useState('bulk');
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    farm_id: '', camp_id: '', species: '', animal_class: '', quantity: '',
    unit_price: '', total_price: '', sale_type: '', sold_at: '', notes: '',
  });
  const [tagMeta, setTagMeta] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const campObj = camps.find((c) => c.id === form.camp_id);
  const filteredCamps = form.farm_id ? camps.filter((c) => c.farm_id === form.farm_id) : camps;
  const bulkTotal = (Number(form.unit_price) || 0) * (Number(form.quantity) || 0);
  const tagQty = tagMeta?.quantity || 0;
  const tagTotal = (Number(form.unit_price) || 0) * tagQty;

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        type: mode, date: form.date, notes: form.notes, sale_type: form.sale_type, sold_at: form.sold_at,
        unit_price: Number(form.unit_price) || 0, total_price: Number(form.total_price) || 0,
      };
      if (mode === 'bulk') {
        payload.farm_id = campObj?.farm_id || form.farm_id;
        payload.camp_id = form.camp_id;
        payload.species = form.species;
        payload.animal_class = form.animal_class;
        payload.quantity = Number(form.quantity);
      } else {
        payload.animal_ids = tagMeta?.animal_ids || [];
        payload.camp_id = tagMeta?.camp_id || '';
        payload.farm_id = tagMeta?.farm_id || '';
        payload.species = tagMeta?.species || '';
        payload.quantity = tagQty;
      }
      const res = await base44.functions.invoke('recordSale', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      onDone?.();
      onOpenChange(false);
      setForm({ date: new Date().toISOString().slice(0, 10), farm_id: '', camp_id: '', species: '', animal_class: '', quantity: '', unit_price: '', total_price: '', sale_type: '', sold_at: '', notes: '' });
      setTagMeta(null);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Sale failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = mode === 'bulk'
    ? form.camp_id && form.species && form.quantity && Number(form.quantity) > 0 && form.sale_type
    : tagQty > 0 && form.unit_price && form.sale_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Sale</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setMode('bulk')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'bulk' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Bulk / Untagged</button>
          <button onClick={() => setMode('individual')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'individual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Tagged Animals</button>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>

          {mode === 'bulk' ? (
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
                    {filteredCamps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                    <option value="">—</option>
                    {CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Quantity sold</Label>
                <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="5" />
              </div>
              <div>
                <Label>Price per animal (R)</Label>
                <Input type="number" value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Total sale price (R) — auto-calculated, override if needed</Label>
                <Input type="number" value={form.total_price} onChange={(e) => set('total_price', e.target.value)} placeholder={bulkTotal > 0 ? String(bulkTotal) : '0.00'} />
              </div>
            </>
          ) : (
            <>
              <TaggedAnimalPicker farms={farms} camps={camps} animals={animals} onChange={setTagMeta} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price per animal (R)</Label>
                  <Input type="number" value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Total sale price (R)</Label>
                  <Input type="number" value={form.total_price} onChange={(e) => set('total_price', e.target.value)} placeholder={tagTotal > 0 ? String(tagTotal) : '0.00'} />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sale Type *</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.sale_type} onChange={(e) => set('sale_type', e.target.value)}>
                <option value="">— Select —</option>
                <option value="Auction">Auction</option>
                <option value="Private Sale">Private Sale</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label>Sold At / Buyer</Label>
              <Input value={form.sold_at} onChange={(e) => set('sold_at', e.target.value)} placeholder="Auction, buyer, dealer…" />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            Live camp populations update automatically. Tagged animals are marked Sold (record & pedigree kept) and — if counted in a bulk group — that group drops by one per animal, never double-counted.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !canSubmit} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : 'Record Sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}