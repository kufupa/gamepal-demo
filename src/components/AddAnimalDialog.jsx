import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';
import ParentSelect from '@/components/ParentSelect';
import BreedsWithSelect from '@/components/BreedsWithSelect';
import PhotoInput from '@/components/PhotoInput';
import HornMeasurementFields from '@/components/HornMeasurementFields';
import { formatInches, hasMeasurementData } from '@/lib/hornMeasurements';

function emptyMeas() {
  return {
    measurement_date: new Date().toISOString().slice(0, 10),
    inches: null,
    horn_length_left: null, horn_length_right: null, tip_to_tip: null,
    tips_left: null, tips_right: null, rings_left: null, rings_right: null,
    base_left: null, base_right: null,
  };
}

export default function AddAnimalDialog({ open, onOpenChange, camp, farm, sires = [], dams = [], onDone, presetSpecies, farms = [], camps = [] }) {
  const [form, setForm] = useState({
    tag_number: '', species: presetSpecies || '', sex: 'Female',
    date_of_birth: '', birth_year: '', is_breeding_male: false, breeds_species: [],
    sire_id: '', sire_manual: '', dam_id: '', dam_manual: '',
    sire_sire_id: '', sire_sire_manual: '', dam_sire_id: '', dam_sire_manual: '',
    notes: '', tag_colour: '', photo_url: '',
    microchip_number: '', dna_lab_number: '',
    purchase_auction_sale: '', purchase_seller: '', purchase_price: '', purchase_date: '', purchase_notes: '',
    loc_farm_id: camp?.farm_id || farm?.id || '', loc_camp_id: camp?.id || '',
  });
  const [meas, setMeas] = useState(emptyMeas());
  const [showMeas, setShowMeas] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Bulk groups hold untagged animals only, so a new individual always adds +1
  // to the population. Warn when this camp already counts the same species in
  // bulk: the animal may physically be one of those, in which case it must be
  // tagged out of the group instead.
  const targetCampId = camp?.id || form.loc_camp_id;
  const [bulkRows, setBulkRows] = useState([]);
  useEffect(() => {
    if (!open || !targetCampId) { setBulkRows([]); return; }
    base44.entities.Group.filter({ camp_id: targetCampId })
      .then((rows) => setBulkRows(Array.isArray(rows) ? rows : (rows?.items || [])))
      .catch(() => setBulkRows([]));
  }, [open, targetCampId]);

  const matchingBulk = bulkRows.filter((g) => g.species === form.species && (Number(g.quantity) || 0) > 0);
  const matchingBulkTotal = matchingBulk.reduce((s, g) => s + (Number(g.quantity) || 0), 0);

  const availableSires = sires.filter((s) => !form.species || s.species === form.species);
  const availableDams = dams.filter((d) => !form.species || d.species === form.species);
  const needLocation = !camp && !farm;
  const locCamps = camps.filter((c) => !form.loc_farm_id || c.farm_id === form.loc_farm_id);
  const hasMeas = hasMeasurementData(meas);

  const submit = async () => {
    if (!form.tag_number || !form.species) return;
    if (needLocation && (!form.loc_farm_id || !form.loc_camp_id)) return;
    setSaving(true);
    try {
      const created = await base44.entities.Animal.create({
        tag_number: form.tag_number, species: form.species, sex: form.sex,
        date_of_birth: form.date_of_birth || '', birth_year: form.birth_year || '',
        current_farm_id: camp?.farm_id || farm?.id || form.loc_farm_id,
        current_camp_id: camp?.id || form.loc_camp_id,
        origin_farm_id: camp?.farm_id || farm?.id || form.loc_farm_id,
        origin_camp_id: camp?.id || form.loc_camp_id,
        sire_id: form.sire_id || '', sire_manual: form.sire_manual || '',
        dam_id: form.dam_id || '', dam_manual: form.dam_manual || '',
        sire_sire_id: form.sire_sire_id || '', sire_sire_manual: form.sire_sire_manual || '',
        dam_sire_id: form.dam_sire_id || '', dam_sire_manual: form.dam_sire_manual || '',
        is_breeding_male: form.is_breeding_male,
        breeds_species: form.is_breeding_male ? (form.breeds_species.length ? form.breeds_species : [form.species]) : [],
        notes: form.notes, tag_colour: form.tag_colour || '',
        microchip_number: form.microchip_number || '', dna_lab_number: form.dna_lab_number || '',
        purchase_auction_sale: form.purchase_auction_sale || '', purchase_seller: form.purchase_seller || '',
        purchase_date: form.purchase_date || '',
        photo_url: form.photo_url || '',
        horn_length: hasMeas && (meas.inches != null ? formatInches(meas.inches) : (meas.horn_length_left != null ? formatInches(meas.horn_length_left) : '')),
        tip_to_tip: hasMeas && meas.tip_to_tip != null ? formatInches(meas.tip_to_tip) : '',
      });
      if (form.purchase_price !== '' || form.purchase_notes) {
        await base44.entities.AnimalPurchaseFinance.create({
          animal_id: created.id,
          purchase_price: form.purchase_price === '' ? null : Number(form.purchase_price),
          purchase_notes: form.purchase_notes || '',
        });
      }
      if (hasMeas) {
        await base44.entities.HornMeasurement.create({ ...meas, animal_id: created.id });
      }
      onDone?.();
      onOpenChange(false);
      setForm({ tag_number: '', species: '', sex: 'Female', date_of_birth: '', birth_year: '', is_breeding_male: false, breeds_species: [], sire_id: '', sire_manual: '', dam_id: '', dam_manual: '', sire_sire_id: '', sire_sire_manual: '', dam_sire_id: '', dam_sire_manual: '', notes: '', tag_colour: '', photo_url: '', microchip_number: '', dna_lab_number: '', purchase_auction_sale: '', purchase_seller: '', purchase_price: '', purchase_date: '', purchase_notes: '', loc_farm_id: camp?.farm_id || farm?.id || '', loc_camp_id: camp?.id || '' });
      setMeas(emptyMeas());
      setShowMeas(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Individual Animal — {camp?.name || farm?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tag Number</Label><Input value={form.tag_number} onChange={(e) => set('tag_number', e.target.value)} placeholder="B1" /></div>
            <div><Label>Species</Label><SpeciesSelect value={form.species} onChange={(v) => set('species', v)} required /></div>
          </div>
          <div><Label>Tag Colour (optional)</Label><Input value={form.tag_colour} onChange={(e) => set('tag_colour', e.target.value)} placeholder="e.g. Orange" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Sex</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.sex} onChange={(e) => set('sex', e.target.value)}><option>Female</option><option>Male</option></select></div>
            <div><Label>Approx. Birth Year</Label><Input value={form.birth_year} onChange={(e) => set('birth_year', e.target.value)} placeholder="2022" /></div>
          </div>
          <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} /></div>
          {needLocation && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Farm</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.loc_farm_id} onChange={(e) => set('loc_farm_id', e.target.value)}><option value="">— Select —</option>{farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
              <div><Label>Camp</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.loc_camp_id} onChange={(e) => set('loc_camp_id', e.target.value)}><option value="">— Select —</option>{locCamps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
          )}

          <SectionLabel>Parentage</SectionLabel>
          <ParentSelect label="Sire" candidates={availableSires} parentId={form.sire_id} parentManual={form.sire_manual} onChange={(id, manual) => { set('sire_id', id); set('sire_manual', manual); }} />
          <ParentSelect label="Dam" candidates={availableDams} parentId={form.dam_id} parentManual={form.dam_manual} onChange={(id, manual) => { set('dam_id', id); set('dam_manual', manual); }} />
          <ParentSelect label="Sire's Sire" candidates={availableSires} parentId={form.sire_sire_id} parentManual={form.sire_sire_manual} onChange={(id, manual) => { set('sire_sire_id', id); set('sire_sire_manual', manual); }} />
          <ParentSelect label="Dam's Sire" candidates={availableSires} parentId={form.dam_sire_id} parentManual={form.dam_sire_manual} onChange={(id, manual) => { set('dam_sire_id', id); set('dam_sire_manual', manual); }} />

          <SectionLabel>Identification</SectionLabel>
          <div><Label>Microchip Number (optional)</Label><Input value={form.microchip_number} onChange={(e) => set('microchip_number', e.target.value)} /></div>
          <div><Label>DNA Lab Number (optional)</Label><Input value={form.dna_lab_number} onChange={(e) => set('dna_lab_number', e.target.value)} /></div>

          <SectionLabel>Purchase Information</SectionLabel>
          <div><Label>Auction / Sale (optional)</Label><Input value={form.purchase_auction_sale} onChange={(e) => set('purchase_auction_sale', e.target.value)} /></div>
          <div><Label>Seller / Breeder Purchased From (optional)</Label><Input value={form.purchase_seller} onChange={(e) => set('purchase_seller', e.target.value)} /></div>
          <div><Label>Purchase Price (R, optional)</Label><Input type="number" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} placeholder="e.g. 35000" /></div>
          <div><Label>Auction / Purchase Date (optional)</Label><Input type="date" value={form.purchase_date} onChange={(e) => set('purchase_date', e.target.value)} /></div>
          <div><Label>Purchase Notes (optional)</Label><Textarea rows={2} value={form.purchase_notes} onChange={(e) => set('purchase_notes', e.target.value)} /></div>

          <SectionLabel>Breeding</SectionLabel>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_breeding_male} onChange={(e) => { set('is_breeding_male', e.target.checked); if (e.target.checked && !form.breeds_species.length) set('breeds_species', form.species ? [form.species] : []); }} className="w-4 h-4" />
            Mark as breeding male
          </label>
          {form.is_breeding_male && (
            <div><Label>Breeds with</Label><BreedsWithSelect value={form.breeds_species} onChange={(arr) => set('breeds_species', arr)} /><p className="text-[11px] text-stone-500 mt-1">Select every species group this male breeds with.</p></div>
          )}

          <SectionLabel>Photo</SectionLabel>
          <PhotoInput value={form.photo_url} onChange={(v) => set('photo_url', v)} />

          <SectionLabel>Initial Horn Measurements (optional)</SectionLabel>
          <button type="button" onClick={() => setShowMeas(!showMeas)} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900">
            <ChevronDown className={`w-4 h-4 transition-transform ${showMeas ? 'rotate-180' : ''}`} />
            {showMeas ? 'Hide measurement fields' : 'Add initial horn measurements'}
          </button>
          {showMeas && (
            <div className="border border-stone-200 rounded-lg p-3 bg-stone-50 space-y-3">
              <HornMeasurementFields value={meas} onChange={setMeas} />
            </div>
          )}

          <SectionLabel>Notes</SectionLabel>
          <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          {matchingBulk.length > 0 ? (
            <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-2 space-y-1">
              <p className="font-semibold">
                This camp already counts {matchingBulkTotal} {form.species} as untagged ({matchingBulk.map((g) => `${g.animal_class || 'Unclassified'} ${Number(g.quantity) || 0}`).join(', ')}).
              </p>
              <p>
                If this animal is physically one of those, do <b>not</b> add it here — use <b>Tag / Convert to Individuals</b> on the group instead. That reduces the group by 1 and creates the individual, so the total stays unchanged.
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md p-2">
              This animal is recorded individually and adds <b>1</b> to the population. Bulk groups only hold untagged animals, so no group number changes.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.tag_number || !form.species} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : 'Add Animal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] uppercase tracking-[0.14em] text-stone-400 font-semibold pt-2">{children}</p>;
}