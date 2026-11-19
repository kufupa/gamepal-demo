import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import EditSaleDialog from '@/components/EditSaleDialog';
import { useUserRole } from '@/lib/useUserRole';

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canViewFinance } = useUserRole();
  const [sale, setSale] = useState(null);
  const [finance, setFinance] = useState(null);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const from = new URLSearchParams(window.location.search).get('from');
  const goBack = () => navigate(from || '/sales');

  const load = async () => {
    setLoading(true);
    try {
      setSale(await base44.entities.Sale.get(id));
    } catch {
      setSale(null);
    }
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setCamps(await base44.entities.Camp.list('-created_date', 300));
    setAnimals(await base44.entities.Animal.list('-created_date', 500));
    if (canViewFinance) {
      const fin = await base44.entities.SaleFinance.filter({ sale_id: id });
      setFinance(fin[0] || null);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <Layout><BrandHeader /><div className="py-16 text-center text-stone-400 text-sm">Loading…</div></Layout>;
  if (!sale) return (
    <Layout>
      <BrandHeader subtitle="Sale Detail" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500"><ArrowLeft className="w-4 h-4" /> Back</button>
        <p className="py-16 text-center text-stone-400 text-sm">Sale not found.</p>
      </div>
    </Layout>
  );

  const farmName = (fid) => farms.find((f) => f.id === fid)?.name || '—';
  const campName = (cid) => camps.find((c) => c.id === cid)?.name || '—';

  const del = async () => {
    if (!confirm('Move this sale to the Recycle Bin? Its population effect and revenue will be reversed and can be restored later.')) return;
    try {
      const res = await base44.functions.invoke('deleteSale', { id: sale.id });
      if (res?.data?.error) throw new Error(res.data.error);
      navigate(from || '/sales');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    }
  };

  return (
    <Layout>
      <BrandHeader subtitle="Sale Detail" />
      <div className="px-4 py-4 space-y-4">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-stone-500">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="auc-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`auc-badge ${sale.type === 'bulk' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>
              {sale.type === 'bulk' ? 'BULK SALE' : 'TAGGED SALE'}
            </span>
            <span className="text-xs text-stone-400">{sale.date}</span>
          </div>

          <div className="pt-1 space-y-1 text-sm">
            <Row label="Date" value={sale.date} />
            <Row label="Farm" value={farmName(sale.farm_id)} />
            <Row label="Camp" value={campName(sale.camp_id)} />
            <Row label="Species" value={sale.species || '—'} />
            {sale.type === 'bulk' ? (
              <>
                <Row label="Classification" value={sale.animal_class || '—'} />
                <Row label="Quantity" value={String(sale.quantity)} />
              </>
            ) : (
              <Row label="Quantity" value={String(sale.quantity)} />
            )}
            <Row label="Sale Type" value={sale.sale_type || '—'} />
            <Row label="Sold At / Buyer" value={sale.sold_at || '—'} />
            {canViewFinance && (
              <>
                <Row label="Price per Animal" value={`R ${Number(finance?.unit_price || 0).toLocaleString()}`} />
                <Row label="Total Sale Amount" value={`R ${Number(finance?.total_price || 0).toLocaleString()}`} />
              </>
            )}
            {sale.notes && <Row label="Notes" value={sale.notes} />}
          </div>

          {sale.type === 'individual' && (
            <div className="pt-2 border-t border-stone-100">
              <p className="auc-section-label mb-1.5">Tagged Animals ({sale.quantity || (sale.animal_tags?.length || 1)})</p>
              <div className="flex flex-wrap gap-1.5">
                {((sale.animal_tags && sale.animal_tags.length > 0) ? sale.animal_tags : (sale.animal_tag ? [sale.animal_tag] : [])).map((t, i) => (
                  <span key={i} className="bg-stone-100 text-stone-700 text-xs font-medium px-2 py-0.5 rounded-full">{t || '—'}</span>
                ))}
              </div>
            </div>
          )}

          {sale.deleted && (
            <p className="text-xs text-amber-600 pt-2 border-t border-stone-100">This record is in the Recycle Bin. Restore it from Settings → Recycle Bin to edit.</p>
          )}
          {isAdmin && !sale.deleted && (
            <div className="flex gap-3 pt-2 border-t border-stone-100 text-xs">
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-stone-600"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={del} className="flex items-center gap-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditSaleDialog open onOpenChange={(v) => !v && setEditing(false)} sale={sale} farms={farms} camps={camps} animals={animals} onDone={load} />
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