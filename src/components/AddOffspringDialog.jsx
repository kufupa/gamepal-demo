import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';
import ParentSelect from '@/components/ParentSelect';

export default function AddOffspringDialog({ open, onOpenChange, camp, farm, sires = [], dams = [], onDone }) {
  const [form, setForm] = useState({
    tag_number: '', species: '', sex: 'Female', date_of_birth: '',
    sire_id: '', sire_manual: '', dam_id: '', dam_manual: '', notes: '', purchase_price: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const hasSire = !!(form.sire_id || form.sire_manual);

  const submit = async () => {
    if (!form.tag_number || !form.species || !hasSire) return;
    setSaving(true);
    try {
      const created = await base44.entities.Animal.create({
        tag_number: form.tag_number,
        species: form.species,
        sex: form.sex,
        date_of_birth: form.date_of_birth,
        current_farm_id: camp.farm_id,
        current_camp_id: camp.id,
        origin_farm_id: camp.farm_id,
        origin_camp_id: camp.id,
        sire_id: form.sire_id || '',
        sire_manual: form.sire_manual || '',
        dam_id: form.dam_id || '',
        dam_manual: form.dam_manual || '',
        notes: form.notes,
      });
      if (form.purchase_price !== '') {
        await base44.entities.AnimalPurchaseFinance.create({
          animal_id: created.id,
          purchase_price: Number(form.purchase_price),
          purchase_notes: '',
        });
      }
      onDone?.();
      onOpenChange(false);
      setForm({ tag_number: '', species: '', sex: 'Female', date_of_birth: '', sire_id: '', sire_manual: '', dam_id: '', dam_manual: '', notes: '', purchase_price: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Tagged Offspring — {camp?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tag Number</Label>
              <Input value={form.tag_number} onChange={(e) => set('tag_number', e.target.value)} placeholder="B6" />
            </div>
            <div>
              <Label>Species</Label>
              <SpeciesSelect value={form.species} onChange={(v) => set('species', v)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sex</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.sex} onChange={(e) => set('sex', e.target.value)}>
                <option>Female</option>
                <option>Male</option>
              </select>
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Purchase Price (R, optional)</Label>
            <Input type="number" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} placeholder="e.g. 35000" />
          </div>
          <ParentSelect label="Sire" candidates={sires} parentId={form.sire_id} parentManual={form.sire_manual} onChange={(id, manual) => { set('sire_id', id); set('sire_manual', manual); }} required />
          <ParentSelect label="Dam" candidates={dams} parentId={form.dam_id} parentManual={form.dam_manual} onChange={(id, manual) => { set('dam_id', id); set('dam_manual', manual); }} />
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            This offspring is placed in <b>{camp?.name}</b>. If you select an existing tagged sire, the offspring is automatically linked and appears under that sire's tagged offspring.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.tag_number || !form.species || !hasSire} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : 'Record Offspring'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}