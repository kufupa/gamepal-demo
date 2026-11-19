import { useState, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';

export default function PhotoInput({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange(file_url);
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div>
      <span className="text-[11px] text-stone-500 uppercase tracking-wide">Photo (optional)</span>
      {value ? (
        <div className="relative mt-1 rounded-lg overflow-hidden border border-stone-200">
          <Image src={value} fittingType="fill" className="w-full h-40 object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className="mt-1 flex items-center justify-center gap-2 h-11 border border-dashed border-stone-300 rounded-lg text-sm text-stone-500 cursor-pointer hover:bg-stone-50">
          {uploading ? (
            'Uploading…'
          ) : (
            <>
              <ImagePlus className="w-4 h-4" /> Add photo
            </>
          )}
          <input
            ref={ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}