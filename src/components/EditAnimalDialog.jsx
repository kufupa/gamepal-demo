import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import SpeciesSelect from '@/components/SpeciesSelect';
import ParentSelect from '@/components/ParentSelect';
import BreedsWithSelect from '@/components/BreedsWithSelect';
import PhotoInput from '@/components/PhotoInput';

// Full edit dialog for an individual animal. Handles all static fields:
// tag, species, sex, DOB, birth year, parentage (4 fields), identification,
// purchase info, breeding, photo, notes. Horn measurements are managed
// separately via the Horn Measurements accordion (+ Add Measurement).
export default function EditAnimalDialog({ open, onClose, animal, sireCandidates, damCandidates, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open || !animal) return;
    setForm({ ...animal });
    // Purchase price/notes live in the protected finance record.
    let cancelled = false;
    base44.entities.AnimalPurchaseFinance.filter({ animal_id: animal.id }).then((rows) => {
      if (cancelled) return;
      setForm((f) => ({ ...f, purchase_price: rows[0]?.purchase_price ?? '', purchase_notes: rows[0]?.purchase_notes || '' }));
    });
    return () => { cancelled = true; };
  }, [open, animal]);

  if (!animal) return null;
  const sireSireCandidates = sireCandidates;
  const damSireCandidates = sireCandidates;

  const save = async () => {
    setSaving(true);
    try {
      const breedsArr = Array.isArray(form.breeds_species) ? form.breeds_species : (form.breeds_species ? [form.breeds_species] : []);
      await base44.entities.Animal.update(animal.id, {
        tag_number: form.tag_number, species: form.species, sex: form.sex,
        date_of_birth: form.date_of_birth || '', birth_year: form.birth_year || '',
        sire_id: form.sire_id || '', sire_manual: form.sire_manual || '',
        dam_id: form.dam_id || '', dam_manual: form.dam_manual || '',
        sire_sire_id: form.sire_sire_id || '', sire_sire_manual: form.sire_sire_manual || '',
        dam_sire_id: form.dam_sire_id || '', dam_sire_manual: form.dam_sire_manual || '',
        is_breeding_male: form.is_breeding_male,
        breeds_species: form.is_breeding_male ? (breedsArr.length ? breedsArr : [form.species]) : [],
        notes: form.notes || '',
        tag_colour: form.tag_colour || '',
        microchip_number: form.microchip_number || '',
        dna_lab_number: form.dna_lab_number || '',
        purchase_auction_sale: form.purchase_auction_sale || '',
        purchase_seller: form.purchase_seller || '',
        purchase_date: form.purchase_date || '',
        photo_url: form.photo_url || '',
      });
      const finPayload = {
        purchase_price: form.purchase_price === '' || form.purchase_price == null ? null : Number(form.purchase_price),
        purchase_notes: form.purchase_notes || '',
      };
      const finRows = await base44.entities.AnimalPurchaseFinance.filter({ animal_id: animal.id });
      if (finRows[0]) await base44.entities.AnimalPurchaseFinance.update(finRows[0].id, finPayload);
      else await base44.entities.AnimalPurchaseFinance.create({ animal_id: animal.id, ...finPayload });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {animal.tag_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tag Number</Label><Input value={form.tag_number || ''} onChange={(e) => set('tag_number', e.target.value)} /></div>
            <div><Label>Species</Label><SpeciesSelect value={form.species || ''} onChange={(v) => set('species', v)} required /></div>
          </div>
          <div><Label>Tag Colour (optional)</Label><Input value={form.tag_colour || ''} onChange={(e) => set('tag_colour', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Sex</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.sex || 'Female'} onChange={(e) => set('sex', e.target.value)}><option>Female</option><option>Male</option></select></div>
            <div><Label>Approx. Birth Year</Label><Input value={form.birth_year || ''} onChange={(e) => set('birth_year', e.target.value)} placeholder="2022" /></div>
          </div>
          <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth || ''} onChange={(e) => set('date_of_birth', e.target.value)} /></div>

          <SectionLabel>Parentage</SectionLabel>
          <ParentSelect label="Sire" candidates={sireCandidates} parentId={form.sire_id} parentManual={form.sire_manual} onChange={(id, manual) => { set('sire_id', id); set('sire_manual', manual); }} />
          <ParentSelect label="Dam" candidates={damCandidates} parentId={form.dam_id} parentManual={form.dam_manual} onChange={(id, manual) => { set('dam_id', id); set('dam_manual', manual); }} />
          <ParentSelect label="Sire's Sire" candidates={sireSireCandidates} parentId={form.sire_sire_id} parentManual={form.sire_sire_manual} onChange={(id, manual) => { set('sire_sire_id', id); set('sire_sire_manual', manual); }} />
          <ParentSelect label="Dam's Sire" candidates={damSireCandidates} parentId={form.dam_sire_id} parentManual={form.dam_sire_manual} onChange={(id, manual) => { set('dam_sire_id', id); set('dam_sire_manual', manual); }} />

          <SectionLabel>Identification</SectionLabel>
          <div><Label>Microchip Number (optional)</Label><Input value={form.microchip_number || ''} onChange={(e) => set('microchip_number', e.target.value)} /></div>
          <div><Label>DNA Lab Number (optional)</Label><Input value={form.dna_lab_number || ''} onChange={(e) => set('dna_lab_number', e.target.value)} /></div>

          <SectionLabel>Purchase Information</SectionLabel>
          <div><Label>Auction / Sale (optional)</Label><Input value={form.purchase_auction_sale || ''} onChange={(e) => set('purchase_auction_sale', e.target.value)} /></div>
          <div><Label>Seller / Breeder Purchased From (optional)</Label><Input value={form.purchase_seller || ''} onChange={(e) => set('purchase_seller', e.target.value)} /></div>
          <div><Label>Purchase Price (R, optional)</Label><Input type="number" value={form.purchase_price ?? ''} onChange={(e) => set('purchase_price', e.target.value)} /></div>
          <div><Label>Auction / Purchase Date (optional)</Label><Input type="date" value={form.purchase_date || ''} onChange={(e) => set('purchase_date', e.target.value)} /></div>
          <div><Label>Purchase Notes (optional)</Label><Textarea rows={2} value={form.purchase_notes || ''} onChange={(e) => set('purchase_notes', e.target.value)} /></div>

          <SectionLabel>Breeding</SectionLabel>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_breeding_male} onChange={(e) => { const checked = e.target.checked; set('is_breeding_male', checked); if (checked && !(Array.isArray(form.breeds_species) ? form.breeds_species : []).length) set('breeds_species', form.species ? [form.species] : []); }} className="w-4 h-4" />
            Breeding male
          </label>
          {!!form.is_breeding_male && (
            <div><Label>Breeds with</Label><BreedsWithSelect value={form.breeds_species} onChange={(arr) => set('breeds_species', arr)} /></div>
          )}

          <SectionLabel>Photo</SectionLabel>
          <PhotoInput value={form.photo_url || ''} onChange={(v) => set('photo_url', v)} />

          <SectionLabel>Notes</SectionLabel>
          <Textarea rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-stone-900 text-stone-50 hover:bg-stone-800">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] uppercase tracking-[0.14em] text-stone-400 font-semibold pt-2">{children}</p>;
}