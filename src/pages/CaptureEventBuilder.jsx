import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ChevronLeft, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import CaptureEventLineCard, { EMPTY_LINE, isLineComplete } from '@/components/capture/CaptureEventLineCard';
import { useUserRole } from '@/lib/useUserRole';

// Full-screen Capture Event builder: one real-world capture session recorded as
// several normal movement lines under a single parent event. Every line keeps
// the exact same movement semantics as a standalone move; the server pre-validates
// all lines (cumulative source availability, duplicate tagged animals) before
// anything is applied, and rolls back fully if a line fails.
export default function CaptureEventBuilder() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [camps, setCamps] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ name: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [lines, setLines] = useState([{ ...EMPTY_LINE, _id: Date.now() }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setCamps(await base44.entities.Camp.list('-created_date', 200));
      setAnimals(await base44.entities.Animal.list('-created_date', 500));
      setLoading(false);
    })();
  }, []);

  const updateLine = (id, next) => setLines((ls) => ls.map((l) => (l._id === id ? next : l)));
  const removeLine = (id) => setLines((ls) => ls.filter((l) => l._id !== id));
  const addLine = () => setLines((ls) => [...ls, { ...EMPTY_LINE, _id: Date.now() + ls.length }]);

  const allComplete = lines.length > 0 && lines.every(isLineComplete);
  const allIds = lines.filter((l) => l.type === 'individual').flatMap((l) => l.animal_ids);
  const hasDuplicateAnimals = new Set(allIds).size !== allIds.length;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await base44.functions.invoke('recordMovementEvent', {
        name: meta.name,
        date: meta.date,
        notes: meta.notes,
        lines: lines.map((l) => ({
          type: l.type,
          from_camp_id: l.from_camp_id,
          destination_type: l.destination_type,
          to_camp_id: l.destination_type === 'manual' ? null : l.to_camp_id,
          destination_text: l.destination_type === 'manual' ? l.destination_text : null,
          species: l.species,
          animal_class: l.animal_class,
          quantity: l.type === 'bulk' ? Number(l.quantity) : null,
          animal_ids: l.type === 'individual' ? l.animal_ids : [],
          note: l.note,
        })),
      });
      if (res?.data?.error) throw new Error(res.data.error);
      navigate('/movements');
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Saving failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <BrandHeader subtitle="New Capture Event" />
      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        <button onClick={() => navigate('/movements')} className="flex items-center gap-1 text-sm text-stone-500">
          <ChevronLeft className="w-4 h-4" /> Movements
        </button>
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-stone-900 text-lg">Capture Event</h2>
        </div>

        {!isAdmin ? (
          <div className="auc-empty"><p className="text-sm">Admin access is required to record a Capture Event.</p></div>
        ) : loading ? (
          <p className="text-center text-stone-400 text-sm py-8">Loading…</p>
        ) : (
          <>
            <div className="auc-record p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Event date</Label>
                  <Input type="date" value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} />
                </div>
                <div>
                  <Label>Name / Reference (optional)</Label>
                  <Input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} placeholder="e.g. BEES capture" />
                </div>
              </div>
              <div>
                <Label>General notes (optional)</Label>
                <Textarea rows={2} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="auc-section-label">Movement Lines</h3>
              {lines.map((l, i) => (
                <CaptureEventLineCard
                  key={l._id}
                  index={i}
                  line={l}
                  camps={camps}
                  animals={animals}
                  onChange={(next) => updateLine(l._id, next)}
                  onRemove={() => removeLine(l._id)}
                />
              ))}
              <button onClick={addLine} className="flex items-center gap-1 text-sm font-medium text-stone-900">
                <Plus className="w-4 h-4" /> Add Another Movement
              </button>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">{error}</p>}
            {hasDuplicateAnimals && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">The same tagged animal appears in more than one line.</p>}

            <div className="pb-6">
              <Button onClick={save} disabled={saving || !allComplete || hasDuplicateAnimals || !meta.date} className="w-full bg-stone-900 text-stone-50 hover:bg-stone-800">
                {saving ? 'Saving…' : `Save / Complete Capture Event (${lines.length} line${lines.length === 1 ? '' : 's'})`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}