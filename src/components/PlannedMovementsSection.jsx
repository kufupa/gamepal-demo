import PlannedMovementGroups from '@/components/PlannedMovementGroups';

// Renders a compact list of active planned movements for a farm or camp.
// mode: 'farm' | 'camp'
export default function PlannedMovementsSection({ plans, mode, farms = [], camps = [], campId, navigate }) {
  const active = plans.filter((p) => p.status === 'Planned');
  if (active.length === 0) {
    return <p className="text-stone-400 text-sm italic">No planned movements.</p>;
  }
  return (
    <PlannedMovementGroups plans={active} mode={mode} camps={camps} campId={campId} navigate={navigate} />
  );
}