import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, Pencil, Trash2, Plus, CalendarClock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import MoveAnimalsDialog from '@/components/MoveAnimalsDialog';
import EditMovementDialog from '@/components/EditMovementDialog';
import CaptureEventCard from '@/components/CaptureEventCard';
import EditCaptureEventDialog from '@/components/EditCaptureEventDialog';
import AddPlannedMovementDialog from '@/components/AddPlannedMovementDialog';
import { useUserRole } from '@/lib/useUserRole';
import { sortByEventDateDesc, sortByPriorityAsc } from '@/lib/sortHelpers';
import PlannedMovementGroups from '@/components/PlannedMovementGroups';

export default function Movements() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [tab, setTab] = useState('planned');
  const [movements, setMovements] = useState([]);
  const [planned, setPlanned] = useState([]);
  const [farms, setFarms] = useState([]);
  const [camps, setCamps] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addingPlan, setAddingPlan] = useState(false);
  const [movementEvents, setMovementEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [addingLineTo, setAddingLineTo] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const mv = await base44.entities.Movement.list('-date', 300);
    setMovements(sortByEventDateDesc(mv.filter((m) => !m.deleted)));
    const pl = await base44.entities.PlannedMovement.list('-created_date', 300);
    setPlanned(pl);
    setMovementEvents(await base44.entities.MovementEvent.list('-created_date', 200));
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setCamps(await base44.entities.Camp.list('-created_date', 200));
    setAnimals(await base44.entities.Animal.list('-created_date', 500));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const farmName = (id) => farms.find((f) => f.id === id)?.name || '—';
  const campName = (id) => camps.find((c) => c.id === id)?.name || '—';
  const destLabel = (m) => m.destination_type === 'manual' ? (m.destination_text || 'External') : campName(m.to_camp_id);

  // History merges standalone movements with Capture Events (grouped cards).
  const liveEvents = movementEvents.filter((e) => !e.deleted);
  const eventById = new Set(liveEvents.map((e) => e.id));
  const historyItems = [
    ...movements.filter((m) => !m.movement_event_id || !eventById.has(m.movement_event_id))
      .map((m) => ({ kind: 'movement', date: m.date, movement: m })),
    ...liveEvents.map((e) => ({ kind: 'event', date: e.date, event: e, lines: movements.filter((m) => m.movement_event_id === e.id) })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const activePlans = sortByPriorityAsc(planned.filter((p) => p.status === 'Planned'));
  const completedPlans = planned.filter((p) => p.status === 'Completed');
  const cancelledPlans = planned.filter((p) => p.status === 'Cancelled');

  const deleteMovement = async (m) => {
    if (!confirm('Move this movement to the Recycle Bin? Its population effect will be reversed and can be restored later.')) return;
    try {
      const res = await base44.functions.invoke('deleteMovement', { id: m.id });
      if (res?.data?.error) throw new Error(res.data.error);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Delete failed');
    }
  };

  const deleteEvent = async (e) => {
    if (!confirm('Move this Capture Event to the Recycle Bin? The population effect of every movement line in it will be reversed and can be restored later.')) return;
    try {
      const res = await base44.functions.invoke('deleteMovementEvent', { id: e.id });
      if (res?.data?.error) throw new Error(res.data.error);
      load();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || 'Delete failed');
    }
  };

  const TabBtn = ({ value, label, count }) => (
    <button onClick={() => setTab(value)} className={`flex-1 py-2 rounded-md text-sm font-medium border ${tab === value ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>
      {label}{count != null && <span className="ml-1 text-xs opacity-70">({count})</span>}
    </button>
  );

  return (
    <Layout>
      <BrandHeader subtitle={tab === 'planned' ? `${activePlans.length} planned` : `${historyItems.length} recorded`} />
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-stone-900 text-lg">Movements</h2>
        </div>

        <div className="flex gap-2">
          <TabBtn value="planned" label="Planned" count={activePlans.length} />
          <TabBtn value="history" label="History" count={historyItems.length} />
        </div>

        {tab === 'planned' && (
          <>
            {isAdmin && (
              <button onClick={() => setAddingPlan(true)} className="flex items-center gap-1 text-sm font-medium text-stone-900">
                <Plus className="w-4 h-4" /> Add Planned Movement
              </button>
            )}

            {loading ? (
              <p className="text-center text-stone-400 text-sm py-8">Loading…</p>
            ) : activePlans.length === 0 ? (
              <div className="auc-empty">
                <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No planned movements.{isAdmin ? ' Add one to start planning ahead.' : ''}</p>
              </div>
            ) : (
              <PlannedMovementGroups plans={activePlans} mode="farm" camps={camps} navigate={navigate} />
            )}

            {(completedPlans.length > 0 || cancelledPlans.length > 0) && (
              <div className="pt-3">
                <h3 className="auc-section-label mb-2">Completed / Cancelled Plans</h3>
                <div className="space-y-2">
                  {[...completedPlans, ...cancelledPlans].map((p) => (
                    <button key={p.id} type="button" onClick={() => navigate(`/planned-movement/${p.id}?from=/movements`)} className="w-full text-left bg-stone-50 border border-stone-100 rounded-lg px-3 py-2 hover:bg-stone-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className={`auc-badge ${p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'}`}>{p.status.toUpperCase()}</span>
                        <span className="text-xs text-stone-400">{p.completed_date || p.planned_date || ''}</span>
                      </div>
                      <p className="text-sm text-stone-600 mt-0.5">
                        {p.type === 'bulk' ? `${p.quantity} ${p.species} ${p.animal_class}` : (p.animal_tags?.join(', ') || 'Tagged')} · {campName(p.from_camp_id)} → {p.destination_type === 'manual' ? (p.destination_text || 'External') : campName(p.to_camp_id)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            {isAdmin && (
              <div className="flex flex-wrap gap-4">
                <button onClick={() => setRecording(true)} className="flex items-center gap-1 text-sm font-medium text-stone-900">
                  <Plus className="w-4 h-4" /> Record Move
                </button>
                <button onClick={() => navigate('/capture-event/new')} className="flex items-center gap-1 text-sm font-medium text-stone-900">
                  <Plus className="w-4 h-4" /> Record Capture Event
                </button>
              </div>
            )}
            {loading ? (
              <p className="text-center text-stone-400 text-sm py-8">Loading…</p>
            ) : historyItems.length === 0 ? (
              <div className="auc-empty">
                <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No movements recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyItems.map((it) => {
                  if (it.kind === 'event') return (
                    <CaptureEventCard
                      key={`ev-${it.event.id}`}
                      event={it.event}
                      lines={it.lines}
                      camps={camps}
                      isAdmin={isAdmin}
                      onEditEvent={setEditingEvent}
                      onDeleteEvent={deleteEvent}
                      onAddLine={setAddingLineTo}
                      navigate={navigate}
                    />
                  );
                  const m = it.movement;
                  return (
                  <div key={m.id} className="auc-record p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`auc-badge ${m.type === 'bulk' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'} ${m.destination_type === 'manual' ? 'bg-stone-200 text-stone-500' : ''}`}>
                        {m.destination_type === 'manual' ? 'EXTERNAL' : m.type === 'bulk' ? 'BULK' : 'INDIVIDUAL'}
                      </span>
                      <span className="text-xs text-stone-400">{m.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-800 truncate">{campName(m.from_camp_id)}</p>
                        <p className="text-xs text-stone-400">{farmName(m.from_farm_id)}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
                      <div className="flex-1 min-w-0 text-right">
                        <p className="font-medium text-stone-800 truncate">{destLabel(m)}</p>
                        <p className="text-xs text-stone-400">{m.destination_type === 'manual' ? 'External' : farmName(m.to_farm_id)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-stone-600 mt-2">
                      {m.type === 'bulk'
                        ? <>{m.quantity} {m.species} {m.animal_class}</>
                        : <>{m.animal_tags?.join(', ') || 'animals'}</>}
                    </p>
                    {m.note && <p className="text-xs text-stone-400 mt-1 italic">{m.note}</p>}
                    <button onClick={() => navigate(`/movement/${m.id}?from=/movements`)} className="text-xs text-stone-500 underline mt-1">View details</button>
                    {isAdmin && (
                      <div className="flex gap-3 mt-2 pt-2 border-t border-stone-100 text-xs">
                        <button onClick={() => setEditing(m)} className="flex items-center gap-1 text-stone-500"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                        <button onClick={() => deleteMovement(m)} className="flex items-center gap-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <EditMovementDialog open onOpenChange={(v) => !v && setEditing(null)} movement={editing} farms={farms} camps={camps} onDone={load} />
      )}
      {recording && (
        <MoveAnimalsDialog
          open
          onOpenChange={(v) => !v && setRecording(false)}
          camp={null}
          farm={null}
          allCamps={camps}
          campGroups={[]}
          campAnimals={[]}
          allAnimals={animals}
          onDone={load}
        />
      )}
      {editingEvent && (
        <EditCaptureEventDialog open onOpenChange={(v) => !v && setEditingEvent(null)} event={editingEvent} onDone={load} />
      )}
      {addingLineTo && (
        <MoveAnimalsDialog
          open
          onOpenChange={(v) => !v && setAddingLineTo(null)}
          movementEventId={addingLineTo.id}
          camp={null}
          farm={null}
          allCamps={camps}
          campGroups={[]}
          campAnimals={[]}
          allAnimals={animals}
          onDone={load}
        />
      )}
      {addingPlan && (
        <AddPlannedMovementDialog open onOpenChange={(v) => !v && setAddingPlan(false)} farms={farms} camps={camps} animals={animals} onDone={load} />
      )}
    </Layout>
  );
}