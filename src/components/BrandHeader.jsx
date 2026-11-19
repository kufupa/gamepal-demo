import SuppliedLogo, { CROPS } from '@/components/brand/SuppliedLogo';
import { DEEP } from '@/components/brand/palette';

export default function BrandHeader({ subtitle }) {
  return (
    <header
      className="sticky top-0 z-40 text-stone-50 border-b border-black/30 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.5)]"
      style={{ background: DEEP }}
    >
      <div className="px-5 pt-3.5 pb-3">
        <SuppliedLogo crop={CROPS.lockup} width={176} alt="GamePal" />
        {subtitle && (
          <p className="mt-2.5 text-xs font-medium tracking-[0.08em]" style={{ color: 'rgba(252,248,240,0.5)' }}>{subtitle}</p>
        )}
      </div>
    </header>
  );
}