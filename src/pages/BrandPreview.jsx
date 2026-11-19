import MockHeader from '@/components/brand/MockHeader';
import MockBottomNav from '@/components/brand/MockBottomNav';
import MockLogin from '@/components/brand/MockLogin';
import IconScaleTest from '@/components/brand/IconScaleTest';
import SourceMap from '@/components/brand/SourceMap';
import { Section, Frame, Tag } from '@/components/brand/PreviewBits';
import { DEEP, SAND } from '@/components/brand/palette';

const FACTS = [
  ['File', '2172 × 724 px · 1.27 MB · PNG'],
  ['Transparency', 'None — RGB, no alpha channel'],
  ['Canvas', 'Pure white, with two dark-green panels'],
  ['Icon panel', '570 × 559 px at (70, 85) — squircle, radial green'],
  ['Lockup panel', '1428 × 457 px at (686, 151) — flat #06180F'],
  ['Wordmark "GamePal"', '458 × 146 px'],
  ['Tagline', '447 × 55 px'],
  ['Emblem (horns + GP)', '756 × 401 px'],
  ['Gold', '#A6844F → #FFF9E3, median #D7AE78'],
  ['Lettering white', '#FCF8F0'],
];

const VERDICT = [
  ['Header wordmark at 116 px (needs 232 at 2×)', '1.9× spare', true],
  ['Login lockup at 236 px (needs 472 at 2×)', '2.6× spare', true],
  ['App icon at 180 px', '3.2× spare', true],
  ['Favicon at 32 px', 'ample', true],
  ['Full lockup inside a 56 px bar', 'tagline drops to 5 px', false],
  ['App icon at 1024 × 1024', 'needs 1.8× upscale', false],
];

export default function BrandPreview() {
  return (
    <div className="min-h-screen bg-stone-100">
      <div className="mx-auto max-w-3xl px-5 py-8 space-y-10">
        <header className="space-y-2">
          <p className="text-[11px] font-bold tracking-[0.14em] text-stone-500 uppercase">Supplied artwork · mock-ups only</p>
          <h1 className="text-2xl font-bold text-stone-900">GamePal in context</h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            Every mark on this page is your new file, cropped. Nothing is redrawn, retraced or recoloured, and the demo
            app itself is untouched.
          </p>
        </header>

        <Section n="01" title="File report" note="Measured pixel by pixel from the file you sent.">
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
            {FACTS.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <span className="text-xs text-stone-500">{k}</span>
                <span className="text-xs font-semibold text-stone-900 text-right">{v}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
            {VERDICT.map(([k, v, ok]) => (
              <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="text-xs text-stone-700">{k}</span>
                <Tag ok={ok}>{v}</Tag>
              </div>
            ))}
          </div>
        </Section>

        <Section n="02" title="Where the crops come from" note="The two outlined windows are the exact areas used below.">
          <SourceMap />
        </Section>

        <Section n="03" title="Compact header" note="Shown at the app's real content width (448 px). Bar height stays 56 px in every case.">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">A — wordmark only on the artwork's own green</p>
              <Frame><MockHeader variant="title" /></Frame>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">B — full lockup (tagline is 5 px tall here)</p>
              <Frame><MockHeader variant="lockup" /></Frame>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">C — icon in a white chip, wordmark beside it</p>
              <Frame><MockHeader variant="chip" /></Frame>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">D — same wordmark on sand</p>
              <Frame><MockHeader variant="title" barBg={SAND} /></Frame>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                This is the one real limitation: the artwork's flat green travels with the mark, so on a light bar the
                logo sits in a dark rectangle. A transparent export removes it.
              </p>
            </div>
          </div>
        </Section>

        <Section n="04" title="Mobile header" note="Same two treatments at a true 375 px phone width.">
          <div className="grid gap-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">A — wordmark, 375 px</p>
              <Frame width={375}><MockHeader variant="title" label="Farms" /></Frame>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">C — icon chip, 375 px</p>
              <Frame width={375}><MockHeader variant="chip" label="Farms" /></Frame>
            </div>
          </div>
        </Section>

        <Section n="05" title="Sign-in screen" note="Using the same fields as the current login.">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">A — green field, full lockup with tagline</p>
              <Frame width={375}><MockLogin variant="deep" /></Frame>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">B — sand field, app icon above the card</p>
              <Frame width={375}><MockLogin variant="sand" /></Frame>
            </div>
          </div>
        </Section>

        <Section n="06" title="Bottom navigation" note="Same seven items, icons and structure — colours only.">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">Current — charcoal bar, amber active</p>
              <Frame width={375} className="!bg-stone-900"><MockBottomNav theme="current" /></Frame>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">Artwork green {DEEP} · gold {`#D7AE78`}</p>
              <Frame width={375}><MockBottomNav theme="artwork" /></Frame>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-700">Earlier palette #1B3D2F · gold #C9A96B</p>
              <Frame width={375}><MockBottomNav theme="forest" /></Frame>
            </div>
          </div>
        </Section>

        <Section n="07" title="App icon" note="Your icon panel at 180, 120, 64, 32 and 16 px, unmodified.">
          <IconScaleTest />
        </Section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 space-y-2">
          <h2 className="text-sm font-bold text-stone-900">What final production still needs</h2>
          <ul className="text-xs text-stone-600 space-y-1.5 leading-relaxed list-disc pl-4">
            <li>A 1024 × 1024 (ideally 2048) square icon: the file gives 570 × 559, so it would be upscaled 1.8× and go soft.</li>
            <li>The same icon with transparency, since the white corners are baked in.</li>
            <li>One transparent lockup — white + gold on nothing — for light bars, print and email.</li>
          </ul>
          <p className="text-xs text-stone-500 leading-relaxed">
            Everything else here is production-ready: the wordmark, tagline and emblem all have two to three times the
            pixels needed at the sizes above.
          </p>
        </section>
      </div>
    </div>
  );
}