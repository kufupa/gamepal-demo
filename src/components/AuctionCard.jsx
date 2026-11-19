import { Gavel } from 'lucide-react';

export default function AuctionCard({ auction, farmName, isAdmin, onEdit, onDelete, onOpen, showLabel = false, finance, canViewFinance = true }) {
  const animals = auction.total_animals || 0;
  const species = auction.total_species || 0;
  return (
    <div className="auc-record p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase text-stone-600">
          <Gavel className="w-3.5 h-3.5 text-stone-500" /> {showLabel ? 'LIVE SALE – AUCTION' : 'AUCTION'}
        </span>
        <span className="text-xs text-stone-400">{auction.auction_date}</span>
      </div>
      <p className="text-sm font-semibold text-stone-900 uppercase tracking-wide">{auction.name}</p>
      <p className="text-xs text-stone-500 mt-0.5">{farmName(auction.farm_id)}{auction.sold_at ? ` · ${auction.sold_at}` : ''}</p>
      <p className="text-xs text-stone-500 mt-0.5">{animals} animal{animals === 1 ? '' : 's'} · {species} specie{species === 1 ? '' : 's'}</p>
      {canViewFinance && (finance?.total_revenue || 0) > 0 && <p className="text-xs text-stone-700 font-medium mt-0.5">Total: R {Number(finance.total_revenue).toLocaleString()}</p>}
      <button onClick={onOpen} className="text-xs text-stone-500 underline mt-1">View details</button>
      {isAdmin && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-stone-100 text-xs">
          <button onClick={onEdit} className="text-stone-500">Edit</button>
          <button onClick={onDelete} className="text-red-500">Delete</button>
        </div>
      )}
    </div>
  );
}