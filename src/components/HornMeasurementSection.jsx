import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown as Chevron } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AnimalAccordion from '@/components/AnimalAccordion';
import HornMeasurementFields from '@/components/HornMeasurementFields';
import { formatInches, hasMeasurementData } from '@/lib/hornMeasurements';

function emptyMeas() {
  return {
    measurement_date: new Date().toISOString().slice(0, 10),
    inches: null,
    horn_length_left: null, horn_length_right: null, tip_to_tip: null,
    tips_left: null, tips_right: null, rings_left: null, rings_right: null,
    base_left: null, base_right: null, notes: '',
  };
}

// Accordion section: latest measurement prominent, history below (expandable),
// "+ Add Measurement" creates a new dated record (never overwrites history).
export default function HornMeasurementSection({ animal, measurements, isAdmin, onReload }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyMeas());
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});

  const startAdd = () => { setEditingId(null); setForm(emptyMeas()); setShowForm(true); };
  const startEdit = (m) => { setEditingId(m.id); setForm({ ...emptyMeas(), ...m, notes: m.notes || '' }); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditingId(null); setForm(emptyMeas()); };

  const submit = async () => {
    if (!form.measurement_date) return;
    setSaving(true);
    try {
      const payload = { ...form, animal_id: animal.id };
      if (editingId) {
        await base44.entities.HornMeasurement.update(editingId, payload);
      } else {
        await base44.entities.HornMeasurement.create(payload);
      }
      // Sync legacy fields on the animal for backward compat with list views
      await base44.entities.Animal.update(animal.id, {
        horn_length: form.inches != null ? formatInches(form.inches) : (form.horn_length_left != null ? formatInches(form.horn_length_left) : ''),
        tip_to_tip: form.tip_to_tip != null ? formatInches(form.tip_to_tip) : '',
      });
      cancel();
      await onReload?.();
    } finally {
      setSaving(false);
    }
  };

  const del = async (mId) => {
    if (!confirm('Delete this measurement record?')) return;
    await base44.entities.HornMeasurement.delete(mId);
    onReload?.();
  };

  const latest = measurements[0];
  const history = measurements.slice(1);
  const hasLegacy = !measurements.length && (animal.horn_length || animal.tip_to_tip);

  return (
    <AnimalAccordion title="Horn Measurements" rightAction={isAdmin && !showForm && (
      <button onClick={startAdd} className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Add
      </button>
    )}>
      {showForm && (
        <div className="space-y-3 bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-700">{editingId ? 'Edit Measurement' : 'New Measurement'}</span>
          </div>
          <HornMeasurementFields value={form} onChange={setForm} />
          <div>
            <span className="text-[11px] text-stone-500 uppercase tracking-wide">Notes</span>
            <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm mt-1" />
          </div>
          <div className="flex gap-2">
            <button onClick={submit} disabled={saving || !form.measurement_date} className="flex-1 bg-stone-900 text-stone-50 text-sm py-2 rounded-md disabled:opacity-50">
              {saving ? 'Saving…' : editingId ? 'Update' : 'Save Measurement'}
            </button>
            <button onClick={cancel} className="px-4 border border-stone-200 text-sm py-2 rounded-md">Cancel</button>
          </div>
        </div>
      )}

      {!showForm && latest && (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wide text-stone-500">Latest — {latest.measurement_date}</span>
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={() => startEdit(latest)} className="text-stone-400 hover:text-stone-700"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => del(latest.id)} className="text-stone-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
              </div>
            )}
          </div>
          <MeasurementValues m={latest} />
        </div>
      )}

      {!showForm && !latest && hasLegacy && (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
          <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-1">Legacy measurement</p>
          <p className="text-sm text-stone-600">Horn Length: {animal.horn_length || '—'} · Tip to Tip: {animal.tip_to_tip || '—'}</p>
          <p className="text-xs text-stone-400 mt-1">Recorded before measurement history was introduced.</p>
        </div>
      )}

      {!showForm && !latest && !hasLegacy && (
        <p className="text-stone-400 text-sm italic">No measurements recorded</p>
      )}

      {history.length > 0 && !showForm && (
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide text-stone-500 mt-2 mb-1">History</p>
          {history.map((m) => (
            <div key={m.id} className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2">
                <button onClick={() => setExpanded((s) => ({ ...s, [m.id]: !s[m.id] }))} className="flex items-center gap-1 text-sm text-stone-700">
                  <Chevron className={`w-3.5 h-3.5 text-stone-400 transition-transform ${expanded[m.id] ? 'rotate-180' : ''}`} />
                  {m.measurement_date}
                </button>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(m)} className="text-stone-400 hover:text-stone-700"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => del(m.id)} className="text-stone-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
              {expanded[m.id] && (
                <div className="px-3 pb-3 border-t border-stone-100 pt-2">
                  <MeasurementValues m={m} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AnimalAccordion>
  );
}

function MeasurementValues({ m }) {
  const rows = [
    ['Inches', formatInches(m.inches)],
    ['Horn L', formatInches(m.horn_length_left)],
    ['Horn R', formatInches(m.horn_length_right)],
    ['Tip to Tip', formatInches(m.tip_to_tip)],
    ['Tips L', formatInches(m.tips_left)],
    ['Tips R', formatInches(m.tips_right)],
    ['Base L', formatInches(m.base_left)],
    ['Base R', formatInches(m.base_right)],
    ['Rings L', m.rings_left != null ? String(m.rings_left) : ''],
    ['Rings R', m.rings_right != null ? String(m.rings_right) : ''],
  ].filter(([, v]) => v !== '');
  if (!rows.length) return <p className="text-sm text-stone-400 italic">No values recorded</p>;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {rows.map(([label, val]) => (
        <div key={label} className="flex justify-between text-sm">
          <span className="text-stone-500">{label}</span>
          <span className="font-medium text-stone-800">{val}</span>
        </div>
      ))}
    </div>
  );
}