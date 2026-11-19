import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import EditMortalityDialog from '@/components/EditMortalityDialog';
import { useUserRole } from '@/lib/useUserRole';

export default function MortalityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [mortality, setMortality] = useState(null);
  const [animal, setAnimal] = useState(null);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const from = new URLSearchParams(window.location.search).get('from');
  const goBack = () => navigate(from || '/mortality');

  const load = async () => {
    setLoading(true);
    let m = null;
    try {
      m = await base44.entities.Mortality.get(id);
      setMortality(m);
    } catch {
      setMortality(null);
    }
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setCamps(await base44.entities.Camp.list('-created_date', 300));
    // For a tagged individual mortality, load the linked animal to surface sex + breeding-male status.
    if (m?.type === 'individual' && m.animal_id) {
      try { setAnimal(await base44.entities.Animal.get(m.animal_id)); } catch { setAnimal(null); }
    } else {
      setAnimal(null);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <Layout><BrandHeader /><div className="py-16 text-center text-stone-400 text-sm">Loading…</div></Layout>;
  if (!mortality) return (
    <Layout>
      <BrandHeader subtitle="Mortality Detail" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500"><ArrowLeft className="w-4 h-4" /> Back</button>
        <p className="py-16 text-center text-stone-400 text-sm">Mortality record not found.</p>
      </div>
    </Layout>
  );

  const farmName = (fid) => farms.find((f) => f.id === fid)?.name || '—';
  const campName = (cid) => camps.find((c) => c.id === cid)?.name || '—';

  const del = async () => {
    if (!confirm('Move this mortality record to the Recycle Bin? Its population effect will be reversed and can be restored later.')) return;
    try {
      const res = await base44.functions.invoke('deleteMortality', { id: mortality.id });
      if (res?.data?.error) throw new Error(res.data.error);
      navigate(from || '/mortality');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    }
  };

  return (
    <Layout>
      <BrandHeader subtitle="Mortality Detail" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="auc-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`auc-badge ${mortality.type === 'bulk' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>
              {mortality.type === 'bulk' ? 'BULK MORTALITY' : 'INDIVIDUAL MORTALITY'}
            </span>
            <span className="text-xs text-stone-400">{mortality.date}</span>
          </div>

          <div className="pt-1 space-y-1 text-sm">
            <Row label="Date" value={mortality.date} />
            <Row label="Species" value={mortality.species || '—'} />
            {mortality.type === 'bulk' ? (
              <>
                <Row label="Classification" value={mortality.animal_class || '—'} />
                <Row label="Quantity" value={String(mortality.quantity)} />
                <Row label="Farm" value={farmName(mortality.farm_id)} />
                <Row label="Camp" value={campName(mortality.camp_id)} />
                {mortality.cause && <Row label="Cause" value={mortality.cause} />}
                {mortality.notes && <Row label="Notes" value={mortality.notes} />}
              </>
            ) : (
              <>
                <Row label="Tagged Animal" value={mortality.animal_tag || '—'} />
                <Row label="Tag Number" value={mortality.animal_tag || '—'} />
                <Row label="Sex" value={mortality.sex || animal?.sex || '—'} />
                {animal?.is_breeding_male && <Row label="Breeding Male" value="Yes" />}
                <Row label="Farm" value={farmName(mortality.farm_id)} />
                <Row label="Camp" value={campName(mortality.camp_id)} />
                {mortality.cause && <Row label="Cause" value={mortality.cause} />}
                {mortality.notes && <Row label="Notes" value={mortality.notes} />}
              </>
            )}
          </div>

          {mortality.deleted && (
            <p className="text-xs text-amber-600 pt-2 border-t border-stone-100">This record is in the Recycle Bin. Restore it from Settings → Recycle Bin to edit.</p>
          )}
          {isAdmin && !mortality.deleted && (
            <div className="flex gap-3 pt-2 border-t border-stone-100 text-xs">
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-stone-600"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={del} className="flex items-center gap-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditMortalityDialog open onOpenChange={(v) => !v && setEditing(false)} mortality={mortality} farms={farms} camps={camps} onDone={load} />
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