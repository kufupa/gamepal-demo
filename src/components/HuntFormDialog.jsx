import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import HuntLineItemDialog from '@/components/HuntLineItemDialog';
import { mergeLineFinances } from '@/lib/finance';

export default function HuntFormDialog({ open, onOpenChange, hunt, farms = [], camps = [], animals = [], onDone }) {
  const [form, setForm] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [editingLine, setEditingLine] = useState(null);
  const [addingLine, setAddingLine] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => (f ? { ...f, [k]: v } : f));

  useEffect(() => {
    if (!open) return;
    setForm({
      name: hunt?.name || '',
      farm_id: hunt?.farm_id || '',
      start_date: hunt?.start_date || new Date().toISOString().slice(0, 10),
      end_date: hunt?.end_date || '',
      hunter_client: hunt?.hunter_client || '',
      notes: hunt?.notes || '',
    });
    setLineItems((hunt?.line_items || []).map((li) => ({ ...li })));
    // Editing: merge the protected line prices back on so revenue is not lost.
    if (hunt?.id) {
      base44.entities.HuntFinance.filter({ hunt_id: hunt.id }).then((rows) => {
        setLineItems(mergeLineFinances(hunt.line_items || [], rows[0]));
      });
    }
  }, [open, hunt]);

  if (!form) return null;
  const campName = (id) => camps.find((c) => c.id === id)?.name || '—';
  const isEdit = !!hunt;
  const filteredCamps = form.farm_id ? camps.filter((c) => c.farm_id === form.farm_id) : camps;

  const addLine = (item) => setLineItems((arr) => [...arr, item]);
  const updateLine = (item) => setLineItems((arr) => arr.map((li) => (li.id === item.id ? item : li)));
  const removeLine = (id) => setLineItems((arr) => arr.filter((li) => li.id !== id));

  const lineTotal = (li) => (Number(li.line_total) > 0 ? Number(li.line_total) : (Number(li.unit_price) || 0) * (Number(li.quantity) || 0));
  const grandTotal = lineItems.reduce((s, li) => s + lineTotal(li), 0);
  const totalAnimals = lineItems.reduce((s, li) => s + (Number(li.quantity) || 0), 0);
  const totalSpecies = new Set(lineItems.map((li) => li.species).filter(Boolean)).size;

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name, farm_id: form.farm_id, start_date: form.start_date, end_date: form.end_date,
        hunter_client: form.hunter_client, notes: form.notes, line_items: lineItems,
      };
      if (isEdit) payload.id = hunt.id;
      const res = await base44.functions.invoke(isEdit ? 'editHunt' : 'recordHunt', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = form.name && form.farm_id && form.start_date && lineItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Hunt Event' : 'Record Hunt Event'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Hunt / Group Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Smith Group – September 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Farm *</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.farm_id} onChange={(e) => set('farm_id', e.target.value)}>
                <option value="">— Select —</option>
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Hunter / Client / Group</Label>
              <Input value={form.hunter_client} onChange={(e) => set('hunter_client', e.target.value)} placeholder="Smith Group" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <Label className="mb-0">Hunted Animals</Label>
              <button onClick={() => { setEditingLine(null); setAddingLine(true); }} className="text-xs font-medium text-stone-900 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add line item
              </button>
            </div>
            {lineItems.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-3 text-center border border-dashed border-stone-200 rounded-md">No hunted animals added yet.</p>
            ) : (
              <div className="space-y-1.5">
                {lineItems.map((li) => (
                  <div key={li.id} className="bg-stone-50 border border-stone-200 rounded-md p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-stone-800">
                        {li.animal_ids?.length ? `${li.animal_tags?.join(', ') || li.animal_ids.length} · ${li.species}` : `${li.quantity} ${li.species} ${li.animal_class || ''}`}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingLine(li); setAddingLine(false); }} className="text-stone-500"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => removeLine(li.id)} className="text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <p className="text-stone-500 mt-0.5">{campName(li.camp_id)} · R {Number(li.unit_price || 0).toLocaleString()}/animal · Line: R {lineTotal(li).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
            {lineItems.length > 0 && (
              <div className="mt-2 flex justify-between text-xs font-semibold text-stone-700 border-t border-stone-200 pt-2">
                <span>{totalAnimals} animal{totalAnimals === 1 ? '' : 's'} · {totalSpecies} specie{totalSpecies === 1 ? '' : 's'}</span>
                <span>Total: R {grandTotal.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !canSubmit} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Record Hunt'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {addingLine && (
        <HuntLineItemDialog open onOpenChange={(v) => !v && setAddingLine(false)} initial={null} farmId={form.farm_id} camps={filteredCamps} animals={animals} onSave={addLine} />
      )}
      {editingLine && (
        <HuntLineItemDialog open onOpenChange={(v) => !v && setEditingLine(null)} initial={editingLine} farmId={form.farm_id} camps={filteredCamps} animals={animals} onSave={updateLine} />
      )}
    </Dialog>
  );
}