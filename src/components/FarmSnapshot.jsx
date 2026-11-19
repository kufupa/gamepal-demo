export default function FarmSnapshot({ sizeHa, totalAnimals, totalSpecies, totalCamps }) {
  const cells = [
    { label: 'ha', value: sizeHa != null && sizeHa !== '' ? Number(sizeHa).toLocaleString() : '—' },
    { label: 'animals', value: totalAnimals },
    { label: 'species', value: totalSpecies },
    { label: 'camps', value: totalCamps },
  ];
  return (
    <div className="grid grid-cols-4 gap-1 auc-card px-2.5 py-3">
      {cells.map((c, i) => (
        <div key={i} className="text-center px-1">
          <p className="text-[15px] font-black text-stone-900 leading-none">{c.value}</p>
          <p className="text-[10px] text-stone-500 mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  );
}