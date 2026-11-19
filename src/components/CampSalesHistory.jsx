import moment from 'moment';
import { ChevronRight } from 'lucide-react';

// Combines existing Sale records with Auction Event line items that came
// from this camp, sorted newest event date first. Each Auction entry shows
// only the line items belonging to THIS camp (camp-specific amount) and
// links to the single original Auction Event detail — no duplicate records.
export default function CampSalesHistory({ sales, auctions, campId, navigate, saleFinance = {}, auctionFinance = {}, canViewFinance = true }) {
  const saleItems = sales.map((s) => ({
    kind: 'sale',
    date: s.date || '',
    created: s.created_date || '',
    sale: s,
  }));

  const auctionItems = auctions
    .map((a) => {
      const campItems = (a.line_items || []).filter((li) => li.camp_id === campId);
      if (campItems.length === 0) return null;
      const totalQty = campItems.reduce((s, li) => s + (li.quantity || 0), 0);
      const finLines = auctionFinance[a.id]?.line_items || [];
      const campRevenue = campItems.reduce((s, li) => s + (Number(finLines.find((f) => f.line_id === li.id)?.line_total) || 0), 0);
      const species = [...new Set(campItems.map((li) => li.species).filter(Boolean))];
      const classes = [...new Set(campItems.map((li) => li.animal_class).filter(Boolean))];
      let summary;
      if (campItems.length === 1) {
        const li = campItems[0];
        summary = `${li.quantity} ${li.species} ${li.animal_class || ''}`.trim();
      } else if (species.length === 1 && classes.length === 1) {
        summary = `${totalQty} ${species[0]} ${classes[0]}`.trim();
      } else {
        summary = `${totalQty} animals · ${campItems.length} lots`;
      }
      return {
        kind: 'auction',
        date: a.auction_date || '',
        created: a.created_date || '',
        auction: a,
        summary,
        campRevenue,
        totalQty,
      };
    })
    .filter(Boolean);

  const combined = [...saleItems, ...auctionItems].sort(
    (a, b) => (b.date || '').localeCompare(a.date || '') || (b.created || '').localeCompare(a.created || '')
  );

  if (combined.length === 0) {
    return <p className="text-stone-400 text-sm italic">No sales recorded from this camp</p>;
  }

  return (
    <div className="space-y-2">
      {combined.map((it) =>
        it.kind === 'sale' ? (
          <button
            key={'s' + it.sale.id}
            type="button"
            onClick={() => navigate(`/sale/${it.sale.id}?from=/camp/${campId}`)}
            className="w-full text-left bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm hover:bg-stone-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-amber-700">
                Sold — {it.sale.type === 'bulk' ? `${it.sale.quantity} ${it.sale.species} ${it.sale.animal_class || ''}` : `${it.sale.quantity || 1} tagged · ${((it.sale.animal_tags && it.sale.animal_tags.length > 0) ? it.sale.animal_tags : [it.sale.animal_tag]).filter(Boolean).join(', ') || 'animal'}`}
              </span>
              <span className="text-xs text-stone-400">{it.sale.date}</span>
            </div>
            {canViewFinance && (saleFinance[it.sale.id]?.total_price || 0) > 0 && <p className="text-stone-800 font-semibold text-xs mt-0.5">R {Number(saleFinance[it.sale.id].total_price).toLocaleString()}</p>}
            {it.sale.notes && <p className="text-stone-500 text-xs mt-0.5 italic">{it.sale.notes}</p>}
          </button>
        ) : (
          <button
            key={'a' + it.auction.id}
            type="button"
            onClick={() => navigate(`/auction/${it.auction.id}?from=/camp/${campId}`)}
            className="w-full text-left bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm hover:bg-stone-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 uppercase tracking-wide text-xs">{it.auction.name}</span>
              <span className="text-xs text-stone-400">{moment(it.auction.auction_date).format('D MMM YYYY')}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-stone-600 text-xs">{it.summary}</span>
              {canViewFinance && <span className="text-stone-800 font-semibold text-xs">R {Number(it.campRevenue).toLocaleString()}</span>}
            </div>
            <span className="inline-flex items-center gap-0.5 text-amber-600 text-[11px] font-medium mt-1">
              View Details <ChevronRight className="w-3 h-3" />
            </span>
          </button>
        )
      )}
    </div>
  );
}