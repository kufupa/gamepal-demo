import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

export default function EditCampDialog({ open, onOpenChange, camp, onDone }) {
  const [form, setForm] = useState({
    name: camp?.name || '',
    size_hectares: camp?.size_hectares == null ? '' : camp.size_hectares,
    notes: camp?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const patch = { name: form.name.trim(), notes: form.notes || '' };
      patch.size_hectares = form.size_hectares === '' ? null : Number(form.size_hectares);
      await base44.entities.Camp.update(camp.id, patch);
      onDone?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Camp — {camp?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Camp Name</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Camp name" />
          </div>
          <div>
            <Label>Size (hectares)</Label>
            <Input type="number" step="0.01" value={form.size_hectares} onChange={(e) => set('size_hectares', e.target.value)} placeholder="e.g. 25" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            Editing a camp only changes its name and size. It does <b>not</b> affect any animals, movements, sales, mortality or history linked to this camp.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.name.trim()} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}