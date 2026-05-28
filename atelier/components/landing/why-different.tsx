import { XCircle, Target, Sparkles, Palette } from 'lucide-react';

const points = [
  {
    icon: XCircle,
    title: 'No more gift cards.',
    body: 'Effort theater. You handed someone an errand and called it a present.',
  },
  {
    icon: Target,
    title: 'No more guessing wrong.',
    body: 'They pick from your curated set. The intent lands. The money doesn’t go to waste.',
  },
  {
    icon: Sparkles,
    title: 'The chat does the work.',
    body: 'You drop hints — links, photos, voice notes, vibes. We build the page live.',
  },
  {
    icon: Palette,
    title: 'Real personalization.',
    body: 'Themed to the human in front of you, not a stock template with their name on it.',
  },
];

export function WhyDifferent() {
  return (
    <section
      id="why"
      className="relative scroll-mt-12 border-t border-border/60 bg-[hsl(var(--peek-surface))] px-6 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 flex flex-col items-start gap-4 sm:items-center sm:text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Why it&apos;s different
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight sm:text-4xl md:text-5xl">
            Not a wishlist. Not a card. A page made for one person.
          </h2>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          {points.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="flex gap-5 rounded-2xl border border-border/70 bg-background p-6 transition hover:border-foreground/30"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="mb-1.5 font-[family-name:var(--font-display)] text-xl font-medium tracking-tight">
                  {title}
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
