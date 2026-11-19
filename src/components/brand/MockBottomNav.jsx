import { Trees, Tag, GitBranch, ArrowLeftRight, Skull, ShoppingCart, Settings } from 'lucide-react';
import { DEEP, GOLD, FOREST, PALETTE_GOLD } from './palette';

const TABS = [
  { label: 'Farms', icon: Trees },
  { label: 'Animals', icon: Tag },
  { label: 'Breeding', icon: GitBranch },
  { label: 'Moves', icon: ArrowLeftRight },
  { label: 'Mortality', icon: Skull },
  { label: 'Sales', icon: ShoppingCart },
  { label: 'Settings', icon: Settings },
];

const THEMES = {
  current: { bar: '#1C1917', active: '#FBBF24', idle: 'rgba(255,255,255,0.42)' },
  artwork: { bar: DEEP, active: GOLD, idle: 'rgba(252,248,240,0.42)' },
  forest: { bar: FOREST, active: PALETTE_GOLD, idle: 'rgba(255,255,255,0.42)' },
};

export default function MockBottomNav({ theme = 'artwork', activeIndex = 0 }) {
  const t = THEMES[theme];
  return (
    <nav className="w-full" style={{ background: t.bar }}>
      <div className="grid grid-cols-7">
        {TABS.map(({ label, icon: Icon }, i) => {
          const active = i === activeIndex;
          return (
            <div
              key={label}
              className="relative flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-2 text-[10px] font-medium tracking-wide"
              style={{ color: active ? '#FFFFFF' : t.idle }}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full" style={{ background: t.active }} />
              )}
              <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.4 : 1.7} style={{ color: active ? t.active : t.idle }} />
              {label}
            </div>
          );
        })}
      </div>
    </nav>
  );
}