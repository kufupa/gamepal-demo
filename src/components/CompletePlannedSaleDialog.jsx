import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import TaggedAnimalPicker from '@/components/TaggedAnimalPicker';

// Completes a Planned Sale: the admin confirms or corrects the actual sale
// details (including adding/removing tagged animals), then a real Live Sale is
// recorded (populations deducted, tagged animals marked sold, revenue booked)
// and the plan is marked Completed. Supports multiple tagged animals.
export default function CompletePlannedSaleDialog({ open, onOpenChange, plan, finance = null, farms = [], camps = [], animals = [], onDone }) {
  const [form, setForm] = useState({});
  const [tagMeta, setTagMeta] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isBulk = plan?.type === 'bulk';
  const planIds = plan && !isBulk
    ? (Array.isArray(plan.animal_ids) && plan.animal_ids.length > 0 ? plan.animal_ids : (plan.animal_id ? [plan.animal_id] : []))
    : [];

  useEffect(() => {
    if (!open || !plan) return;
    setForm({
      date: new Date().toISOString().slice(0, 10),
      farm_id: plan.farm_id || '',
      camp_id: plan.camp_id || '',
      species: plan.species || '',
      animal_class: plan.animal_class || '',
      quantity: plan.quantity ?? '',
      unit_price: finance?.target_price ?? '',
      total_price: (plan.type === 'bulk' ? (finance?.expected_total ?? '') : (finance?.target_price ?? '')),
      sale_type: plan.sale_type || '',
      sold_at: plan.buyer_venue || '',
      notes: plan.notes || '',
    });
    setTagMeta(!isBulk
      ? { animal_ids: planIds, animal_tags: plan.animal_tags || [], camp_id: plan.camp_id || '', farm_id: plan.farm_id || '', species: plan.species || '', quantity: planIds.length }
      : null
    );
  }, [open, plan]);

  if (!plan) return null;
  const campObj = camps.find((c) => c.id === form.camp_id);
  const filteredCamps = form.farm_id ? camps.filter((c) => c.farm_id === form.farm_id) : camps;
  const qty = isBulk ? (Number(form.quantity) || 0) : (tagMeta?.quantity || 0);
  const unit = Number(form.unit_price) || 0;
  const autoTotal = qty * unit;

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        id: plan.id,
        date: form.date,
        animal_class: form.animal_class || '',
        unit_price: unit,
        total_price: Number(form.total_price) || 0,
        sale_type: form.sale_type || '',
        sold_at: form.sold_at || '',
        notes: form.notes || '',
      };
      if (isBulk) {
        payload.farm_id = campObj?.farm_id || form.farm_id || '';
        payload.camp_id = form.camp_id;
        payload.species = form.species;
        payload.quantity = qty;
      } else {
        payload.animal_ids = tagMeta?.animal_ids || [];
        payload.camp_id = tagMeta?.camp_id || '';
        payload.farm_id = tagMeta?.farm_id || '';
        payload.species = tagMeta?.species || '';
        payload.quantity = qty;
      }
      const res = await base44.functions.invoke('completePlannedSale', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Complete failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = isBulk
    ? form.date && form.camp_id && form.species && qty > 0
    : form.date && qty > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Sale</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2 -mt-1">
          Confirm or correct the actual sale details. Completing records the live sale, deducts the animals and adds the revenue.
        </p>
        <div className="space-y-3">
          <div>
            <Label>Actual Sale Date</Label>
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>

          {isBulk ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Farm</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.farm_id} onChange={(e) => { set('farm_id', e.target.value); set('camp_id', ''); }}>
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
                  <Input value={form.species} onChange={(e) => set('species', e.target.value)} />
                </div>
                <div>
                  <Label>Class</Label>
                  <Input value={form.animal_class} onChange={(e) => set('animal_class', e.target.value)} placeholder="Class" />
                </div>
              </div>
              <div>
                <Label>Actual Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
              </div>
            </>
          ) : (
            <TaggedAnimalPicker
              farms={farms} camps={camps} animals={animals}
              initialFarmId={plan.farm_id} initialCampId={plan.camp_id} initialSpecies={plan.species} initialIds={planIds}
              onChange={setTagMeta}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Actual Price per Animal (R)</Label>
              <Input type="number" value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} />
            </div>
            <div>
              <Label>Actual Total (R) — auto, override if needed</Label>
              <Input type="number" value={form.total_price} onChange={(e) => set('total_price', e.target.value)} placeholder={autoTotal > 0 ? String(autoTotal) : '0'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Actual Sale Type</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.sale_type} onChange={(e) => set('sale_type', e.target.value)}>
                <option value="Auction">Auction</option>
                <option value="Private Sale">Private Sale</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label>Actual Auction / Buyer / Venue</Label>
              <Input value={form.sold_at} onChange={(e) => set('sold_at', e.target.value)} placeholder="Auction, buyer, dealer…" />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !canSubmit} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Completing…' : 'Confirm & Complete Sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}