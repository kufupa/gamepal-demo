const SRC = 'https://media.base44.com/images/public/6af56a7b9c0095faa0e2df6a/98ff42bd4_wide_clean_graphic_design_with_two_logo_assets_on.png';
const IMG_W = 2172;
const IMG_H = 724;

// Measured pixel windows onto the supplied artwork. Each entry clips the
// original file — nothing is redrawn, retraced or recoloured.
// Text crops carry a 3 px margin so no glyph edge is clipped; the margin is
// flat panel green, so on a matching surface it is invisible.
export const CROPS = {
  icon: { x: 70, y: 85, w: 570, h: 559 },
  block: { x: 686, y: 151, w: 1428, h: 457 },
  lockup: { x: 769, y: 169, w: 1218, h: 407 },
  wordmark: { x: 769, y: 315, w: 464, h: 235 },
  title: { x: 769, y: 315, w: 464, h: 152 },
  tagline: { x: 780, y: 489, w: 453, h: 61 },
  emblem: { x: 1223, y: 169, w: 762, h: 407 },
};

export default function SuppliedLogo({ crop, width, alt = 'GamePal', className = '' }) {
  const s = width / crop.w;
  return (
    <div className={`overflow-hidden shrink-0 ${className}`} style={{ width, height: crop.h * s }}>
      <img
        src={SRC}
        alt={alt}
        draggable={false}
        style={{
          width: IMG_W * s,
          height: IMG_H * s,
          maxWidth: 'none',
          display: 'block',
          position: 'relative',
          left: -crop.x * s,
          top: -crop.y * s,
        }}
      />
    </div>
  );
}