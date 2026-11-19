import SuppliedLogo, { CROPS } from './SuppliedLogo';
import { DEEP, SAND } from './palette';

export default function MockHeader({ variant = 'title', barBg = DEEP, label = 'All Farms Overview' }) {
  const onDark = barBg !== SAND;
  const labelTone = onDark ? 'rgba(252,248,240,0.5)' : 'rgba(46,46,46,0.45)';

  return (
    <div
      className="flex items-center justify-between border-b"
      style={{ height: 56, padding: '0 14px', background: barBg, borderColor: 'rgba(0,0,0,0.22)' }}
    >
      {variant === 'title' && <SuppliedLogo crop={CROPS.title} width={116} />}
      {variant === 'lockup' && <SuppliedLogo crop={CROPS.lockup} width={140} />}
      {variant === 'chip' && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-md bg-white" style={{ width: 30, height: 30 }}>
            <SuppliedLogo crop={CROPS.icon} width={26} />
          </span>
          <SuppliedLogo crop={CROPS.title} width={84} />
        </div>
      )}
      <span className="text-[9px] uppercase tracking-[0.16em] font-semibold" style={{ color: labelTone }}>
        {label}
      </span>
    </div>
  );
}