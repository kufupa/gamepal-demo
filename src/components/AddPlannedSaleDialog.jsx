import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';
import TaggedAnimalPicker from '@/components/TaggedAnimalPicker';

const CLASSES = ['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'];

// Records or edits a Planned Sale. Planning only — no camp totals, revenue or
// animal status change until the plan is completed. Supports multiple tagged
// animals in one tagged plan.
export default function AddPlannedSaleDialog({ open, onOpenChange, farms = [], camps = [], animals = [], plan = null, finance = null, onDone }) {
  const [mode, setMode] = useState('bulk');
  const [form, setForm] = useState({
    planned_date: '', farm_id: '', camp_id: '', species: '', animal_class: '', quantity: '',
    sale_type: '', buyer_venue: '', target_price: '', notes: '',
  });
  const [tagMeta, setTagMeta] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isEdit = !!plan;
  const editIds = plan && plan.type === 'individual'
    ? (Array.isArray(plan.animal_ids) && plan.animal_ids.length > 0 ? plan.animal_ids : (plan.animal_id ? [plan.animal_id] : []))
    : [];

  useEffect(() => {
    if (!open) return;
    if (plan) {
      setMode(plan.type || 'bulk');
      setForm({
        planned_date: plan.planned_date || '',
        farm_id: plan.farm_id || '',
        camp_id: plan.camp_id || '',
        species: plan.species || '',
        animal_class: plan.animal_class || '',
        quantity: plan.quantity ?? '',
        sale_type: plan.sale_type || '',
        buyer_venue: plan.buyer_venue || '',
        target_price: finance?.target_price ?? '',
        notes: plan.notes || '',
      });
      setTagMeta(plan.type === 'individual'
        ? { animal_ids: editIds, animal_tags: plan.animal_tags || [], camp_id: plan.camp_id || '', farm_id: plan.farm_id || '', species: plan.species || '', quantity: editIds.length }
        : null
      );
    } else {
      setMode('bulk');
      setForm({ planned_date: '', farm_id: '', camp_id: '', species: '', animal_class: '', quantity: '', sale_type: '', buyer_venue: '', target_price: '', notes: '' });
      setTagMeta(null);
    }
  }, [open, plan]);

  const campObj = camps.find((c) => c.id === form.camp_id);
  const filteredCamps = form.farm_id ? camps.filter((c) => c.farm_id === form.farm_id) : camps;
  const qty = mode === 'bulk' ? (Number(form.quantity) || 0) : (tagMeta?.quantity || 0);
  const target = Number(form.target_price) || 0;
  const expectedTotal = qty * target;

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        status: 'Planned',
        type: mode,
        planned_date: form.planned_date || null,
        sale_type: form.sale_type || '',
        buyer_venue: form.buyer_venue || '',
        notes: form.notes || '',
      };
      if (mode === 'bulk') {
        payload.farm_id = campObj?.farm_id || form.farm_id || '';
        payload.camp_id = form.camp_id;
        payload.species = form.species;
        payload.animal_class = form.animal_class || '';
        payload.quantity = qty;
      } else {
        payload.animal_ids = tagMeta?.animal_ids || [];
        payload.animal_tags = tagMeta?.animal_tags || [];
        payload.camp_id = tagMeta?.camp_id || '';
        payload.farm_id = tagMeta?.farm_id || '';
        payload.species = tagMeta?.species || '';
        payload.animal_id = (tagMeta?.animal_ids || [])[0] || '';
        payload.animal_tag = (tagMeta?.animal_tags || [])[0] || '';
        payload.quantity = qty;
      }
      let planId = plan?.id;
      if (isEdit) {
        await base44.entities.PlannedSale.update(plan.id, payload);
      } else {
        const created = await base44.entities.PlannedSale.create(payload);
        planId = created.id;
      }
      // Prices live in the protected finance record, never on the plan itself.
      const finPayload = { target_price: target || null, expected_total: expectedTotal || null };
      const existingFin = await base44.entities.PlannedSaleFinance.filter({ planned_sale_id: planId });
      if (existingFin[0]) await base44.entities.PlannedSaleFinance.update(existingFin[0].id, finPayload);
      else await base44.entities.PlannedSaleFinance.create({ planned_sale_id: planId, ...finPayload });
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = mode === 'bulk'
    ? form.camp_id && form.species && qty > 0 && form.sale_type
    : qty > 0 && form.sale_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Planned Sale' : 'Add Planned Sale'}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-stone-500 bg-amber-50 border border-amber-200 rounded-md p-2 -mt-1">
          A planned sale does not change any live totals, revenue or animal status until it is completed.
        </p>
        <div className="flex gap-2 mb-1">
          <button onClick={() => setMode('bulk')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'bulk' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Bulk / Untagged</button>
          <button onClick={() => setMode('individual')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${mode === 'individual' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Tagged Animals</button>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Planned Sale Date (optional)</Label>
            <Input type="date" value={form.planned_date} onChange={(e) => set('planned_date', e.target.value)} />
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
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="5" />
              </div>
            </>
          ) : (
            <TaggedAnimalPicker
              farms={farms} camps={camps} animals={animals}
              initialFarmId={plan?.farm_id} initialCampId={plan?.camp_id} initialSpecies={plan?.species} initialIds={editIds}
              onChange={setTagMeta}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Intended Sale Type *</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.sale_type} onChange={(e) => set('sale_type', e.target.value)}>
                <option value="">— Select —</option>
                <option value="Auction">Auction</option>
                <option value="Private Sale">Private Sale</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label>Intended Auction / Buyer / Venue</Label>
              <Input value={form.buyer_venue} onChange={(e) => set('buyer_venue', e.target.value)} placeholder="e.g. Thabazimbi Auction" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target Price per Animal (R)</Label>
              <Input type="number" value={form.target_price} onChange={(e) => set('target_price', e.target.value)} placeholder="5000" />
            </div>
            <div>
              <Label>Expected Total (R)</Label>
              <Input type="number" value={expectedTotal || ''} readOnly placeholder="0" className="bg-stone-50" />
              <p className="text-[11px] text-stone-500 mt-1">Auto-calculated from quantity × target price.</p>
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
            {saving ? 'Saving…' : (isEdit ? 'Save Plan' : 'Add Plan')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}