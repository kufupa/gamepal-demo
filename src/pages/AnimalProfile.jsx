import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, MapPin, GitBranch } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import AnimalPhoto from '@/components/AnimalPhoto';
import AnimalAccordion from '@/components/AnimalAccordion';
import HornMeasurementSection from '@/components/HornMeasurementSection';
import AnimalDocumentsSection from '@/components/AnimalDocumentsSection';
import EditAnimalDialog from '@/components/EditAnimalDialog';
import { formatInches } from '@/lib/hornMeasurements';
import { useUserRole } from '@/lib/useUserRole';

export default function AnimalProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canViewFinance } = useUserRole();
  const [animal, setAnimal] = useState(null);
  const [farms, setFarms] = useState([]);
  const [allCamps, setAllCamps] = useState([]);
  const [allAnimals, setAllAnimals] = useState([]);
  const [sire, setSire] = useState(null);
  const [dam, setDam] = useState(null);
  const [sireSire, setSireSire] = useState(null);
  const [damSire, setDamSire] = useState(null);
  const [offspring, setOffspring] = useState([]);
  const [movements, setMovements] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [purchaseFinance, setPurchaseFinance] = useState(null);
  const [editing, setEditing] = useState(false);
  const [deleteState, setDeleteState] = useState(null);

  const load = async () => {
    const a = await base44.entities.Animal.get(id);
    setAnimal(a);
    setFarms(await base44.entities.Farm.list('-created_date', 100));
    setAllCamps(await base44.entities.Camp.list('-created_date', 200));
    if (a.sire_id) { try { setSire(await base44.entities.Animal.get(a.sire_id)); } catch { setSire(null); } } else setSire(null);
    if (a.dam_id) { try { setDam(await base44.entities.Animal.get(a.dam_id)); } catch { setDam(null); } } else setDam(null);
    if (a.sire_sire_id) { try { setSireSire(await base44.entities.Animal.get(a.sire_sire_id)); } catch { setSireSire(null); } } else setSireSire(null);
    if (a.dam_sire_id) { try { setDamSire(await base44.entities.Animal.get(a.dam_sire_id)); } catch { setDamSire(null); } } else setDamSire(null);
    const all = await base44.entities.Animal.list('-created_date', 500);
    setAllAnimals(all);
    setOffspring(all.filter((x) => x.sire_id === id || x.dam_id === id));
    const mv = await base44.entities.Movement.list('-date', 300);
    setMovements(mv.filter((m) => m.animal_ids?.includes(id)));
    const meas = await base44.entities.HornMeasurement.filter({ animal_id: id });
    meas.sort((a, b) => (b.measurement_date || '').localeCompare(a.measurement_date || ''));
    setMeasurements(meas);
    setDocuments(await base44.entities.AnimalDocument.filter({ animal_id: id }));
    if (canViewFinance) {
      const fin = await base44.entities.AnimalPurchaseFinance.filter({ animal_id: id });
      setPurchaseFinance(fin[0] || null);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (!animal) return <Layout><BrandHeader /><div className="py-16 text-center text-stone-400 text-sm">Loading animal…</div></Layout>;

  const farmName = (fid) => farms.find((f) => f.id === fid)?.name || '—';
  const campName = (cid) => allCamps.find((c) => c.id === cid)?.name || '—';

  const prepareDelete = async () => {
    setDeleteState('checking');
    const reasons = [];
    const [bySire, byDam, sales, mort, allMoves] = await Promise.all([
      base44.entities.Animal.filter({ sire_id: id }).catch(() => []),
      base44.entities.Animal.filter({ dam_id: id }).catch(() => []),
      base44.entities.Sale.filter({ animal_id: id }).catch(() => []),
      base44.entities.Mortality.filter({ animal_id: id }).catch(() => []),
      base44.entities.Movement.list('-date', 500).catch(() => []),
    ]);
    const offspringCount = bySire.length + byDam.length;
    if (offspringCount) reasons.push(`${offspringCount} tagged offspring`);
    const moves = allMoves.filter((m) => m.animal_ids?.includes(id));
    if (moves.length) reasons.push(`${moves.length} movement record(s)`);
    if (sales.length) reasons.push(`${sales.length} sale record(s)`);
    if (mort.length) reasons.push(`${mort.length} mortality record(s)`);
    if (reasons.length) setDeleteState({ blocked: reasons }); else setDeleteState('confirm');
  };

  const doDelete = async () => {
    setDeleteState('deleting');
    try {
      await base44.entities.Animal.delete(id);
      await base44.entities.AnimalPurchaseFinance.deleteMany({ animal_id: id });
      navigate('/animals');
    } catch (e) {
      setDeleteState({ error: e?.response?.data?.error || e.message || 'Delete failed' });
    }
  };

  const isDeceased = animal.status === 'Deceased';
  const sireCandidates = allAnimals.filter((a) => a.sex === 'Male' && a.id !== id && a.status !== 'Deceased');
  const damCandidates = allAnimals.filter((a) => a.sex === 'Female' && a.id !== id && a.status !== 'Deceased');

  const latestMeas = measurements[0];
  const hornSummary = latestMeas
    ? (latestMeas.inches != null
      ? formatInches(latestMeas.inches)
      : [latestMeas.horn_length_left != null && `L ${formatInches(latestMeas.horn_length_left)}`, latestMeas.horn_length_right != null && `R ${formatInches(latestMeas.horn_length_right)}`, latestMeas.tip_to_tip != null && `T2T ${formatInches(latestMeas.tip_to_tip)}`].filter(Boolean).join(' · '))
    : (animal.horn_length || animal.tip_to_tip
      ? [animal.horn_length && `Horn ${animal.horn_length}"`, animal.tip_to_tip && `T2T ${animal.tip_to_tip}"`].filter(Boolean).join(' · ')
      : null);

  return (
    <Layout>
      <BrandHeader subtitle="Individual Animal" />
      <div className="px-4 py-4 space-y-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-stone-500">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Top Summary Card */}
        <div className="bg-stone-900 text-stone-50 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-3xl font-black tracking-tight">{animal.tag_number}</p>
              <p className="text-stone-300 text-sm mt-0.5">{animal.species}</p>
              <p className="text-xs text-stone-400 mt-1">{animal.sex === 'Male' ? '♂ Male' : '♀ Female'}{animal.is_breeding_male && ' · Breeding Male'}</p>
              {animal.tag_colour && <p className="text-xs text-stone-400">Tag Colour: {animal.tag_colour}</p>}
              {hornSummary && <p className="text-xs text-stone-400 mt-1">Horn: {hornSummary}</p>}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} aria-label="Edit this animal" className="p-2 bg-stone-800 rounded-lg"><Pencil className="w-4 h-4" /></button>
                <button onClick={prepareDelete} aria-label="Delete this animal" className="p-2 bg-stone-800 rounded-lg text-red-300"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
          {animal.birth_year && <p className="text-xs text-stone-400 mt-2">Born {animal.date_of_birth || animal.birth_year}</p>}
          {isDeceased && (
            <div className="mt-3 bg-red-900/60 border border-red-700 rounded-md px-3 py-2">
              <p className="text-sm font-bold">Deceased</p>
              <p className="text-xs text-red-200">Died {animal.deceased_date || '—'} · Last at {farmName(animal.last_farm_id)} → {campName(animal.last_camp_id)}</p>
            </div>
          )}
        </div>

        {/* Photo */}
        <AnimalPhoto animal={animal} isAdmin={isAdmin} onUpdated={(a) => setAnimal(a)} />

        {/* 1. Parentage */}
        <AnimalAccordion title="Parentage">
          <ParentDisplay label="Sire" linked={sire} manual={animal.sire_manual} onLink={() => sire && navigate(`/animal/${sire.id}`)} />
          <ParentDisplay label="Dam" linked={dam} manual={animal.dam_manual} onLink={() => dam && navigate(`/animal/${dam.id}`)} />
          <ParentDisplay label="Sire's Sire" linked={sireSire} manual={animal.sire_sire_manual} onLink={() => sireSire && navigate(`/animal/${sireSire.id}`)} />
          <ParentDisplay label="Dam's Sire" linked={damSire} manual={animal.dam_sire_manual} onLink={() => damSire && navigate(`/animal/${damSire.id}`)} />
        </AnimalAccordion>

        {/* 2. Horn Measurements */}
        <HornMeasurementSection animal={animal} measurements={measurements} isAdmin={isAdmin} onReload={load} />

        {/* 3. Purchase Information */}
        <AnimalAccordion title="Purchase Information">
          <Row label="Auction / Sale" value={animal.purchase_auction_sale || '—'} />
          <Row label="Seller / Breeder" value={animal.purchase_seller || '—'} />
          {canViewFinance && <Row label="Purchase Price" value={purchaseFinance?.purchase_price != null ? `R ${Number(purchaseFinance.purchase_price).toLocaleString()}` : '—'} />}
          <Row label="Purchase Date" value={animal.purchase_date || '—'} />
          {canViewFinance && purchaseFinance?.purchase_notes && <p className="text-sm text-stone-600 mt-2 whitespace-pre-wrap">{purchaseFinance.purchase_notes}</p>}
        </AnimalAccordion>

        {/* 4. Identification */}
        <AnimalAccordion title="Identification">
          <Row label="Tag Number" value={animal.tag_number} highlight />
          <Row label="Microchip" value={animal.microchip_number || '—'} />
          <Row label="DNA Lab Number" value={animal.dna_lab_number || '—'} />
        </AnimalAccordion>

        {/* Documents */}
        <AnimalDocumentsSection animal={animal} documents={documents} isAdmin={isAdmin} onReload={load} />

        {/* 5. Location */}
        <AnimalAccordion title="Location">
          <Row label="Current" value={`${farmName(animal.current_farm_id)} → ${campName(animal.current_camp_id)}`} highlight />
          <Row label="Origin" value={`${farmName(animal.origin_farm_id)} → ${campName(animal.origin_camp_id)}`} muted />
        </AnimalAccordion>

        {/* 6. Tagged Offspring */}
        <AnimalAccordion title="Tagged Offspring" count={offspring.length}>
          {offspring.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No tagged offspring recorded</p>
          ) : (
            <div className="space-y-1.5">
              {offspring.map((o) => (
                <button key={o.id} onClick={() => navigate(`/animal/${o.id}`)} className="w-full text-left flex items-center justify-between bg-white border border-stone-200 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-semibold text-sm">{o.tag_number}</span>
                    <span className="text-stone-500 text-xs ml-2">{o.sex === 'Male' ? '♂' : '♀'} {o.species}</span>
                  </div>
                  <span className="text-xs text-stone-500">{campName(o.current_camp_id)}</span>
                </button>
              ))}
            </div>
          )}
        </AnimalAccordion>

        {/* 7. Movement / Location History */}
        <AnimalAccordion title="Movement / Location History">
          {movements.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No movements recorded</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <MapPin className="w-3 h-3" /> Origin — {campName(animal.origin_camp_id)}
              </div>
              {movements.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="text-stone-400 text-xs w-20">{m.date}</span>
                  <span className="text-stone-600">Moved → {campName(m.to_camp_id)} ({farmName(m.to_farm_id)})</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs font-medium text-stone-700 pt-1 border-t border-stone-100">
                <MapPin className="w-3 h-3 text-amber-500" /> Current — {campName(animal.current_camp_id)}
              </div>
            </div>
          )}
        </AnimalAccordion>

        {animal.notes && (
          <AnimalAccordion title="Notes">
            <p className="text-sm text-stone-600 whitespace-pre-wrap">{animal.notes}</p>
          </AnimalAccordion>
        )}
      </div>

      {editing && (
        <EditAnimalDialog
          open={editing}
          onClose={() => setEditing(false)}
          animal={animal}
          sireCandidates={sireCandidates}
          damCandidates={damCandidates}
          onSaved={() => { setEditing(false); load(); }}
        />
      )}

      {deleteState && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center pb-14" onClick={() => deleteState === 'deleting' ? null : setDeleteState(null)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-4 space-y-3 max-h-[calc(100dvh-5rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {deleteState === 'checking' && <p className="text-sm text-stone-500 text-center py-2">Checking linked records…</p>}
            {deleteState?.blocked && (
              <>
                <h3 className="font-bold text-stone-900">Can't delete {animal.tag_number}</h3>
                <p className="text-sm text-stone-600">This animal has linked historical records. Deleting it permanently would lose important history:</p>
                <ul className="text-sm text-stone-700 list-disc pl-5 space-y-0.5">{deleteState.blocked.map((r) => <li key={r}>{r}</li>)}</ul>
                <p className="text-xs text-stone-500">To remove it from active use, edit its status to Deceased or Sold instead — this keeps the full lineage intact.</p>
                <button onClick={() => setDeleteState(null)} className="w-full bg-stone-900 text-stone-50 text-sm py-2.5 rounded-md">OK</button>
              </>
            )}
            {deleteState === 'confirm' && (
              <>
                <h3 className="font-bold text-stone-900">Delete animal?</h3>
                <p className="text-sm text-stone-600">Are you sure you want to permanently delete animal <b>{animal.tag_number}</b>? This can't be undone.</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setDeleteState(null)} className="flex-1 border border-stone-200 text-sm py-2.5 rounded-md">Cancel</button>
                  <button onClick={doDelete} className="flex-1 bg-red-600 text-white text-sm py-2.5 rounded-md">Delete Animal</button>
                </div>
              </>
            )}
            {deleteState === 'deleting' && <p className="text-sm text-stone-500 text-center py-2">Deleting…</p>}
            {deleteState?.error && (
              <>
                <h3 className="font-bold text-stone-900">Delete failed</h3>
                <p className="text-sm text-red-600">{deleteState.error}</p>
                <button onClick={() => setDeleteState(null)} className="w-full bg-stone-900 text-stone-50 text-sm py-2.5 rounded-md">Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

function Row({ label, value, highlight, muted }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-stone-500">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-stone-900' : muted ? 'text-stone-400' : 'text-stone-700'}`}>{value}</span>
    </div>
  );
}

function ParentDisplay({ label, linked, manual, onLink }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-stone-500">{label}</span>
      {linked ? (
        <button onClick={onLink} className="text-sm font-semibold text-stone-900 underline decoration-stone-300 flex items-center gap-1">
          <GitBranch className="w-3.5 h-3.5 text-amber-500" /> {linked.tag_number}
        </button>
      ) : manual ? (
        <span className="text-sm font-medium text-stone-700">{manual}</span>
      ) : (
        <span className="text-sm text-stone-400">Unknown</span>
      )}
    </div>
  );
}