import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import HuntFormDialog from '@/components/HuntFormDialog';
import HuntLineItemDialog from '@/components/HuntLineItemDialog';
import { useUserRole } from '@/lib/useUserRole';
import { mergeLineFinances } from '@/lib/finance';

export default function HuntDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canViewFinance } = useUserRole();
  const [hunt, setHunt] = useState(null);
  const [finance, setFinance] = useState(null);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [editing, setEditing] = useState(false);
  const [lineEditing, setLineEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const from = new URLSearchParams(window.location.search).get('from');
  const goBack = () => navigate(from || '/sales');

  const load = async () => {
    setLoading(true);
    try { setHunt(await base44.entities.HuntEvent.get(id)); } catch { setHunt(null); }
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setCamps(await base44.entities.Camp.list('-created_date', 300));
    setAnimals(await base44.entities.Animal.list('-created_date', 500));
    if (canViewFinance) {
      const fin = await base44.entities.HuntFinance.filter({ hunt_id: id });
      setFinance(fin[0] || null);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <Layout><BrandHeader /><div className="py-16 text-center text-stone-400 text-sm">Loading…</div></Layout>;
  if (!hunt) return (
    <Layout>
      <BrandHeader subtitle="Hunt Detail" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500"><ArrowLeft className="w-4 h-4" /> Back</button>
        <p className="py-16 text-center text-stone-400 text-sm">Hunt not found.</p>
      </div>
    </Layout>
  );

  const farmName = (fid) => farms.find((f) => f.id === fid)?.name || '—';
  const campName = (cid) => camps.find((c) => c.id === cid)?.name || '—';

  // Operational lines, with the protected prices merged back on for editing.
  const pricedLines = mergeLineFinances(hunt.line_items || [], finance);
  const linePrice = (lineId) => (finance?.line_items || []).find((f) => f.line_id === lineId);

  // Update line items via editHunt (reverses old, applies new — safe).
  const updateLineItems = async (newItems) => {
    try {
      const res = await base44.functions.invoke('editHunt', {
        id: hunt.id, name: hunt.name, farm_id: hunt.farm_id, start_date: hunt.start_date,
        end_date: hunt.end_date, hunter_client: hunt.hunter_client, notes: hunt.notes,
        line_items: newItems,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Update failed');
    }
  };

  const addLine = (item) => updateLineItems([...pricedLines, item]);
  const editLine = (item) => updateLineItems(pricedLines.map((li) => (li.id === item.id ? item : li)));
  const deleteLine = (li) => {
    if (!confirm('Remove this line item? Its population deduction will be reversed.')) return;
    updateLineItems(pricedLines.filter((x) => x.id !== li.id));
  };

  const del = async () => {
    if (!confirm('Move this hunt to the Recycle Bin? All line-item population deductions and revenue will be reversed and can be restored later.')) return;
    try {
      const res = await base44.functions.invoke('deleteHunt', { id: hunt.id });
      if (res?.data?.error) throw new Error(res.data.error);
      navigate(from || '/sales');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    }
  };

  return (
    <Layout>
      <BrandHeader subtitle="Hunt Detail" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500"><ArrowLeft className="w-4 h-4" /> Back</button>

        <div className="auc-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="auc-badge bg-stone-100 text-stone-600">HUNT EVENT</span>
            <span className="text-xs text-stone-400">{hunt.end_date ? `${hunt.start_date} – ${hunt.end_date}` : hunt.start_date}</span>
          </div>
          <p className="text-base font-bold text-stone-900 uppercase tracking-wide">{hunt.name}</p>
          <div className="pt-1 space-y-1 text-sm">
            <Row label="Farm" value={farmName(hunt.farm_id)} />
            <Row label="Start Date" value={hunt.start_date || '—'} />
            <Row label="End Date" value={hunt.end_date || '—'} />
            <Row label="Hunter / Client" value={hunt.hunter_client || '—'} />
          </div>

          <div className={`bg-stone-50 rounded-md p-3 grid ${canViewFinance ? 'grid-cols-3' : 'grid-cols-2'} text-center divide-x divide-stone-200`}>
            <div><p className="text-lg font-black text-stone-900">{hunt.total_animals || 0}</p><p className="text-[10px] uppercase tracking-wide text-stone-500">Animals</p></div>
            <div><p className="text-lg font-black text-stone-900">{hunt.total_species || 0}</p><p className="text-[10px] uppercase tracking-wide text-stone-500">Species</p></div>
            {canViewFinance && <div><p className="text-lg font-black text-stone-900">R {Number(finance?.total_revenue || 0).toLocaleString()}</p><p className="text-[10px] uppercase tracking-wide text-stone-500">Revenue</p></div>}
          </div>

          {hunt.notes && <p className="text-xs text-stone-500 italic">{hunt.notes}</p>}
          {hunt.deleted && <p className="text-xs text-amber-600 pt-2 border-t border-stone-100">This hunt is in the Recycle Bin. Restore it from Settings → Recycle Bin.</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="auc-section-label">Hunted Animals</h3>
            {isAdmin && !hunt.deleted && (
              <button onClick={() => setAdding(true)} className="text-xs font-medium text-stone-900 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add line item</button>
            )}
          </div>
          <div className="space-y-2">
            {(hunt.line_items || []).map((li) => (
              <div key={li.id} className="auc-record p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-800">
                    {li.animal_ids?.length ? `${li.animal_tags?.join(', ') || li.animal_ids.length} · ${li.species}` : `${li.quantity} ${li.species} ${li.animal_class || ''}`}
                  </span>
                  {isAdmin && !hunt.deleted && (
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setLineEditing(li)} className="text-stone-500"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteLine(li)} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-stone-500 mt-1 space-y-0.5">
                  <p>Camp: {campName(li.camp_id)}{li.animal_class ? ` · ${li.animal_class}` : ''}</p>
                  {canViewFinance && (
                    <p>Price per Animal: R {Number(linePrice(li.id)?.unit_price || 0).toLocaleString()} · Line Total: R {Number(linePrice(li.id)?.line_total || 0).toLocaleString()}</p>
                  )}
                  {li.notes && <p className="italic text-stone-400">{li.notes}</p>}
                </div>
              </div>
            ))}
            {(hunt.line_items || []).length === 0 && <p className="text-stone-400 text-sm italic text-center py-6">No hunted animals recorded.</p>}
          </div>
        </div>

        {isAdmin && !hunt.deleted && (
          <div className="flex gap-3 pt-2 text-xs">
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-stone-600"><Pencil className="w-3.5 h-3.5" /> Edit Hunt</button>
            <button onClick={del} className="flex items-center gap-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Delete Hunt</button>
          </div>
        )}
      </div>

      {editing && <HuntFormDialog open onOpenChange={(v) => !v && setEditing(false)} hunt={hunt} farms={farms} camps={camps} animals={animals} onDone={load} />}
      {adding && <HuntLineItemDialog open onOpenChange={(v) => !v && setAdding(false)} initial={null} farmId={hunt.farm_id} camps={camps} animals={animals} onSave={addLine} />}
      {lineEditing && <HuntLineItemDialog open onOpenChange={(v) => !v && setLineEditing(null)} initial={pricedLines.find((li) => li.id === lineEditing.id) || lineEditing} farmId={hunt.farm_id} camps={camps} animals={animals} onSave={editLine} />}
    </Layout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-stone-500">{label}</span>
      <span className="text-stone-800 font-medium text-right">{value}</span>
    </div>
  );
}