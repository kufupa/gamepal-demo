import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ParentSelect from '@/components/ParentSelect';

const emptyRow = () => ({ tag_number: '', sex: 'Female', tag_colour: '', birth_year: '', date_of_birth: '', notes: '', sire_id: '', sire_manual: '' });

export default function ConvertToIndividualsDialog({ open, onOpenChange, group, camp, sires = [], onDone, onMoveNew }) {
  const [count, setCount] = useState(1);
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const max = group?.quantity || 0;
  const availableSires = sires.filter((s) => s.species === group?.species);

  const changeCount = (n) => {
    const clamped = Math.max(1, Math.min(n, max || 1));
    setCount(clamped);
    setRows((rs) => {
      const next = rs.slice(0, clamped);
      while (next.length < clamped) next.push(emptyRow());
      return next;
    });
  };

  const setRow = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const close = () => {
    setResult(null);
    setCount(1);
    setRows([emptyRow()]);
    onOpenChange(false);
  };

  const submit = async () => {
    if (count > max) return;
    if (rows.some((r) => !r.tag_number.trim())) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('convertGroupToIndividuals', {
        group_id: group.id,
        animals: rows.slice(0, count),
      });
      setResult(res.data || res);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Conversion failed');
    } finally {
      setSaving(false);
    }
  };

  const moveNew = () => {
    const ids = result?.created_ids || [];
    onDone?.();
    onMoveNew?.(ids);
    close();
  };

  const finish = () => {
    onDone?.();
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tag / Convert to Individuals — {camp?.name}</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p className="font-semibold">Converted {result.created_tags?.length || 0} animal(s) into tagged individuals.</p>
              <p className="text-green-700 mt-0.5">Bulk group reduced to {result.new_group_quantity}. Total population unchanged.</p>
              <p className="text-[11px] text-green-600 mt-1">Tags: {result.created_tags?.join(', ')}</p>
            </div>
            <p className="text-xs text-stone-500">
              These animals are now tracked individually. Moving, selling or recording a mortality on any of them will affect only that animal — it will never deduct from the bulk group again.
            </p>
            <div className="flex gap-2">
              <Button onClick={moveNew} className="flex-1 bg-stone-900 text-stone-50 hover:bg-stone-800">
                <ArrowRight className="w-4 h-4 mr-1" /> Move Tagged Animals
              </Button>
              <Button variant="outline" onClick={finish} className="flex-1">Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-stone-50 border border-stone-200 rounded-md p-2.5 text-sm">
              <span className="text-stone-500">Source group: </span>
              <span className="font-semibold text-stone-900">{group?.species} · {group?.animal_class} · {group?.quantity}</span>
            </div>

            <div>
              <Label>How many animals are being tagged?</Label>
              <Input type="number" min={1} max={max} value={count} onChange={(e) => changeCount(Number(e.target.value))} />
              {count > max && <p className="text-[11px] text-red-500 mt-1">Cannot convert more than the {max} in this group.</p>}
              <p className="text-[11px] text-stone-500 mt-1">The bulk quantity will be reduced by this number. Each becomes an individual record.</p>
            </div>

            <div>
              <Label>Individual tag details ({count})</Label>
              <div className="max-h-64 overflow-y-auto space-y-2 border border-stone-200 rounded-md p-2">
                {rows.slice(0, count).map((r, i) => (
                  <div key={i} className="bg-white border border-stone-100 rounded-md p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-stone-400 w-5">#{i + 1}</span>
                      <Input value={r.tag_number} onChange={(e) => setRow(i, 'tag_number', e.target.value)} placeholder="Tag number" className="h-9 flex-1" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={r.sex} onChange={(e) => setRow(i, 'sex', e.target.value)}>
                        <option>Female</option>
                        <option>Male</option>
                      </select>
                      <Input value={r.tag_colour} onChange={(e) => setRow(i, 'tag_colour', e.target.value)} placeholder="Tag colour" className="h-9" />
                      <Input value={r.birth_year} onChange={(e) => setRow(i, 'birth_year', e.target.value)} placeholder="Birth yr" className="h-9" />
                    </div>
                    <ParentSelect label="Sire" candidates={availableSires} parentId={r.sire_id} parentManual={r.sire_manual} onChange={(id, manual) => { setRow(i, 'sire_id', id); setRow(i, 'sire_manual', manual); }} />
                    <Input value={r.notes} onChange={(e) => setRow(i, 'notes', e.target.value)} placeholder="Notes (optional)" className="h-9" />
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
              One transformation: the bulk group drops by {count} and {count} tagged individual(s) are created in this camp. Total population stays the same.
            </p>
          </div>
        )}

        {!result && (
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={submit} disabled={saving || count > max || count < 1 || rows.slice(0, count).some((r) => !r.tag_number.trim())} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
              {saving ? 'Converting…' : `Convert ${count} to Individuals`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}