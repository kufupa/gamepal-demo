import { useRef, useState } from 'react';
import { ImagePlus, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';

export default function AnimalPhoto({ animal, isAdmin, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const updated = await base44.entities.Animal.update(animal.id, { photo_url: file_url });
      onUpdated?.(updated);
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = '';
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const updated = await base44.entities.Animal.update(animal.id, { photo_url: '' });
      onUpdated?.(updated);
    } finally {
      setBusy(false);
    }
  };

  if (!animal.photo_url) {
    return (
      <div className="auc-card px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-stone-400">No photo</span>
        {isAdmin && (
          <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer hover:text-stone-900">
            {uploading ? (
              <span className="text-xs text-stone-400">Uploading…</span>
            ) : (
              <>
                <ImagePlus className="w-4 h-4" />
                <span className="text-sm">Add photo</span>
              </>
            )}
            <input
              ref={ref}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="auc-card overflow-hidden">
      <Image src={animal.photo_url} fittingType="fit" className="w-full max-h-72 object-contain" />
      {isAdmin && (
        <div className="flex items-center justify-end gap-4 px-4 py-2 border-t border-stone-100">
          <label className="text-xs text-stone-500 hover:text-stone-900 cursor-pointer flex items-center gap-1">
            {uploading ? (
              <span className="text-stone-400">Uploading…</span>
            ) : (
              <>
                <Pencil className="w-3 h-3" /> Change
              </>
            )}
            <input
              ref={ref}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-xs text-stone-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}