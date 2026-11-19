import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, XCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import AddPlannedSaleDialog from '@/components/AddPlannedSaleDialog';
import CompletePlannedSaleDialog from '@/components/CompletePlannedSaleDialog';
import { useUserRole } from '@/lib/useUserRole';

export default function PlannedSaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canViewFinance } = useUserRole();
  const [plan, setPlan] = useState(null);
  const [finance, setFinance] = useState(null);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);

  const from = new URLSearchParams(window.location.search).get('from');
  const goBack = () => navigate(from || '/sales');

  const load = async () => {
    setLoading(true);
    try { setPlan(await base44.entities.PlannedSale.get(id)); } catch { setPlan(null); }
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setCamps(await base44.entities.Camp.list('-created_date', 300));
    setAnimals(await base44.entities.Animal.list('-created_date', 500));
    if (canViewFinance) {
      const fin = await base44.entities.PlannedSaleFinance.filter({ planned_sale_id: id });
      setFinance(fin[0] || null);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <Layout><BrandHeader /><div className="py-16 text-center text-stone-400 text-sm">Loading…</div></Layout>;
  if (!plan) return (
    <Layout>
      <BrandHeader subtitle="Planned Sale" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500"><ArrowLeft className="w-4 h-4" /> Back</button>
        <p className="py-16 text-center text-stone-400 text-sm">Planned sale not found.</p>
      </div>
    </Layout>
  );

  const farmName = (fid) => farms.find((f) => f.id === fid)?.name || '—';
  const campName = (cid) => camps.find((c) => c.id === cid)?.name || '—';
  const isActive = plan.status === 'Planned';
  const subject = plan.type === 'bulk'
    ? `${plan.quantity || 0} ${plan.species || ''} ${plan.animal_class || ''}`.trim()
    : (plan.type === 'individual' && ((plan.animal_tags?.length) || (plan.animal_id ? 1 : 0)) > 1
        ? `${plan.quantity || plan.animal_tags?.length || 0} tagged · ${(plan.animal_tags && plan.animal_tags.length > 0 ? plan.animal_tags : [plan.animal_tag]).filter(Boolean).join(', ')}`
        : (plan.animal_tag || 'Tagged animal'));

  const cancel = async () => {
    if (!confirm('Cancel this planned sale? It has not affected any totals, so no populations will change.')) return;
    try {
      await base44.entities.PlannedSale.update(plan.id, { status: 'Cancelled' });
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Cancel failed');
    }
  };

  const del = async () => {
    if (!confirm('Delete this planned sale? It has not affected any totals, so no populations will change.')) return;
    try {
      await base44.entities.PlannedSale.delete(plan.id);
      await base44.entities.PlannedSaleFinance.deleteMany({ planned_sale_id: plan.id });
      navigate(from || '/sales');
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
      <BrandHeader subtitle="Planned Sale" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="auc-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`auc-badge ${statusBadge}`}>{plan.status.toUpperCase()}</span>
            {plan.completed_date && <span className="text-xs text-stone-400">Completed {plan.completed_date}</span>}
          </div>

          <p className="text-lg font-bold text-stone-900">{subject}</p>

          <div className="flex items-center gap-2 text-sm text-stone-600">
            <span className="truncate">{farmName(plan.farm_id)} → {campName(plan.camp_id)}</span>
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-1 text-sm">
            <Row label="Type" value={plan.type === 'bulk' ? 'Bulk / Untagged' : 'Tagged Animals'} />
            <Row label="Species" value={plan.species || '—'} />
            {plan.type === 'bulk' ? (
              <>
                <Row label="Class" value={plan.animal_class || '—'} />
                <Row label="Quantity" value={String(plan.quantity ?? '—')} />
              </>
            ) : (
              <Row label="Quantity" value={String(plan.quantity ?? '—')} />
            )}
            <Row label="Intended Sale Type" value={plan.sale_type || '—'} />
            <Row label="Intended Auction / Buyer / Venue" value={plan.buyer_venue || '—'} />
            {canViewFinance && (
              <>
                <Row label="Target Price per Animal" value={`R ${Number(finance?.target_price || 0).toLocaleString()}`} />
                <Row label="Expected Total" value={`R ${Number(finance?.expected_total || 0).toLocaleString()}`} />
              </>
            )}
            <Row label="Planned Date" value={plan.planned_date ? moment(plan.planned_date).format('D MMM YYYY') : 'Not set'} />
            {plan.note && <Row label="Notes" value={plan.notes} />}
          </div>

          {plan.type === 'individual' && (
            <div className="pt-2 border-t border-stone-100">
              <p className="auc-section-label mb-1.5">Tagged Animals ({plan.quantity || (plan.animal_tags?.length || 1)})</p>
              <div className="flex flex-wrap gap-1.5">
                {((plan.animal_tags && plan.animal_tags.length > 0) ? plan.animal_tags : (plan.animal_tag ? [plan.animal_tag] : [])).map((t, i) => (
                  <span key={i} className="bg-stone-100 text-stone-700 text-xs font-medium px-2 py-0.5 rounded-full">{t || '—'}</span>
                ))}
              </div>
            </div>
          )}

          {plan.completed_sale_id && (
            <button onClick={() => navigate(`/sale/${plan.completed_sale_id}?from=/planned-sale/${plan.id}`)} className="w-full text-center text-xs text-stone-500 underline pt-2 border-t border-stone-100">
              View completed sale record →
            </button>
          )}

          {isAdmin && isActive && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-stone-100 text-xs">
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-stone-600"><Pencil className="w-3.5 h-3.5" /> Edit Plan</button>
              <button onClick={cancel} className="flex items-center gap-1 text-stone-500"><XCircle className="w-3.5 h-3.5" /> Cancel</button>
              <button onClick={del} className="flex items-center gap-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              <button onClick={() => setCompleting(true)} className="flex items-center gap-1 text-emerald-600 font-semibold ml-auto"><CheckCircle2 className="w-3.5 h-3.5" /> Complete Sale</button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <AddPlannedSaleDialog open onOpenChange={(v) => !v && setEditing(false)} plan={plan} finance={finance} farms={farms} camps={camps} animals={animals} onDone={load} />
      )}
      {completing && (
        <CompletePlannedSaleDialog open onOpenChange={(v) => !v && setCompleting(false)} plan={plan} finance={finance} farms={farms} camps={camps} animals={animals} onDone={load} />
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