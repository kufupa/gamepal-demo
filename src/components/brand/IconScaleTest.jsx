import SuppliedLogo, { CROPS } from './SuppliedLogo';
import { DEEP } from './palette';

const SIZES = [180, 120, 64, 32, 16];

function Row({ background, caption, tone }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: tone }}>{caption}</p>
      <div className="rounded-xl p-5 flex items-end gap-7 flex-wrap" style={{ background }}>
        {SIZES.map((px) => (
          <div key={px} className="space-y-2">
            <SuppliedLogo crop={CROPS.icon} width={px} />
            <p className="text-[10px] font-medium" style={{ color: tone }}>{px} px</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IconScaleTest() {
  return (
    <div className="space-y-4">
      <Row background="#FFFFFF" tone="#78716C" caption="On white — the file's own white corners are invisible" />
      <Row background={DEEP} tone="rgba(252,248,240,0.55)" caption="On dark green — the baked-in white corners show as wedges" />
    </div>
  );
}