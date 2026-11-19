import { Link, useLocation } from 'react-router-dom';
import { Trees, Tag, GitBranch, ArrowLeftRight, Skull, ShoppingCart, Settings } from 'lucide-react';
import { DEEP, GOLD } from '@/components/brand/palette';

const IDLE = 'rgba(252,248,240,0.42)';

const tabs = [
  { to: '/', label: 'Farms', icon: Trees, exact: true },
  { to: '/animals', label: 'Animals', icon: Tag },
  { to: '/breeding', label: 'Breeding', icon: GitBranch },
  { to: '/movements', label: 'Moves', icon: ArrowLeftRight },
  { to: '/mortality', label: 'Mortality', icon: Skull },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-md min-h-screen bg-stone-50 flex flex-col relative">
        <main className="flex-1 pb-24">{children}</main>
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-black/40 z-50 pb-[env(safe-area-inset-bottom)] shadow-nav"
          style={{ background: DEEP }}
        >
          <div className="grid grid-cols-7">
            {tabs.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={exact ? () => window.dispatchEvent(new CustomEvent('aucamp-reset-home')) : undefined}
                  className="relative flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-2 text-[10px] font-medium tracking-wide transition-colors"
                  style={{ color: active ? '#FFFFFF' : IDLE }}
                >
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full" style={{ background: GOLD }} />
                  )}
                  <Icon
                    className="w-[18px] h-[18px]"
                    strokeWidth={active ? 2.4 : 1.7}
                    style={{ color: active ? GOLD : IDLE }}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}