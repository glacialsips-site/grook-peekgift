import { MessageSquare, Send, Heart } from 'lucide-react';

const steps = [
  {
    n: '01',
    icon: MessageSquare,
    title: 'Build',
    body: 'Chat with Peek. Tell us who, what, how — drop links, photos, vibes. We assemble it live.',
  },
  {
    n: '02',
    icon: Send,
    title: 'Send',
    body: 'One link. The page is themed to them — princess pink for the niece, editorial slate for dad’s 70th.',
  },
  {
    n: '03',
    icon: Heart,
    title: 'They pick',
    body: 'Recipient picks the gifts they actually want, under whatever rules you set. You get a list. You order. Real gift, no waste.',
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-12 border-t border-border/60 bg-[hsl(var(--peek-surface))] px-6 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 flex flex-col items-start gap-4 sm:items-center sm:text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            How it works
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight sm:text-4xl md:text-5xl">
            Three steps. No catalog. No template.
          </h2>
        </div>

        <ol className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {steps.map(({ n, icon: Icon, title, body }) => (
            <li
              key={n}
              className="group relative flex flex-col rounded-2xl border border-border/70 bg-background p-7 transition hover:border-foreground/30 hover:shadow-lg hover:shadow-foreground/[0.04]"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
                  {n}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--peek-surface))] text-foreground transition group-hover:bg-foreground group-hover:text-background">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <h3 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-medium tracking-tight">
                {title}
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
