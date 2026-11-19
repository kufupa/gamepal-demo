import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skull, Pencil, Trash2 } from 'lucide-react';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import RecordMortalityDialog from '@/components/RecordMortalityDialog';
import EditMortalityDialog from '@/components/EditMortalityDialog';
import MortalityReport from '@/components/MortalityReport';
import { base44 } from '@/api/base44Client';
import { useUserRole } from '@/lib/useUserRole';
import { sortByEventDateDesc } from '@/lib/sortHelpers';

export default function Mortality() {
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [tab, setTab] = useState('record');
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState(null);
  const [recent, setRecent] = useState([]);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);

  const load = async () => {
    const mo = await base44.entities.Mortality.list('-date', 500);
    setRecent(sortByEventDateDesc(mo.filter((m) => !m.deleted)));
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setCamps(await base44.entities.Camp.list('-created_date', 200));
  };
  useEffect(() => { load(); }, []);

  const farmName = (id) => farms.find((f) => f.id === id)?.name || '—';
  const campName = (id) => camps.find((c) => c.id === id)?.name || '—';

  const deleteMortality = async (m) => {
    if (!confirm('Move this mortality record to the Recycle Bin? Its population effect will be reversed and can be restored later.')) return;
    try {
      const res = await base44.functions.invoke('deleteMortality', { id: m.id });
      if (res?.data?.error) throw new Error(res.data.error);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    }
  };

  return (
    <Layout>
      <BrandHeader subtitle="Mortality" />
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Skull className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-stone-900 text-lg">Mortality</h2>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setTab('record')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${tab === 'record' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Record</button>
          <button onClick={() => setTab('report')} className={`flex-1 py-2 rounded-md text-sm font-medium border ${tab === 'report' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Report</button>
        </div>

        {tab === 'record' ? (
          <>
            {isAdmin && (
              <button onClick={() => setRecording(true)} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium bg-stone-900 text-stone-50">
                <Skull className="w-4 h-4" /> Record Mortality
              </button>
            )}
            <div>
              <h3 className="auc-section-label mb-2">Recent ({recent.length})</h3>
              {recent.length === 0 ? (
                <p className="text-stone-400 text-sm italic">No mortality recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {recent.slice(0, 12).map((m) => (
                    <div key={m.id} className="auc-record p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`auc-badge ${m.type === 'bulk' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>
                          {m.type === 'bulk' ? 'BULK' : 'TAGGED'}
                        </span>
                        <span className="text-xs text-stone-400">{m.date}</span>
                      </div>
                      <p className="text-sm font-medium text-stone-800">
                        {m.type === 'bulk' ? `${m.quantity} ${m.species} ${m.animal_class || ''}` : `${m.animal_tag} · ${m.species}`}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">{farmName(m.farm_id)} → {campName(m.camp_id)}</p>
                      {m.cause && <p className="text-xs text-stone-500">Cause: {m.cause}</p>}
                      <button onClick={() => navigate(`/mortality/${m.id}?from=/mortality`)} className="text-xs text-stone-500 underline mt-1">View details</button>
                      {isAdmin && (
                        <div className="flex gap-3 mt-2 pt-2 border-t border-stone-100 text-xs">
                          <button onClick={() => setEditing(m)} className="flex items-center gap-1 text-stone-500"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                          <button onClick={() => deleteMortality(m)} className="flex items-center gap-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <MortalityReport />
        )}
      </div>

      {editing && <EditMortalityDialog open onOpenChange={(v) => !v && setEditing(null)} mortality={editing} farms={farms} camps={camps} onDone={load} />}
      {recording && <RecordMortalityDialog open onOpenChange={(v) => !v && setRecording(false)} onDone={load} />}
    </Layout>
  );
}