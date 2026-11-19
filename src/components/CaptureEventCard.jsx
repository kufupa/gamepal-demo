import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';

// Compact history card for a Capture Event: header shows the event (name or
// "Capture Event — date"), total animals and line count; expanding reveals the
// individual movement lines, each still clickable through to its own detail page.
export default function CaptureEventCard({ event, lines = [], camps = [], isAdmin, onEditEvent, onDeleteEvent, onAddLine, navigate }) {
  const [open, setOpen] = useState(false);
  const campName = (id) => camps.find((c) => c.id === id)?.name || '—';
  const destLabel = (m) => (m.destination_type === 'manual' ? (m.destination_text || 'External') : campName(m.to_camp_id));
  const totalAnimals = lines.reduce((s, l) => s + (l.type === 'bulk' ? (l.quantity || 0) : (l.animal_ids?.length || 0)), 0);

  return (
    <div className="auc-record p-3">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left">
        <div className="flex items-center justify-between mb-1.5">
          <span className="auc-badge bg-amber-100 text-amber-700">CAPTURE EVENT</span>
          <span className="flex items-center gap-1 text-xs text-stone-400">
            {event.date}
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
        <p className="font-medium text-stone-800">{event.name || `Capture Event — ${event.date}`}</p>
        <p className="text-sm text-stone-500">{totalAnimals} animal(s) · {lines.length} movement line(s)</p>
      </button>
      {open && (
        <div className="mt-2 pt-2 border-t border-stone-100 space-y-2.5">
          {event.notes && <p className="text-xs text-stone-400 italic">{event.notes}</p>}
          {lines.map((m) => (
            <div key={m.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className={`auc-badge shrink-0 ${m.destination_type === 'manual' ? 'bg-stone-200 text-stone-500' : m.type === 'bulk' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>
                  {m.destination_type === 'manual' ? 'EXTERNAL' : m.type === 'bulk' ? 'BULK' : 'INDIVIDUAL'}
                </span>
                <p className="flex-1 min-w-0 text-stone-700 truncate">{campName(m.from_camp_id)} → {destLabel(m)}</p>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{m.type === 'bulk' ? `${m.quantity} ${m.species} ${m.animal_class}` : (m.animal_tags?.join(', ') || 'animals')}</p>
              <button onClick={() => navigate(`/movement/${m.id}?from=/movements`)} className="text-xs text-stone-500 underline mt-0.5">View details</button>
            </div>
          ))}
          {isAdmin && (
            <div className="flex gap-3 pt-2 border-t border-stone-100 text-xs">
              <button onClick={() => onAddLine(event)} className="flex items-center gap-1 text-stone-700"><Plus className="w-3.5 h-3.5" /> Add line</button>
              <button onClick={() => onEditEvent(event)} className="flex items-center gap-1 text-stone-500"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => onDeleteEvent(event)} className="flex items-center gap-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}