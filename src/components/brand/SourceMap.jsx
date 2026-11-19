import { CROPS } from './SuppliedLogo';

const SRC = 'https://media.base44.com/images/public/6af56a7b9c0095faa0e2df6a/98ff42bd4_wide_clean_graphic_design_with_two_logo_assets_on.png';
const IMG_W = 2172;
const IMG_H = 724;

const BOXES = [
  { crop: CROPS.icon, label: 'App icon 570 × 559', colour: '#C9A96B' },
  { crop: CROPS.lockup, label: 'Lockup 1218 × 407', colour: '#7FD3A2' },
];

export default function SourceMap() {
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white">
        <img src={SRC} alt="Supplied GamePal artwork" className="w-full block" />
        {BOXES.map(({ crop, label, colour }) => (
          <div
            key={label}
            className="absolute"
            style={{
              left: `${(crop.x / IMG_W) * 100}%`,
              top: `${(crop.y / IMG_H) * 100}%`,
              width: `${(crop.w / IMG_W) * 100}%`,
              height: `${(crop.h / IMG_H) * 100}%`,
              border: `1.5px solid ${colour}`,
              borderRadius: 4,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {BOXES.map(({ label, colour }) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-stone-600">
            <span className="inline-block rounded-sm" style={{ width: 10, height: 10, background: colour }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}