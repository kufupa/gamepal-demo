import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AuctionLineItemDialog from '@/components/AuctionLineItemDialog';
import { mergeLineFinances } from '@/lib/finance';

export default function AuctionFormDialog({ open, onOpenChange, auction, farms = [], camps = [], animals = [], onDone }) {
  const [form, setForm] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [editingLine, setEditingLine] = useState(null);
  const [addingLine, setAddingLine] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => (f ? { ...f, [k]: v } : f));

  useEffect(() => {
    if (!open) return;
    setForm({
      name: auction?.name || '',
      farm_id: auction?.farm_id || '',
      auction_date: auction?.auction_date || new Date().toISOString().slice(0, 10),
      sold_at: auction?.sold_at || '',
      buyer: auction?.buyer || '',
      notes: auction?.notes || '',
    });
    setLineItems((auction?.line_items || []).map((li) => ({ ...li })));
    // Editing: merge the protected line prices back on so revenue is not lost.
    if (auction?.id) {
      base44.entities.AuctionFinance.filter({ auction_id: auction.id }).then((rows) => {
        setLineItems(mergeLineFinances(auction.line_items || [], rows[0]));
      });
    }
  }, [open, auction]);

  if (!form) return null;
  const campName = (id) => camps.find((c) => c.id === id)?.name || '—';
  const isEdit = !!auction;
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
        name: form.name, farm_id: form.farm_id, auction_date: form.auction_date,
        sold_at: form.sold_at, buyer: form.buyer, notes: form.notes, line_items: lineItems,
      };
      if (isEdit) payload.id = auction.id;
      const res = await base44.functions.invoke(isEdit ? 'editAuction' : 'recordAuction', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = form.name && form.farm_id && form.auction_date && lineItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Auction Event' : 'Record Auction Event'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Auction / Event Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Thabazimbi Auction – September 2026" />
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
              <Label>Auction Date *</Label>
              <Input type="date" value={form.auction_date} onChange={(e) => set('auction_date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sold At / Venue</Label>
              <Input value={form.sold_at} onChange={(e) => set('sold_at', e.target.value)} placeholder="Thabazimbi Veiling" />
            </div>
            <div>
              <Label>Buyer / Auction House</Label>
              <Input value={form.buyer} onChange={(e) => set('buyer', e.target.value)} placeholder="Buyer or auction house" />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <Label className="mb-0">Sold Animals</Label>
              <button onClick={() => { setEditingLine(null); setAddingLine(true); }} className="text-xs font-medium text-stone-900 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add line item
              </button>
            </div>
            {lineItems.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-3 text-center border border-dashed border-stone-200 rounded-md">No sold animals added yet.</p>
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
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            Each line item removes animals from the live population. Tagged animals are marked Sold (record &amp; pedigree kept) and — if counted in a bulk group — that group drops by one. Bulk lines deduct from the matching camp/group.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !canSubmit} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Record Auction'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {addingLine && (
        <AuctionLineItemDialog open onOpenChange={(v) => !v && setAddingLine(false)} initial={null} farmId={form.farm_id} camps={filteredCamps} animals={animals} onSave={addLine} />
      )}
      {editingLine && (
        <AuctionLineItemDialog open onOpenChange={(v) => !v && setEditingLine(null)} initial={editingLine} farmId={form.farm_id} camps={filteredCamps} animals={animals} onSave={updateLine} />
      )}
    </Dialog>
  );
}