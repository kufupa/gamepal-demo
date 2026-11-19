import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Collapsible section for the animal profile. Compact when collapsed, expands
// on click. Optional rightAction renders a small control (e.g. "Add") beside
// the chevron without triggering the toggle.
export default function AnimalAccordion({ title, count, defaultOpen = false, children, rightAction }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="auc-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setOpen(!open)} className="flex-1 text-left">
          <span className="auc-section-label">{title}{count != null && ` (${count})`}</span>
        </button>
        <div className="flex items-center gap-2">
          {rightAction}
          <button onClick={() => setOpen(!open)} className="p-1">
            <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}