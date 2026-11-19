import SuppliedLogo, { CROPS } from './SuppliedLogo';
import { DEEP, CREAM, GOLD, GOLD_DEEP, SAND } from './palette';

function Field({ label, tone = '#E7E1D5' }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(46,46,46,0.45)' }}>{label}</p>
      <div className="h-9 rounded-md border flex items-center px-3" style={{ borderColor: tone, background: '#FFFFFF' }}>
        <span className="text-xs" style={{ color: '#C3BCAE' }}>—</span>
      </div>
    </div>
  );
}

function Card({ onSignIn }) {
  return (
    <div className="rounded-xl p-5" style={{ background: CREAM }}>
      <div className="space-y-3">
        <Field label="Email" />
        <Field label="Password" />
        <div className="h-9 rounded-md flex items-center justify-center text-xs font-semibold" style={{ background: DEEP, color: GOLD }}>
          Sign in
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px]" style={{ color: 'rgba(46,46,46,0.5)' }}>Forgot password?</span>
          <span className="text-[10px] font-semibold" style={{ color: GOLD_DEEP }}>Create account</span>
        </div>
        {onSignIn}
      </div>
    </div>
  );
}

export default function MockLogin({ variant = 'deep' }) {
  if (variant === 'sand') {
    return (
      <div className="px-4 py-7 flex flex-col justify-center" style={{ background: SAND, minHeight: 440 }}>
        <div className="flex justify-center pb-4">
          <span className="inline-flex items-center justify-center rounded-lg bg-white" style={{ width: 58, height: 58 }}>
            <SuppliedLogo crop={CROPS.icon} width={48} />
          </span>
        </div>
        <div className="rounded-xl bg-white p-5" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="space-y-3">
            <Field label="Email" />
            <Field label="Password" />
            <div className="h-9 rounded-md flex items-center justify-center text-xs font-semibold" style={{ background: DEEP, color: GOLD }}>
              Sign in
            </div>
            <p className="text-center text-[10px] pt-1" style={{ color: 'rgba(46,46,46,0.5)' }}>Forgot password?</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-7 flex flex-col justify-center" style={{ background: DEEP, minHeight: 440 }}>
      <div className="flex justify-center pb-5">
        <SuppliedLogo crop={CROPS.lockup} width={236} />
      </div>
      <Card />
    </div>
  );
}