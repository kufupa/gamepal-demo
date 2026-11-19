import { useState } from 'react';
import { Plus, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AnimalAccordion from '@/components/AnimalAccordion';

// Simple document attachments for one animal: upload a PDF or photo, optionally
// give it a display name, click it later to open. No other metadata.
export default function AnimalDocumentsSection({ animal, documents, isAdmin, onReload }) {
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState(null);

  const reset = () => { setAdding(false); setFile(null); setName(''); };

  const label = (doc) => doc.display_name || doc.file_name || 'Document';
  const isImage = (doc) => /\.(png|jpe?g|gif|webp|heic)$/i.test(doc.file_name || '');

  const save = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await base44.entities.AnimalDocument.create({
        animal_id: animal.id,
        file_uri,
        file_name: file.name,
        display_name: name.trim(),
      });
      reset();
      await onReload?.();
    } finally {
      setSaving(false);
    }
  };

  const open = async (doc) => {
    setOpeningId(doc.id);
    // Open the tab inside the click so the browser doesn't block it as a popup.
    const win = window.open('', '_blank');
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri, expires_in: 3600 });
      if (win) win.location.href = signed_url;
      else window.location.href = signed_url;
    } catch (e) {
      if (win) win.close();
      throw e;
    } finally {
      setOpeningId(null);
    }
  };

  // Removes only this document attachment — the animal and all other data are untouched.
  const remove = async (doc) => {
    if (!confirm(`Remove "${label(doc)}"? This only removes the document attachment. The animal and all its other data stay untouched.`)) return;
    await base44.entities.AnimalDocument.delete(doc.id);
    onReload?.();
  };

  return (
    <AnimalAccordion
      title="Documents"
      count={documents.length}
      rightAction={isAdmin && !adding && (
        <button onClick={() => setAdding(true)} className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Document
        </button>
      )}
    >
      {adding && (
        <div className="space-y-3 bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
          <div>
            <span className="text-[11px] text-stone-500 uppercase tracking-wide">File (PDF or photo)</span>
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-stone-900 file:text-stone-50 file:text-xs file:px-3 file:py-2"
            />
          </div>
          <div>
            <span className="text-[11px] text-stone-500 uppercase tracking-wide">Display name (optional)</span>
            <input
              id="doc-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DNA Verification"
              className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm mt-1 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              id="doc-save-btn"
              onClick={save}
              disabled={saving || !file}
              className="flex-1 bg-stone-900 text-stone-50 text-sm py-2 rounded-md disabled:opacity-50"
            >
              {saving ? 'Uploading…' : 'Save Document'}
            </button>
            <button onClick={reset} className="px-4 border border-stone-200 text-sm py-2 rounded-md">Cancel</button>
          </div>
          <p className="text-[11px] text-stone-400">Stored privately — only signed-in users of this app can open it.</p>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-stone-400 text-sm italic">No documents attached</p>
      ) : (
        <div className="space-y-1.5">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-2 border border-stone-200 rounded-lg px-3 py-2">
              <button onClick={() => open(doc)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                {isImage(doc)
                  ? <ImageIcon className="w-4 h-4 text-stone-400 shrink-0" />
                  : <FileText className="w-4 h-4 text-stone-400 shrink-0" />}
                <span className="truncate">
                  <span className="block text-sm text-stone-800">{label(doc)}</span>
                  {doc.display_name && doc.file_name && (
                    <span className="block text-[11px] text-stone-400 truncate">{doc.file_name}</span>
                  )}
                </span>
                {openingId === doc.id && <span className="text-[11px] text-stone-400 shrink-0">Opening…</span>}
              </button>
              {isAdmin && (
                <button onClick={() => remove(doc)} aria-label={`Remove ${label(doc)}`} className="p-1.5 text-stone-400 hover:text-red-600 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </AnimalAccordion>
  );
}