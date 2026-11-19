import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import EditMovementDialog from '@/components/EditMovementDialog';
import { useUserRole } from '@/lib/useUserRole';

export default function MovementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [movement, setMovement] = useState(null);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const from = new URLSearchParams(window.location.search).get('from');
  const goBack = () => navigate(from || '/movements');

  const load = async () => {
    setLoading(true);
    try {
      setMovement(await base44.entities.Movement.get(id));
    } catch {
      setMovement(null);
    }
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setCamps(await base44.entities.Camp.list('-created_date', 300));
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <Layout><BrandHeader /><div className="py-16 text-center text-stone-400 text-sm">Loading…</div></Layout>;
  if (!movement) return (
    <Layout>
      <BrandHeader subtitle="Movement Detail" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500"><ArrowLeft className="w-4 h-4" /> Back</button>
        <p className="py-16 text-center text-stone-400 text-sm">Movement not found.</p>
      </div>
    </Layout>
  );

  const farmName = (fid) => farms.find((f) => f.id === fid)?.name || '—';
  const campName = (cid) => camps.find((c) => c.id === cid)?.name || '—';

  const del = async () => {
    if (!confirm('Move this movement to the Recycle Bin? Its population effect will be reversed and can be restored later.')) return;
    try {
      const res = await base44.functions.invoke('deleteMovement', { id: movement.id });
      if (res?.data?.error) throw new Error(res.data.error);
      navigate(from || '/movements');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    }
  };

  return (
    <Layout>
      <BrandHeader subtitle="Movement Detail" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="auc-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`auc-badge ${movement.type === 'bulk' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>
              {movement.type === 'bulk' ? 'BULK MOVE' : 'INDIVIDUAL MOVE'}
            </span>
            <span className="text-xs text-stone-400">{movement.date}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold tracking-wide text-stone-500 uppercase">From</p>
              <p className="font-medium text-stone-900 truncate">{campName(movement.from_camp_id)}</p>
              <p className="text-xs text-stone-500">{farmName(movement.from_farm_id)}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[11px] font-bold tracking-wide text-stone-500 uppercase">To</p>
              <p className="font-medium text-stone-900 truncate">{movement.destination_type === 'manual' ? (movement.destination_text || 'External') : campName(movement.to_camp_id)}</p>
              <p className="text-xs text-stone-500">{movement.destination_type === 'manual' ? 'External / Manual' : farmName(movement.to_farm_id)}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-1 text-sm">
            <Row label="Species" value={movement.species || '—'} />
            {movement.type === 'bulk' ? (
              <>
                <Row label="Class" value={movement.animal_class || '—'} />
                <Row label="Quantity" value={String(movement.quantity)} />
              </>
            ) : (
              <Row label="Animals" value={movement.animal_tags?.length ? movement.animal_tags.join(', ') : (movement.animal_ids?.length ? `${movement.animal_ids.length} animal(s)` : '—')} />
            )}
            <Row label="Date" value={movement.date} />
            {movement.note && <Row label="Note" value={movement.note} />}
          </div>

          {movement.deleted && (
            <p className="text-xs text-amber-600 pt-2 border-t border-stone-100">This record is in the Recycle Bin. Restore it from Settings → Recycle Bin to edit.</p>
          )}
          {isAdmin && !movement.deleted && (
            <div className="flex gap-3 pt-2 border-t border-stone-100 text-xs">
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-stone-600"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={del} className="flex items-center gap-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditMovementDialog open onOpenChange={(v) => !v && setEditing(false)} movement={movement} farms={farms} camps={camps} onDone={load} />
      )}
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