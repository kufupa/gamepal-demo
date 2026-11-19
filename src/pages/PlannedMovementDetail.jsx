import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import AddPlannedMovementDialog from '@/components/AddPlannedMovementDialog';
import CompleteMovementDialog from '@/components/CompleteMovementDialog';
import { useUserRole } from '@/lib/useUserRole';

export default function PlannedMovementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [plan, setPlan] = useState(null);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);

  const from = new URLSearchParams(window.location.search).get('from');
  const goBack = () => navigate(from || '/movements');

  const load = async () => {
    setLoading(true);
    try {
      setPlan(await base44.entities.PlannedMovement.get(id));
    } catch { setPlan(null); }
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setCamps(await base44.entities.Camp.list('-created_date', 300));
    setAnimals(await base44.entities.Animal.list('-created_date', 500));
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <Layout><BrandHeader /><div className="py-16 text-center text-stone-400 text-sm">Loading…</div></Layout>;
  if (!plan) return (
    <Layout>
      <BrandHeader subtitle="Planned Movement" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500"><ArrowLeft className="w-4 h-4" /> Back</button>
        <p className="py-16 text-center text-stone-400 text-sm">Planned movement not found.</p>
      </div>
    </Layout>
  );

  const farmName = (fid) => farms.find((f) => f.id === fid)?.name || '—';
  const campName = (cid) => camps.find((c) => c.id === cid)?.name || '—';
  const destLabel = plan.destination_type === 'manual' ? (plan.destination_text || 'External') : campName(plan.to_camp_id);
  const isActive = plan.status === 'Planned';

  const cancel = async () => {
    if (!confirm('Cancel this planned movement? It has not affected any totals, so no populations will change.')) return;
    try {
      await base44.entities.PlannedMovement.update(plan.id, { status: 'Cancelled' });
      await base44.functions.invoke('compactPlannedMovementPriorities', {});
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Cancel failed');
    }
  };

  const del = async () => {
    if (!confirm('Delete this planned movement? It has not affected any totals, so no populations will change.')) return;
    try {
      await base44.entities.PlannedMovement.delete(plan.id);
      await base44.functions.invoke('compactPlannedMovementPriorities', {});
      navigate(from || '/movements');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    }
  };

  const statusBadge = {
    Planned: 'bg-amber-100 text-amber-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-stone-200 text-stone-500',
  }[plan.status] || 'bg-stone-100 text-stone-600';

  return (
    <Layout>
      <BrandHeader subtitle="Planned Movement" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="auc-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`auc-badge ${statusBadge}`}>{plan.status.toUpperCase()}</span>
              {plan.status === 'Planned' && plan.priority != null && <span className="auc-badge bg-amber-100 text-amber-700">PRIORITY {plan.priority}</span>}
            </div>
            {plan.completed_date && <span className="text-xs text-stone-400">Completed {plan.completed_date}</span>}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold tracking-wide text-stone-500 uppercase">From</p>
              <p className="font-medium text-stone-900 truncate">{campName(plan.from_camp_id)}</p>
              <p className="text-xs text-stone-500">{farmName(plan.from_farm_id)}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[11px] font-bold tracking-wide text-stone-500 uppercase">To</p>
              <p className="font-medium text-stone-900 truncate">{destLabel}</p>
              <p className="text-xs text-stone-500">{plan.destination_type === 'manual' ? 'External / Manual' : farmName(plan.to_farm_id)}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-1 text-sm">
            <Row label="Type" value={plan.type === 'bulk' ? 'Bulk Group' : 'Tagged Animals'} />
            <Row label="Species" value={plan.species || '—'} />
            {plan.type === 'bulk' ? (
              <>
                <Row label="Class" value={plan.animal_class || '—'} />
                <Row label="Quantity" value={String(plan.quantity ?? '—')} />
              </>
            ) : (
              <Row label="Animals" value={plan.animal_tags?.length ? plan.animal_tags.join(', ') : `${plan.animal_ids?.length || 0} animal(s)`} />
            )}
            {plan.priority != null && <Row label="Priority" value={String(plan.priority)} />}
            <Row label="Created" value={plan.created_date?.slice(0, 10) || '—'} />
            {plan.note && <Row label="Notes" value={plan.note} />}
          </div>

          {plan.completed_movement_id && (
            <button onClick={() => navigate(`/movement/${plan.completed_movement_id}`)} className="w-full text-center text-xs text-stone-500 underline pt-2 border-t border-stone-100">
              View completed movement record →
            </button>
          )}

          {isAdmin && isActive && (
            <div className="flex gap-3 pt-2 border-t border-stone-100 text-xs">
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-stone-600"><Pencil className="w-3.5 h-3.5" /> Edit Plan</button>
              <button onClick={cancel} className="flex items-center gap-1 text-stone-500"><XCircle className="w-3.5 h-3.5" /> Cancel</button>
              <button onClick={del} className="flex items-center gap-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              <button onClick={() => setCompleting(true)} className="flex items-center gap-1 text-emerald-600 font-semibold ml-auto"><CheckCircle2 className="w-3.5 h-3.5" /> Complete Movement</button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <AddPlannedMovementDialog open onOpenChange={(v) => !v && setEditing(false)} plan={plan} farms={farms} camps={camps} animals={animals} onDone={load} />
      )}
      {completing && (
        <CompleteMovementDialog open onOpenChange={(v) => !v && setCompleting(false)} plan={plan} farms={farms} camps={camps} animals={animals} onDone={load} />
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