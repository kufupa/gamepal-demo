import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

// Edits Capture Event metadata only (name / date / notes). Population totals
// and the movement lines themselves are never affected, and the event date
// never propagates to individual line dates.
export default function EditCaptureEventDialog({ open, onOpenChange, event, onDone }) {
  const [form, setForm] = useState({ name: '', date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) setForm({ name: event.name || '', date: event.date || '', notes: event.notes || '' });
  }, [event]);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('editMovementEvent', { id: event.id, name: form.name, date: form.date, notes: form.notes });
      if (res?.data?.error) throw new Error(res.data.error);
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Capture Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Event date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Name / Reference</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div>
            <Label>General notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
            Changing the event date or notes never affects camp totals or the movement lines themselves.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.date} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}