import { Sparkles, Gift, Wine } from 'lucide-react';

type PeekMock = {
  id: string;
  ribbon: string;
  hero: string;
  occasion: string;
  recipient: string;
  curator: string;
  note: string;
  cards: { label: string; sub: string }[];
  bg: string;
  ink: string;
  accent: string;
  font: string;
  icon: typeof Sparkles;
};

const mocks: PeekMock[] = [
  {
    id: 'niece',
    ribbon: '7th birthday · Lila',
    hero: 'For our favorite princess',
    occasion: '7th Birthday',
    recipient: 'Lila',
    curator: 'Aunt Mia & Uncle Jay',
    note: 'Pick one outfit, one toy, one sweet treat. The Ferrari is just for laughs.',
    cards: [
      { label: 'Tulle ballet outfit', sub: 'pick 1 of 3' },
      { label: 'Plush unicorn set', sub: 'pick 1 of 2' },
      { label: 'Ferrari (lol)', sub: 'gag card' },
    ],
    bg: 'linear-gradient(155deg, #FFE3F0 0%, #FFC1DE 55%, #FFA9D0 100%)',
    ink: '#5A1A3C',
    accent: '#FF4FA3',
    font: 'var(--font-script)',
    icon: Sparkles,
  },
  {
    id: 'bach',
    ribbon: '30 & rowdy · weekend ahead',
    hero: 'The 30th send-off',
    occasion: 'Bachelorette weekend',
    recipient: 'Sam',
    curator: 'The girls',
    note: 'One dinner, one outfit, one absurd ask. You earn the last card.',
    cards: [
      { label: 'Roof bar reservation', sub: 'locked · beg us' },
      { label: 'Going-out fit', sub: 'pick 1 of 3' },
      { label: 'Helicopter tour', sub: 'gag · maybe' },
    ],
    bg: 'linear-gradient(155deg, #1A0F26 0%, #2D1547 50%, #3A0F5C 100%)',
    ink: '#F5E8FF',
    accent: '#E0A8FF',
    font: 'var(--font-display)',
    icon: Wine,
  },
  {
    id: 'dad',
    ribbon: '70 years · with us forever',
    hero: 'For Pop, at 70',
    occasion: '70th & 45 years',
    recipient: 'Dad',
    curator: 'Your kids',
    note: 'A small archive, a real gift, an experience. Pick one of each.',
    cards: [
      { label: 'Italian leather watch strap', sub: 'pick 1 of 3' },
      { label: 'Weekend at the lake house', sub: 'pick yes / no' },
      { label: 'Single malt, hand-picked', sub: 'pick 1 of 2' },
    ],
    bg: 'linear-gradient(155deg, #E8E2D7 0%, #C9BFAE 50%, #A89B82 100%)',
    ink: '#2A2419',
    accent: '#7A5C2E',
    font: 'var(--font-body-serif)',
    icon: Gift,
  },
];

function MockCard({ mock }: { mock: PeekMock }) {
  const Icon = mock.icon;
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 shadow-xl shadow-foreground/[0.06] transition-transform duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-foreground/[0.1]"
      style={{ background: mock.bg, color: mock.ink }}
    >
      <header className="flex items-center justify-between px-6 pt-6 text-xs">
        <span
          className="font-[family-name:var(--font-mono)] tracking-wider opacity-80"
          style={{ color: mock.ink }}
        >
          peek.gift/g/{mock.id}
        </span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: mock.accent, color: '#fff' }}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </header>

      <div className="px-6 pt-10 pb-7">
        <p
          className="mb-2 text-[11px] uppercase tracking-[0.2em] opacity-70"
          style={{ color: mock.ink }}
        >
          {mock.ribbon}
        </p>
        <h3
          className="mb-1 text-3xl font-medium leading-tight tracking-tight sm:text-4xl"
          style={{ fontFamily: mock.font, color: mock.ink }}
        >
          {mock.hero}
        </h3>
        <p className="text-sm opacity-75" style={{ color: mock.ink }}>
          {mock.occasion} · {mock.recipient} · from {mock.curator}
        </p>
      </div>

      <div className="mx-6 mb-6 rounded-xl bg-white/55 p-4 text-[13px] leading-relaxed backdrop-blur-sm">
        <p style={{ color: mock.ink }}>“{mock.note}”</p>
      </div>

      <ul className="mt-auto flex flex-col gap-2 px-6 pb-6">
        {mock.cards.map((c) => (
          <li
            key={c.label}
            className="flex items-center justify-between rounded-lg bg-white/65 px-4 py-3 backdrop-blur-sm"
          >
            <span
              className="text-sm font-medium"
              style={{ color: mock.ink }}
            >
              {c.label}
            </span>
            <span
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider opacity-70"
              style={{ color: mock.ink }}
            >
              {c.sub}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Showcase() {
  return (
    <section
      id="showcase"
      className="relative scroll-mt-12 px-6 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col items-start gap-4 sm:items-center sm:text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Every peek is its own world
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight sm:text-4xl md:text-5xl">
            Themed to the human, not a default template.
          </h2>
          <p className="max-w-[52ch] text-base text-muted-foreground sm:text-lg">
            The page morphs radically — colors, type, tone, rules. Same product,
            wildly different outputs.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {mocks.map((m) => (
            <MockCard key={m.id} mock={m} />
          ))}
        </div>
      </div>
    </section>
  );
}
