import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

export default function CompleteMovementDialog({ open, onOpenChange, plan, farms = [], camps = [], animals = [], onDone }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open || !plan) return;
    setForm({
      actual_date: new Date().toISOString().slice(0, 10),
      from_camp_id: plan.from_camp_id,
      to_camp_id: plan.destination_type === 'camp' ? plan.to_camp_id : '',
      destination_text: plan.destination_text || '',
      quantity: plan.quantity ?? '',
      selected: plan.animal_ids || [],
      note: plan.note || '',
    });
  }, [open, plan]);

  if (!plan) return null;
  const isManual = plan.destination_type === 'manual';
  const sourceCamp = camps.find((c) => c.id === form.from_camp_id);
  const destCamps = camps.filter((c) => c.id !== form.from_camp_id);
  const sourceAnimals = animals.filter((a) => a.current_camp_id === form.from_camp_id && a.status !== 'Deceased');

  const toggle = (id) => setForm((f) => ({
    ...f,
    selected: f.selected.includes(id) ? f.selected.filter((x) => x !== id) : [...f.selected, id],
  }));

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        id: plan.id,
        actual_date: form.actual_date,
        from_camp_id: form.from_camp_id,
        from_farm_id: sourceCamp?.farm_id,
        note: form.note,
      };
      if (isManual) {
        payload.destination_type = 'manual';
        payload.destination_text = form.destination_text;
      } else {
        payload.destination_type = 'camp';
        payload.to_camp_id = form.to_camp_id;
        payload.to_farm_id = camps.find((c) => c.id === form.to_camp_id)?.farm_id || null;
      }
      if (plan.type === 'bulk') {
        payload.quantity = Number(form.quantity) || 0;
      } else {
        payload.animal_ids = form.selected;
      }
      const res = await base44.functions.invoke('completePlannedMovement', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Complete failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = form.from_camp_id && (isManual ? form.destination_text : form.to_camp_id) && (plan.type === 'bulk' ? form.quantity > 0 : form.selected?.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Movement</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2 -mt-1">
          Confirm or correct the details below. Completing will execute the movement and update all live totals.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-stone-50 rounded-md px-3 py-2 text-sm">
            <span className="text-stone-500">Destination</span>
            <span className="font-semibold text-stone-800">
              {isManual ? (form.destination_text || 'Manual') : (camps.find((c) => c.id === form.to_camp_id)?.name || '—')}
            </span>
          </div>

          <div>
            <Label>Actual date</Label>
            <Input type="date" value={form.actual_date} onChange={(e) => set('actual_date', e.target.value)} />
          </div>

          <div>
            <Label>From (source camp)</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.from_camp_id} onChange={(e) => set('from_camp_id', e.target.value)}>
              <option value="">— Select source —</option>
              {camps.map((c) => <option key={c.id} value={c.id}>{c.name} ({farms.find((f) => f.id === c.farm_id)?.name || ''})</option>)}
            </select>
          </div>

          {!isManual && (
            <div>
              <Label>To (destination camp)</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.to_camp_id} onChange={(e) => set('to_camp_id', e.target.value)} disabled={!form.from_camp_id}>
                <option value="">— Select destination —</option>
                {destCamps.map((c) => <option key={c.id} value={c.id}>{c.name} ({farms.find((f) => f.id === c.farm_id)?.name || ''})</option>)}
              </select>
            </div>
          )}

          {isManual && (
            <div>
              <Label>Destination (manual)</Label>
              <Input value={form.destination_text} onChange={(e) => set('destination_text', e.target.value)} placeholder="e.g. Vaalwater Auction" />
            </div>
          )}

          {plan.type === 'bulk' ? (
            <div>
              <Label>Quantity ({plan.species} {plan.animal_class})</Label>
              <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
            </div>
          ) : (
            <div>
              <Label>Tagged animals ({form.selected?.length || 0} selected)</Label>
              <div className="max-h-40 overflow-y-auto border border-stone-200 rounded-md divide-y">
                {sourceAnimals.map((a) => (
                  <label key={a.id} className="flex items-center gap-2.5 p-2.5 text-sm">
                    <input type="checkbox" checked={form.selected?.includes(a.id)} onChange={() => toggle(a.id)} className="w-4 h-4" />
                    <span className="font-semibold">{a.tag_number}</span>
                    <span className="text-stone-500">{a.species} · {a.sex}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !canSubmit} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Completing…' : 'Confirm & Complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}