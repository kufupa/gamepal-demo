import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { sortByEventDateDesc } from '@/lib/sortHelpers';

const CLASSES = ['Females', 'Males', 'Breeding Males', 'Offspring', 'Mixed'];

export default function MortalityReport() {
  const [mortalities, setMortalities] = useState([]);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ from: '', to: '', farm_id: '', camp_id: '', species: '', animal_class: '', kind: '', cause: '' });

  useEffect(() => {
    (async () => {
      setMortalities(sortByEventDateDesc((await base44.entities.Mortality.list('-date', 500)).filter((m) => !m.deleted)));
      setFarms(await base44.entities.Farm.list('-created_date', 100));
      setCamps(await base44.entities.Camp.list('-created_date', 200));
      setLoading(false);
    })();
  }, []);

  const farmName = (id) => farms.find((x) => x.id === id)?.name || '—';
  const campName = (id) => camps.find((x) => x.id === id)?.name || '—';

  const filtered = useMemo(() => {
    return mortalities.filter((m) => {
      if (f.from && m.date < f.from) return false;
      if (f.to && m.date > f.to) return false;
      if (f.farm_id && m.farm_id !== f.farm_id) return false;
      if (f.camp_id && m.camp_id !== f.camp_id) return false;
      if (f.species && m.species !== f.species) return false;
      if (f.animal_class && m.animal_class !== f.animal_class) return false;
      if (f.kind === 'tagged' && m.type !== 'individual') return false;
      if (f.kind === 'untagged' && m.type !== 'bulk') return false;
      if (f.cause && !(m.cause || '').toLowerCase().includes(f.cause.toLowerCase())) return false;
      return true;
    });
  }, [mortalities, f]);

  const totals = {
    total: filtered.reduce((s, m) => s + (m.quantity || 1), 0),
    tagged: filtered.filter((m) => m.type === 'individual').length,
    untagged: filtered.filter((m) => m.type === 'bulk').reduce((s, m) => s + (m.quantity || 0), 0),
  };

  const bySpecies = {};
  const byCamp = {};
  for (const m of filtered) {
    const n = m.quantity || 1;
    bySpecies[m.species] = (bySpecies[m.species] || 0) + n;
    byCamp[m.camp_id] = (byCamp[m.camp_id] || 0) + n;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-stone-500 uppercase tracking-wide">From</label>
            <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="w-full h-9 rounded-md border border-stone-200 px-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-stone-500 uppercase tracking-wide">To</label>
            <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="w-full h-9 rounded-md border border-stone-200 px-2 text-sm" />
          </div>
        </div>
        <Sel label="Farm" value={f.farm_id} onChange={(v) => setF({ ...f, farm_id: v, camp_id: '' })} options={farms.map((x) => ({ value: x.id, label: x.name }))} />
        <Sel label="Camp" value={f.camp_id} onChange={(v) => setF({ ...f, camp_id: v })} options={camps.filter((c) => !f.farm_id || c.farm_id === f.farm_id).map((c) => ({ value: c.id, label: c.name }))} />
        <Sel label="Species" value={f.species} onChange={(v) => setF({ ...f, species: v })} options={[...new Set(mortalities.map((m) => m.species).filter(Boolean))].sort().map((s) => ({ value: s, label: s }))} />
        <Sel label="Classification" value={f.animal_class} onChange={(v) => setF({ ...f, animal_class: v })} options={CLASSES.map((c) => ({ value: c, label: c }))} />
        <Sel label="Tagged / Untagged" value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={[{ value: 'tagged', label: 'Tagged' }, { value: 'untagged', label: 'Untagged' }]} />
        <input value={f.cause} onChange={(e) => setF({ ...f, cause: e.target.value })} placeholder="Cause" className="w-full h-9 rounded-md border border-stone-200 px-2 text-sm" />
        <button onClick={() => setF({ from: '', to: '', farm_id: '', camp_id: '', species: '', animal_class: '', kind: '', cause: '' })} className="text-xs text-red-500">Clear filters</button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total" value={totals.total} dark />
        <Stat label="Tagged" value={totals.tagged} />
        <Stat label="Untagged" value={totals.untagged} />
      </div>

      {/* Summaries */}
      <Summary title="By Species" rows={Object.entries(bySpecies).sort((a, b) => b[1] - a[1])} />
      <Summary title="By Camp" rows={Object.entries(byCamp).map(([id, n]) => [campName(id), n]).sort((a, b) => b[1] - a[1])} />

      {/* List */}
      <div>
        <h3 className="auc-section-label mb-2">Records ({filtered.length})</h3>
        {loading ? (
          <p className="text-stone-400 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-stone-400 text-sm italic">No mortality records match.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <div key={m.id} className="auc-record p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`auc-badge ${m.type === 'bulk' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>
                    {m.type === 'bulk' ? 'BULK' : 'TAGGED'}
                  </span>
                  <span className="text-xs text-stone-400">{m.date}</span>
                </div>
                <p className="text-sm font-medium text-stone-800">
                  {m.type === 'bulk'
                    ? `${m.quantity} ${m.species} ${m.animal_class || ''}`
                    : <>{m.animal_tag} <span className="text-stone-500">· {m.species} · {m.sex}</span></>}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">{farmName(m.farm_id)} → {campName(m.camp_id)}</p>
                {m.cause && <p className="text-xs text-stone-500 mt-0.5">Cause: {m.cause}</p>}
                {m.notes && <p className="text-xs text-stone-400 mt-0.5 italic">{m.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-[11px] text-stone-500 uppercase tracking-wide">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-sm mt-0.5">
        <option value="">All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function Stat({ label, value, dark }) {
  return (
    <div className={`rounded-xl p-3 text-center ${dark ? 'bg-stone-900 text-stone-50' : 'bg-white border border-stone-200'}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className={`text-[11px] uppercase tracking-wide ${dark ? 'text-stone-400' : 'text-stone-500'}`}>{label}</p>
    </div>
  );
}
function Summary({ title, rows }) {
  if (rows.length === 0) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3">
      <h3 className="auc-section-label mb-2">{title}</h3>
      <div className="space-y-1">
        {rows.map(([name, n]) => (
          <div key={name} className="flex justify-between text-sm">
            <span className="text-stone-600">{name}</span>
            <span className="font-semibold">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}