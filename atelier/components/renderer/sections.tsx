/**
 * RSC SECTION PRIMITIVES.
 * =======================
 *
 * Pure React Server Components — NO 'use client', no hooks, no JS shipped for
 * theming. Each maps a grammar `Section` (type + variant + content slots) to
 * markup that carries a `data-variant` (the structural selector) and reads
 * ONLY `var(--vibe-*)` for paint (via the CSS module). The SAME component
 * renders a Vegas poster or a cream invite — the vibe vars on the wrapper
 * differ, the component does not.
 *
 * Structure picked by `data-*` enum; paint by CSS custom properties.
 */

import * as React from 'react';
import type {
  CtaVariant,
  DividerVariant,
  FooterVariant,
  HeroVariant,
  ProductSetVariant,
  Section,
  StoryVariant,
} from '@/lib/vibe/grammar';
import type { PageContent, RenderCard } from './page-state';
import { s } from './styles';

/* ── content resolution ──────────────────────────────────────────────────── */

function resolveText(ref: string | undefined, content: PageContent): string | null {
  if (!ref) return null;
  switch (ref) {
    case 'title':
      return content.title;
    case 'subtitle':
      return content.subtitle;
    case 'noteMd':
      return content.noteMd;
    case 'signature':
      return content.signature;
    case 'cta:primary':
      return 'Open your gift';
    default:
      if (ref.startsWith('group:')) {
        const id = ref.slice('group:'.length);
        return content.groups.find((g) => g.id === id)?.title ?? null;
      }
      return null;
  }
}

function bgImageStyle(url: string | null): React.CSSProperties | undefined {
  return url ? { backgroundImage: `url(${cssUrl(url)})` } : undefined;
}

/** Escape a URL for safe use inside a CSS url() in an inline style. */
function cssUrl(url: string): string {
  return url.replace(/["'()\\]/g, (m) => `\\${m}`);
}

/* ════════════════════════════════════════════════════════════════════════
 * HERO
 * ════════════════════════════════════════════════════════════════════════ */

export function Hero({
  variant,
  title,
  subtitle,
  imageUrl,
}: {
  variant: HeroVariant;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
}) {
  const usesImage = variant !== 'minimal-mark' && variant !== 'centered-type';
  const showMedia = imageUrl && usesImage;
  const isOverlay = variant === 'full-bleed-image';
  return (
    <header className={s.hero} data-variant={variant}>
      {showMedia ? (
        <div
          className={s.heroMedia}
          style={bgImageStyle(imageUrl)}
          aria-hidden
        />
      ) : null}
      {isOverlay ? <div className={s.heroScrim} aria-hidden /> : null}
      {variant === 'centered-type' && imageUrl ? (
        <div
          className={s.heroMedia}
          style={bgImageStyle(imageUrl)}
          aria-hidden
        />
      ) : null}
      <div className={s.heroInner}>
        <p className={s.eyebrow}>a peek for</p>
        <h1 className={`${s.headingDisplay} ${s.heroTitle}`}>{title}</h1>
        {subtitle ? <p className={s.bodyText}>{subtitle}</p> : null}
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * STORY
 * ════════════════════════════════════════════════════════════════════════ */

export function Story({
  variant,
  body,
  imageUrl,
}: {
  variant: StoryVariant;
  body: string;
  imageUrl: string | null;
}) {
  // The note may be markdown; for the SSR proof we render it as plain
  // paragraphs (split on blank lines). Rich markdown rendering is a later
  // bolt-on; the renderer's job here is layout + vibe, not a markdown engine.
  const paras = body.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  return (
    <section className={s.story} data-variant={variant}>
      {variant === 'two-up' && imageUrl ? (
        <div className={s.storyMedia} style={bgImageStyle(imageUrl)} aria-hidden />
      ) : null}
      {variant === 'timeline' ? (
        <div>
          {paras.map((p, i) => (
            <div key={i} className={s.timelineBeat}>
              <span className={s.timelineDot} aria-hidden />
              <p className={s.storyBody}>{p}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className={s.storyBody}>
          {paras.map((p, i) => (
            <p key={i} style={i > 0 ? { marginTop: '1em' } : undefined}>
              {p}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * PRODUCT-CARD-SET
 * ════════════════════════════════════════════════════════════════════════ */

function ProductCard({ card }: { card: RenderCard }) {
  return (
    <li className={s.card}>
      <div
        className={s.cardMedia}
        data-placeholder={card.imageUrl ? undefined : 'true'}
        style={bgImageStyle(card.imageUrl)}
        aria-hidden
      />
      <div className={s.cardBody}>
        {card.tag ? <span className={s.cardTag}>{card.tag}</span> : null}
        <h3 className={s.cardTitle}>{card.title}</h3>
        {card.priceLabel ? <p className={s.cardPrice}>{card.priceLabel}</p> : null}
        {card.description ? (
          <p className={s.cardCaption}>{card.description}</p>
        ) : null}
      </div>
    </li>
  );
}

export function ProductCardSet({
  variant,
  heading,
  cards,
}: {
  variant: ProductSetVariant;
  heading: string | null;
  cards: readonly RenderCard[];
}) {
  return (
    <section className={s.section}>
      {heading ? <h2 className={s.sectionHeading}>{heading}</h2> : null}
      <div className={s.cardSet} data-variant={variant}>
        <ul className={s.cardList}>
          {cards.map((c) => (
            <ProductCard key={c.id} card={c} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * CTA / DIVIDER / FOOTER
 * ════════════════════════════════════════════════════════════════════════ */

export function Cta({
  variant,
  label,
  secondaryLabel,
}: {
  variant: CtaVariant;
  label: string;
  secondaryLabel: string | null;
}) {
  if (variant === 'inline-link') {
    return (
      <div className={s.cta} data-variant={variant}>
        <a className={s.buttonLink} href="#gifts">
          {label}
        </a>
      </div>
    );
  }
  return (
    <div className={s.cta} data-variant={variant}>
      <a className={s.button} href="#gifts">
        {label}
      </a>
      {secondaryLabel ? (
        <a className={s.button} data-emphasis="outline" href="#note">
          {secondaryLabel}
        </a>
      ) : null}
    </div>
  );
}

export function Divider({ variant, label }: { variant: DividerVariant; label: string | null }) {
  return (
    <div className={s.divider} data-variant={variant}>
      {variant === 'rule' ? <hr /> : null}
      {variant === 'label' ? <span>{label ?? '•'}</span> : null}
      {variant === 'motif' ? <span aria-hidden>✦ ✦ ✦</span> : null}
    </div>
  );
}

export function Footer({
  variant,
  signature,
}: {
  variant: FooterVariant;
  signature: string | null;
}) {
  return (
    <footer className={s.footer} data-variant={variant}>
      {signature ? <p>{signature}</p> : null}
      <p>made with peek.gift</p>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * DISPATCH — render any section by its discriminant
 * ════════════════════════════════════════════════════════════════════════ */

export function RenderSection({
  section,
  content,
}: {
  section: Section;
  content: PageContent;
}) {
  switch (section.type) {
    case 'hero':
      return (
        <Hero
          variant={section.variant}
          title={resolveText(section.slots.titleRef, content) ?? content.title}
          subtitle={resolveText(section.slots.subtitleRef, content)}
          imageUrl={section.slots.imageRef ? content.heroImageUrl : null}
        />
      );
    case 'story': {
      const body = resolveText(section.slots.bodyRef, content);
      if (!body) return null;
      return (
        <Story
          variant={section.variant}
          body={body}
          imageUrl={section.slots.imageRef ? content.heroImageUrl : null}
        />
      );
    }
    case 'productSet': {
      const cards = section.slots.cardRefs
        .map((id) => content.cards[id])
        .filter((c): c is RenderCard => Boolean(c));
      if (cards.length === 0) return null;
      return (
        <ProductCardSet
          variant={section.variant}
          heading={resolveText(section.slots.headingRef, content)}
          cards={cards}
        />
      );
    }
    case 'divider':
      return <Divider variant={section.variant} label={null} />;
    case 'cta':
      return (
        <Cta
          variant={section.variant}
          label={resolveText(section.slots.labelRef, content) ?? 'Open your gift'}
          secondaryLabel={resolveText(section.slots.secondaryLabelRef, content)}
        />
      );
    case 'footer':
      return (
        <Footer
          variant={section.variant}
          signature={resolveText(section.slots.signatureRef, content)}
        />
      );
  }
}
