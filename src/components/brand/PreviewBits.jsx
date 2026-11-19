export function Section({ n, title, note, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-stone-900">
          <span className="text-stone-400 mr-1.5">{n}</span>{title}
        </h2>
        {note && <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export function Frame({ width = 448, children, className = '' }) {
  return (
    <div
      className={`mx-auto overflow-hidden border border-stone-300 bg-white ${className}`}
      style={{ width, borderRadius: 14, boxShadow: '0 10px 30px -18px rgba(0,0,0,0.35)' }}
    >
      {children}
    </div>
  );
}

export function Tag({ ok, children }) {
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-full whitespace-nowrap"
      style={{
        background: ok ? 'rgba(6,24,15,0.09)' : 'rgba(201,169,107,0.22)',
        color: ok ? '#0C2A1B' : '#7A5F2E',
      }}
    >
      {children}
    </span>
  );
}