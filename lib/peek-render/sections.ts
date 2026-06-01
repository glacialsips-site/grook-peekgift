// ============================================================================
// peek-render/sections.ts — per-SectionKind builders (SHELL_SPEC §2)
// ----------------------------------------------------------------------------
// Dispatches every SectionKind. Each builder reads the documented Section.data shape
// (contract.ts §5) and skins off Tokens / --peek-* vars. All money-bearing sections
// (giftgrid/rail/stubs/tiers/lookbook/tracklist) feed the §1.4 sheet + §1.3 running
// total via ctx.onTapCard. `custom` (and any UNKNOWN kind) renders sanitized HTML.
// ============================================================================

import type { Section, PeekIR } from '@/lib/ir/contract';
import type { Tokens } from './theme';
import { el, rgba, esc, escMultiline } from './dom';
import { media, frameMedia, motifRow, MOTIFS } from './scenes';
import { toCardView, orderedCards, type CardView } from './cards';

export interface SectionContext {
  t: Tokens;
  ir: PeekIR;
  /** all card views in display order (already filtered to non-section-local) */
  cardViews: CardView[];
  /** open the detail sheet for a card */
  onTapCard: (view: CardView) => void;
  /** register a live countdown element so the shell can tick it */
  registerCountdown: (node: HTMLElement, targetISO: string, doneText?: string) => void;
  /** register a count-up numeral */
  registerCounter: (node: HTMLElement, target: number, dec: number, pre?: string) => void;
  /** register a claim panel's submit theater */
  registerClaim: (form: HTMLElement, btn: HTMLButtonElement, successMsg: string) => void;
  /** sanitize model HTML (passed in so this module has no server dep) */
  sanitize: (html: string) => string;
}

const num = (n: number, pad = 2) => String(n).padStart(pad, '0');

// ── shared section head ──────────────────────────────────────────────────────
function sectionHead(
  ctx: SectionContext,
  title: string | undefined,
  opts: { eyebrow?: string; meta?: string; centered?: boolean } = {},
): HTMLElement | null {
  if (!title && !opts.eyebrow) return null;
  const head = el('div', {
    class: 'peek-sechead' + (opts.meta ? ' peek-split' : ''),
    style: opts.centered ? 'text-align:center' : '',
  });
  const left = el('div', {});
  if (opts.eyebrow) left.appendChild(el('div', { class: 'peek-eyebrow', text: opts.eyebrow }));
  if (title) left.appendChild(el('h2', { text: title }));
  head.appendChild(left);
  if (opts.meta) head.appendChild(el('span', { class: 'peek-meta-note', text: opts.meta }));
  return head;
}

// ── card face (giftgrid / rail) ───────────────────────────────────────────────
function cardFace(ctx: SectionContext, v: CardView): HTMLElement {
  const { t } = ctx;
  if (v.isTaunt) {
    const c = el('article', { class: 'peek-card peek-card-taunt' }, [
      el('div', {
        style: `aspect-ratio:1/1;display:grid;place-items:center;background:${rgba(t.ink, 0.04)};color:${t.muted};font-family:var(--peek-font-display);font-size:13px;letter-spacing:.12em;text-transform:uppercase;text-align:center;padding:14px`,
        text: v.tauntText || 'HA, DENIED',
      }),
      el('div', { class: 'peek-card-body' }, [el('div', { class: 'peek-card-title', text: v.title })]),
    ]);
    return c;
  }

  // visual face by type
  let face: HTMLElement;
  if (v.type === 'digital') {
    face = el(
      'div',
      {
        style: `position:relative;aspect-ratio:1/1;background:${rgba(t.accent, 0.12)};display:grid;place-items:center;overflow:hidden`,
      },
      [
        el('div', { style: `color:${t.accent}`, html: MOTIFS.sparkle(34) }),
        el('span', { class: 'peek-card-src', text: 'HOMEMADE' }),
      ],
    );
  } else if (v.type === 'aspirational') {
    face = el(
      'div',
      {
        style: `position:relative;aspect-ratio:1/1;background:linear-gradient(150deg,${t.accent},${t.accent2});display:grid;place-items:center;overflow:hidden`,
      },
      [
        el('div', { style: 'color:#fff;opacity:.92', html: MOTIFS.star(34) }),
        el('span', {
          style: `position:absolute;top:8px;left:8px;font-family:var(--peek-font-accent);font-size:9px;font-weight:700;letter-spacing:.08em;color:#fff;background:${rgba('#000', 0.28)};padding:3px 8px;border-radius:var(--peek-radius-pill)`,
          text: '★ THE EXPERIENCE',
        }),
      ],
    );
  } else {
    // product / activity → photo (or themed placeholder) + retailer chip
    face = el('div', { style: 'position:relative' }, [
      media(t, '1/1', v.url, v.alt),
      v.retailer ? el('span', { class: 'peek-card-src', text: v.retailer }) : null,
    ]);
  }

  const sub =
    v.type === 'activity' && v.locationHint ? v.locationHint : v.description || '';
  const c = el(
    'article',
    {
      class:
        'peek-card' +
        (v.featured ? ' peek-card-featured' : '') +
        (v.isLocked ? ' peek-card-locked' : ''),
      style: v.featured ? `box-shadow:0 0 0 2px ${t.accent}` : '',
      role: 'button',
      'data-card-id': v.id,
      onClick: () => ctx.onTapCard(v),
    },
    [
      face,
      el('span', { class: 'peek-card-badge', text: '★ Got it' }),
      v.isLocked
        ? el('div', {
            class: 'peek-lock-badge',
            html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>`,
          })
        : null,
      el('div', { class: 'peek-card-body' }, [
        el('div', { class: 'peek-card-title', text: v.title }),
        el('div', { class: 'peek-card-foot' }, [
          el('span', { class: 'peek-card-sub', text: sub }),
          v.priceText ? el('span', { class: 'peek-card-price', text: v.priceText }) : null,
        ]),
      ]),
    ],
  );
  return c;
}

// ── giftgrid (THE CORE) — parametrized: carousel | grid | checklist + featured headline ──
function buildGiftgrid(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const intro = typeof s.data?.intro === 'string' ? (s.data.intro as string) : null;
  const layout = (strData(s, 'layout') as 'carousel' | 'grid' | 'checklist') || 'carousel';

  // optional explicit card scoping: data.cardIds whitelists which cards this grid shows (so a
  // card represented elsewhere — e.g. the dinner shown as a custom ticket — isn't duplicated).
  const idWhitelist = Array.isArray(s.data?.cardIds)
    ? (s.data.cardIds as unknown[]).filter((x): x is string => typeof x === 'string')
    : null;
  const scoped =
    idWhitelist && idWhitelist.length
      ? idWhitelist
          .map((id) => ctx.cardViews.find((v) => v.id === id))
          .filter((v): v is CardView => !!v)
      : ctx.cardViews;

  // optional featured/headline card spans full width above the rest. Either an explicit id
  // (data.featuredCardId) or, in grid mode, the first card flagged `featured`.
  const featuredId = strData(s, 'featuredCardId');
  let featured: CardView | null =
    (featuredId && scoped.find((v) => v.id === featuredId)) || null;
  if (!featured && layout === 'grid') featured = scoped.find((v) => v.featured) || null;
  const rest = featured ? scoped.filter((v) => v.id !== featured!.id) : scoped;

  const head = sectionHead(ctx, s.title || 'The Haul', { meta: `${scoped.length} ITEMS` });
  if (head) sec.appendChild(head);
  if (intro) sec.appendChild(el('p', { class: 'peek-dek', style: 'margin:0 0 16px', text: intro }));

  if (featured) sec.appendChild(headlineCard(ctx, featured));

  if (layout === 'checklist') {
    sec.appendChild(buildChecklist(ctx, rest));
  } else if (layout === 'grid') {
    const grid = el('div', { class: 'peek-grid' });
    grid.setAttribute(
      'style',
      'display:grid;grid-template-columns:repeat(2,1fr);gap:16px;align-items:start',
    );
    rest.forEach((v) => grid.appendChild(cardFace(ctx, v)));
    sec.appendChild(grid);
  } else {
    // carousel (default): horizontal snap with edge-peek (mobile caliber)
    const grid = el('div', { class: 'peek-grid' });
    grid.setAttribute(
      'style',
      'display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 calc(-1 * var(--peek-space-gutter));padding:4px var(--peek-space-gutter) 6px;',
    );
    rest.forEach((v) => {
      const c = cardFace(ctx, v);
      c.style.cssText += ';flex:0 0 64%;scroll-snap-align:start';
      grid.appendChild(c);
    });
    sec.appendChild(grid);
  }

  // subtotal line under the grid (checklist runs its own rules so skip its top border doubling)
  sec.appendChild(
    el(
      'div',
      {
        style: `display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:var(--peek-border-weight,1px) solid ${t.line}`,
      },
      [
        el('span', {
          style: `font-family:var(--peek-font-body);font-size:13px;color:${t.muted}`,
          text: `${scoped.length} things, picked with care`,
        }),
      ],
    ),
  );
  return sec;
}

// checklist layout (dad's work-order): checkbox + name (display caps) + source chip + right-rail
// price, rows divided by dashed rules. Tap a row → sheet (same claim wiring as cards).
function buildChecklist(ctx: SectionContext, views: CardView[]): HTMLElement {
  const { t } = ctx;
  const list = el('div', { class: 'peek-grid', style: 'display:block' });
  views.forEach((v, i) => {
    const row = el(
      'article',
      {
        class: 'peek-card peek-chk-row',
        style:
          `display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:13px;` +
          `padding:14px 0;border:none;border-radius:0;box-shadow:none;background:transparent;cursor:pointer;` +
          `border-bottom:1px dashed ${t.line}`,
        role: 'button',
        'data-card-id': v.id,
        onClick: () => ctx.onTapCard(v),
      },
      [
        // checkbox (2px ink border, accent check) — fills on claim via .peek-claimed
        el('div', {
          class: 'peek-chk-box',
          style:
            `width:22px;height:22px;border:2px solid ${t.ink};border-radius:4px;display:grid;place-items:center;color:${t.accent2}`,
          html: `<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" fill="none"><path d="M5 12l5 5L20 6"/></svg>`,
        }),
        el('div', { style: 'min-width:0' }, [
          el('div', {
            style: `font-family:var(--peek-font-display);font-weight:500;font-size:17px;text-transform:uppercase;color:${t.ink};letter-spacing:.01em;line-height:1.1`,
            text: v.title,
          }),
          el('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:3px' }, [
            v.retailer
              ? el('span', {
                  style: `font-family:var(--peek-font-accent);font-size:9px;letter-spacing:.04em;text-transform:uppercase;color:${t.accent};background:${rgba(t.accent, 0.12)};padding:2px 6px;border-radius:3px`,
                  text: v.retailer,
                })
              : null,
            el('span', {
              style: `font-family:var(--peek-font-accent);font-size:11px;color:${t.muted}`,
              text: v.description || '',
            }),
          ]),
        ]),
        el('div', {
          style: `font-family:var(--peek-font-display);font-weight:600;font-size:16px;color:${t.accent}`,
          text: v.priceText || '★',
        }),
      ],
    );
    list.appendChild(row);
  });
  return list;
}

// full-width headline/featured lot (gala auction): big media + copy panel + register button.
function headlineCard(ctx: SectionContext, v: CardView): HTMLElement {
  const { t } = ctx;
  const card = el(
    'article',
    {
      class: 'peek-card peek-headlot',
      style: `display:block;margin-bottom:20px;cursor:pointer`,
      role: 'button',
      'data-card-id': v.id,
      onClick: () => ctx.onTapCard(v),
    },
    [
      el('div', { style: 'position:relative' }, [
        media(t, '16/9', v.url, v.alt),
        el('span', {
          style: `position:absolute;top:14px;left:14px;font-family:var(--peek-font-display);font-style:italic;font-size:14px;color:#fff;background:${rgba('#000', 0.42)};-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:7px 16px;border:1px solid ${rgba('#fff', 0.3)}`,
          text: v.retailer || 'The Headline Lot',
        }),
      ]),
      el(
        'div',
        { style: `padding:24px ${t.gutter ? '22px' : '22px'} 22px` },
        [
          el('div', { class: 'peek-eyebrow', style: `color:${t.accent}`, text: 'The Headline Lot' }),
          el('div', {
            style: `font-family:var(--peek-font-display);font-size:28px;line-height:1.05;color:${t.ink};margin-top:12px;text-transform:var(--peek-display-case)`,
            text: v.title,
          }),
          v.description
            ? el('p', { class: 'peek-dek', style: 'margin:14px 0 0', text: v.description })
            : null,
          v.priceText
            ? el('div', {
                style: `font-family:var(--peek-font-display);font-style:italic;font-size:20px;color:${t.ink};margin-top:18px`,
                html: `<span style="font-family:var(--peek-font-body);font-style:normal;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${t.muted};display:block;margin-bottom:6px">Estimate</span>${esc(v.priceText)}`,
              })
            : null,
          el('div', { style: 'margin-top:22px' }, [
            el('button', {
              class: 'peek-btn',
              style: `background:${t.accent}`,
              text: ctx.ir.peek.cta_label || 'Register to bid',
              onClick: ((e: Event) => {
                e.stopPropagation();
                ctx.onTapCard(v);
              }) as unknown as EventListener,
            }),
          ]),
        ].filter(Boolean) as Node[],
      ),
    ],
  );
  return card;
}

// ── rail (horizontal scroller) ────────────────────────────────────────────────
function buildRail(ctx: SectionContext, s: Section): HTMLElement {
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title || 'The Collection', { eyebrow: strData(s, 'eyebrow') });
  if (head) sec.appendChild(head);
  const track = el('div', {
    style:
      'display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 calc(-1 * var(--peek-space-gutter));padding:4px var(--peek-space-gutter) 6px',
  });
  ctx.cardViews.forEach((v) => {
    const c = cardFace(ctx, v);
    c.style.cssText += ';flex:0 0 74%;scroll-snap-align:start';
    track.appendChild(c);
  });
  sec.appendChild(track);
  return sec;
}

// ── lookbook (editorial figure stack) ───────────────────────────────────────
function buildLookbook(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title || 'Lookbook', { eyebrow: strData(s, 'eyebrow') });
  if (head) sec.appendChild(head);
  ctx.cardViews.forEach((v, i) => {
    const fig = el(
      'figure',
      { style: 'margin:0 0 18px;cursor:pointer', role: 'button', onClick: () => ctx.onTapCard(v) },
      [
        frameMedia('plain', t, v.url, v.alt),
        el('figcaption', { style: 'display:flex;gap:10px;align-items:baseline;margin-top:8px' }, [
          el('span', {
            style: `font-family:var(--peek-font-accent);font-size:12px;color:${t.accent}`,
            text: num(i + 1),
          }),
          el('span', {
            style: `font-family:var(--peek-font-display);font-size:20px;color:${t.ink};text-transform:var(--peek-display-case)`,
            text: v.title,
          }),
          el('span', {
            style: `margin-left:auto;font-family:var(--peek-font-body);font-size:12px;color:${t.muted}`,
            text: v.priceText || v.description || '',
          }),
        ]),
      ],
    );
    sec.appendChild(fig);
  });
  return sec;
}

// ── gallery (photo strip) ─────────────────────────────────────────────────────
function buildGallery(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title || 'Moments', { eyebrow: strData(s, 'eyebrow') });
  if (head) sec.appendChild(head);
  const raw = Array.isArray(s.data?.images) ? (s.data.images as Array<{ url?: string | null; alt?: string }>) : [];
  const imgs = raw.length ? raw : [{}, {}, {}];
  const strip = el('div', {
    style:
      'display:flex;gap:10px;overflow-x:auto;margin:0 calc(-1 * var(--peek-space-gutter));padding:2px var(--peek-space-gutter) 6px;scroll-snap-type:x mandatory',
  });
  imgs.forEach((im, i) => {
    const m = media(t, i % 3 === 0 ? '3/4' : '1/1', im.url ?? null, im.alt);
    m.style.cssText += `;flex:0 0 ${i % 3 === 0 ? '62%' : '44%'};scroll-snap-align:start`;
    if (i % 2) m.style.transform = 'rotate(-1.5deg)';
    strip.appendChild(m);
  });
  sec.appendChild(strip);
  return sec;
}

// ── note ──────────────────────────────────────────────────────────────────────
function buildNote(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const bodyMd =
    strData(s, 'body_md') ||
    strData(s, 'body') ||
    ctx.ir.peek.note_md ||
    'Thinking of you — hope this makes your day.';
  const signature = strData(s, 'signature') || null;
  const label = strData(s, 'label') || s.title || 'A note in the box';

  const box = el(
    'div',
    {
      style: `position:relative;background:${rgba(t.accent, 0.07)};border:1px solid ${t.line};border-radius:var(--peek-radius-card);padding:22px`,
    },
    [
      el('div', {
        class: 'peek-eyebrow',
        style: 'margin-bottom:12px',
        text: label,
      }),
      el('div', {
        style: `font-family:var(--peek-font-display);font-size:19px;line-height:1.5;color:${t.ink};text-wrap:pretty`,
        html: mdInline(bodyMd),
      }),
      signature
        ? el('div', {
            style: `margin-top:14px;font-family:var(--peek-font-accent);font-size:16px;color:${t.ink}`,
            text: signature.startsWith('—') ? signature : `— ${signature}`,
          })
        : null,
    ],
  );
  sec.appendChild(box);
  return sec;
}

// ── details (when/where/dress) — parametrized: list | colored panel, key face, divider ──
function buildDetails(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title || strData(s, 'heading'), { eyebrow: strData(s, 'eyebrow') });
  if (head) sec.appendChild(head);
  const rows = Array.isArray(s.data?.rows) ? (s.data.rows as unknown[][]) : [];

  const variant = (strData(s, 'variant') as 'list' | 'panel') || 'list';
  const panel = variant === 'panel';
  // panel fill ('accent'|'accent2'|'surface'|raw) → literal color
  const fillRef = strData(s, 'panelFill') || 'accent2';
  const fill =
    fillRef === 'accent' ? t.accent : fillRef === 'accent2' ? t.accent2 : fillRef === 'surface' ? t.surface : fillRef;
  // on a colored panel, text is light; keys take a contrasting accent (marigold-on-cobalt feel)
  const onPanel = panel && fillRef !== 'surface';
  const fg = onPanel ? '#fff' : t.ink;
  const subFg = onPanel ? rgba('#fff', 0.7) : t.muted;
  const keyRef = strData(s, 'keyColor') || (onPanel ? '#F4A800' : 'accent');
  const keyColor = keyRef === 'accent' ? t.accent : keyRef === 'accent2' ? t.accent2 : keyRef;
  const dashed = strData(s, 'divider') === 'dashed' || panel;
  const showMono = s.data?.monogram === true || (variant === 'list' && s.data?.monogram !== false && !panel);
  const dividerColor = onPanel ? rgba('#fff', 0.28) : t.line;

  const list = el('div', {
    style: panel
      ? `background:${fill};border-radius:16px;padding:8px 4px;color:${fg}`
      : `border:var(--peek-border-weight,1px) solid ${t.line};border-radius:var(--peek-radius-card);overflow:hidden`,
  });
  rows.forEach((row, i) => {
    const label = String(row[0] ?? '');
    const value = String(row[1] ?? '');
    const subv = row[2] != null ? String(row[2]) : '';
    const divider = i ? `border-top:1px ${dashed ? 'dashed' : 'solid'} ${dividerColor}` : '';
    if (panel) {
      // fiesta-menu row: [KEY | value + small], dashed dividers, no monogram tile
      list.appendChild(
        el(
          'div',
          { style: `display:flex;align-items:center;gap:14px;padding:14px 18px;${divider}` },
          [
            el('span', {
              style: `font-family:var(--peek-font-display);font-size:13px;color:${keyColor};flex:0 0 78px;text-transform:uppercase`,
              text: label,
            }),
            el('div', { style: 'min-width:0' }, [
              el('div', { style: `font-weight:600;font-size:15px;color:${fg};line-height:1.2`, text: value }),
              subv
                ? el('div', { style: `font-weight:400;font-size:12px;color:${subFg};margin-top:2px`, text: subv })
                : null,
            ]),
          ],
        ),
      );
      return;
    }
    list.appendChild(
      el(
        'div',
        {
          style: `display:grid;grid-template-columns:${showMono ? 'auto 1fr' : '1fr'};gap:14px;align-items:center;padding:14px 16px;${divider}`,
        },
        [
          showMono
            ? el('div', {
                style: `width:44px;height:44px;border-radius:14px;background:${rgba(t.accent, 0.12)};color:${t.accent};display:grid;place-items:center;font-family:var(--peek-font-display);font-size:16px`,
                text: label.slice(0, 1).toUpperCase(),
              })
            : null,
          el('div', {}, [
            el('div', { class: 'peek-eyebrow', style: `color:${keyColor}`, text: label }),
            el('div', {
              style: `font-family:var(--peek-font-display);font-size:17px;color:${t.ink};margin-top:3px;text-transform:var(--peek-display-case)`,
              text: value,
            }),
            subv
              ? el('div', { style: `font-family:var(--peek-font-body);font-size:12px;color:${t.muted};margin-top:2px`, text: subv })
              : null,
          ]),
        ].filter(Boolean) as Node[],
      ),
    );
  });
  sec.appendChild(list);
  return sec;
}

// ── stats (serif-numeral count-up band, uses the existing count-up engine) ─────
function buildStats(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title, { eyebrow: strData(s, 'eyebrow') });
  if (head) sec.appendChild(head);
  const items = Array.isArray(s.data?.items) ? (s.data.items as Array<Record<string, unknown>>) : [];
  const band = el('div', {
    style:
      `display:grid;grid-template-columns:repeat(${Math.max(1, Math.min(items.length || 1, 3))},1fr);` +
      `border-top:var(--peek-border-weight,1px) solid ${t.line};border-bottom:var(--peek-border-weight,1px) solid ${t.line}`,
  });
  items.forEach((it, i) => {
    const rawVal = it.value;
    const numeric = typeof rawVal === 'number' ? rawVal : Number(rawVal);
    const dec = typeof it.dec === 'number' ? it.dec : 0;
    const pre = typeof it.pre === 'string' ? it.pre : '';
    const suf = typeof it.suf === 'string' ? it.suf : '';
    const label = String(it.label ?? '');
    const cell = el(
      'div',
      {
        style: `padding:34px 18px;text-align:center;${i ? `border-left:var(--peek-border-weight,1px) solid ${t.line}` : ''}`,
      },
      [
        el('div', { style: 'display:flex;justify-content:center;align-items:baseline' }, [
          pre
            ? el('span', {
                style: `font-family:var(--peek-font-display);font-size:36px;color:${t.accent2};line-height:1`,
                text: pre,
              })
            : null,
          (() => {
            const n = el('span', {
              style: `font-family:var(--peek-font-display);font-weight:500;font-size:44px;color:${t.ink};line-height:1;font-variant-numeric:tabular-nums`,
              text: Number.isFinite(numeric) ? '0' : String(rawVal ?? ''),
            });
            if (Number.isFinite(numeric)) ctx.registerCounter(n, numeric, dec);
            return n;
          })(),
          suf
            ? el('span', {
                style: `font-family:var(--peek-font-display);font-size:36px;color:${t.ink};line-height:1`,
                text: suf,
              })
            : null,
        ].filter(Boolean) as Node[]),
        el('div', {
          style: `font-family:var(--peek-font-body);font-size:11px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:${t.muted};margin-top:14px`,
          text: label,
        }),
      ],
    );
    band.appendChild(cell);
  });
  sec.appendChild(band);
  return sec;
}

// ── lede (centered pull-quote + body, editorial spine) ─────────────────────────
function buildLede(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', style: 'text-align:center', 'data-section-id': s.id });
  if (strData(s, 'eyebrow') || s.title) {
    sec.appendChild(el('div', { class: 'peek-eyebrow', style: 'margin-bottom:18px', text: strData(s, 'eyebrow') || s.title }));
  }
  const quote = strData(s, 'quote');
  const accentWord = strData(s, 'accentWord');
  if (quote) {
    let html = esc(quote);
    if (accentWord) {
      const ew = esc(accentWord);
      const re = new RegExp(ew.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      html = html.replace(re, `<em style="font-style:italic;color:${t.accent}">${ew}</em>`);
    }
    sec.appendChild(
      el('div', {
        style: `font-family:var(--peek-font-display);font-size:clamp(24px,7vw,34px);line-height:1.4;color:${t.ink};max-width:18ch;margin:0 auto;letter-spacing:-.005em`,
        html,
      }),
    );
  }
  const body = strData(s, 'body');
  if (body) sec.appendChild(el('p', { class: 'peek-dek', style: 'margin:22px auto 0;max-width:48ch', text: body }));
  return sec;
}

// ── steps ───────────────────────────────────────────────────────────────────
function buildSteps(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title || 'How It Ships', { meta: countLabel(s, 'STEPS') });
  if (head) sec.appendChild(head);
  const steps = normSteps(s);
  // row of numbered chips (the Send-Off pattern)
  const row = el('div', { style: 'display:flex;gap:10px' });
  steps.forEach((st) => {
    row.appendChild(
      el(
        'div',
        {
          style: `flex:1;text-align:center;padding:14px 8px;border:1px solid ${t.line};border-radius:var(--peek-radius-card);background:${t.surface}`,
        },
        [
          el('div', {
            style: `font-family:var(--peek-font-display);font-size:18px;color:${t.accent}`,
            text: st.n,
          }),
          el('div', {
            style: `font-family:var(--peek-font-body);font-size:11.5px;color:${t.muted};margin-top:6px;line-height:1.35`,
            text: st.label,
          }),
        ],
      ),
    );
  });
  sec.appendChild(row);
  return sec;
}

// ── tiers ─────────────────────────────────────────────────────────────────────
function buildTiers(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title || 'Levels', { eyebrow: strData(s, 'eyebrow') });
  if (head) sec.appendChild(head);
  const tiers =
    Array.isArray(s.data?.tiers) && (s.data.tiers as unknown[]).length
      ? (s.data.tiers as Array<Record<string, unknown>>)
      : ctx.cardViews.map((v) => ({
          name: v.title,
          price: v.priceText,
          sub: v.description,
          perks: [],
          featured: v.featured,
          _cardId: v.id,
        }));
  const grid = el('div', { style: 'display:flex;flex-direction:column;gap:12px' });
  tiers.forEach((tier) => {
    const featured = !!tier.featured;
    const perks = Array.isArray(tier.perks) ? (tier.perks as unknown[]) : [];
    const cardId = typeof tier._cardId === 'string' ? (tier._cardId as string) : null;
    const cv = cardId ? ctx.cardViews.find((v) => v.id === cardId) : null;
    grid.appendChild(
      el(
        'div',
        {
          style: `background:${t.surface};border:1px solid ${featured ? t.accent : t.line};border-radius:var(--peek-radius-card);padding:20px;${cv ? 'cursor:pointer' : ''}`,
          ...(cv ? { role: 'button', onClick: () => ctx.onTapCard(cv) } : {}),
        },
        [
          el('div', { class: 'peek-eyebrow', text: String(tier.name ?? '') }),
          el('div', {
            style: `font-family:var(--peek-font-display);font-size:30px;color:${t.ink};margin-top:6px`,
            text: String(tier.price ?? ''),
          }),
          tier.sub
            ? el('div', { style: `font-family:var(--peek-font-body);font-size:12px;color:${t.muted};margin-top:2px`, text: String(tier.sub) })
            : null,
          perks.length
            ? el(
                'ul',
                { style: `list-style:none;margin:14px 0 0;padding:0` },
                perks.map((p) =>
                  el('li', {
                    style: `font-family:var(--peek-font-body);font-size:13px;color:${t.ink};padding:8px 0;border-top:1px solid ${t.line}`,
                    text: String(p),
                  }),
                ),
              )
            : null,
        ],
      ),
    );
  });
  sec.appendChild(grid);
  return sec;
}

// ── stubs (line-up rows: ticket/roster/set) ─────────────────────────────────
function buildStubs(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title || 'The Line-Up', { meta: countLabel(s, 'PICKS') });
  if (head) sec.appendChild(head);
  const list = el('div', { style: 'display:flex;flex-direction:column;gap:12px' });
  ctx.cardViews.forEach((v, i) => {
    const row = el(
      'article',
      {
        class: 'peek-stub',
        style:
          `display:grid;grid-template-columns:54px 1fr auto;align-items:center;gap:14px;` +
          `background:${t.surface};border:1px solid ${v.featured ? t.accent : t.line};border-radius:var(--peek-radius-card);padding:13px 15px;position:relative;cursor:pointer;` +
          (v.featured ? `box-shadow:0 0 0 3px ${rgba(t.accent, 0.16)}` : ''),
        role: 'button',
        'data-card-id': v.id,
        onClick: () => ctx.onTapCard(v),
      },
      [
        el('div', {
          style: `font-family:var(--peek-font-display);font-size:30px;color:${t.accent};line-height:1;text-align:center`,
          text: num(i + 1),
        }),
        el('div', {}, [
          el('div', {
            style: `font-family:var(--peek-font-display);font-size:16px;color:${t.ink};line-height:1.15;text-transform:var(--peek-display-case)`,
            text: v.title,
          }),
          el('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:3px' }, [
            v.retailer
              ? el('span', {
                  style: `font-family:var(--peek-font-body);font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${t.accent};background:${rgba(t.accent, 0.1)};padding:2px 7px;border-radius:var(--peek-radius-pill)`,
                  text: v.retailer,
                })
              : null,
            el('span', { style: `font-size:12px;color:${t.muted}`, text: v.description || v.locationHint || '' }),
          ]),
        ]),
        el('div', {
          style: `font-family:var(--peek-font-display);font-size:16px;color:${t.accent}`,
          text: v.priceText || '★',
        }),
      ],
    );
    list.appendChild(row);
  });
  sec.appendChild(list);
  return sec;
}

// ── tracklist ─────────────────────────────────────────────────────────────────
function buildTracklist(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title || 'Side A / Side B', { eyebrow: strData(s, 'side') });
  if (head) sec.appendChild(head);
  const ol = el('ol', { style: 'list-style:none;margin:0;padding:0' });
  ctx.cardViews.forEach((v, i) => {
    ol.appendChild(
      el(
        'li',
        {
          style: `display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:2px dotted ${t.line};cursor:pointer`,
          role: 'button',
          onClick: () => ctx.onTapCard(v),
        },
        [
          el('span', {
            style: `font-family:var(--peek-font-accent);font-size:13px;color:${t.accent};min-width:30px`,
            text: 'A' + (i + 1),
          }),
          el('span', {
            style: `flex:1;font-family:var(--peek-font-display);font-size:15px;color:${t.ink};text-transform:var(--peek-display-case)`,
            text: v.title,
          }),
          el('span', {
            style: `font-family:var(--peek-font-accent);font-size:13px;color:${t.muted}`,
            text: v.priceText || v.description || '',
          }),
        ],
      ),
    );
  });
  sec.appendChild(ol);
  return sec;
}

// ── courses (tasting menu) ────────────────────────────────────────────────────
function buildCourses(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title || 'The Menu', { eyebrow: strData(s, 'eyebrow') });
  if (head) sec.appendChild(head);
  ctx.cardViews.forEach((v, i) => {
    sec.appendChild(
      el(
        'div',
        {
          style: `display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:baseline;padding:16px 0;border-top:1px solid ${t.line};cursor:pointer`,
          role: 'button',
          onClick: () => ctx.onTapCard(v),
        },
        [
          el('span', {
            style: `font-family:var(--peek-font-display);font-size:24px;color:${t.accent}`,
            text: num(i + 1),
          }),
          el('div', {}, [
            el('div', {
              style: `font-family:var(--peek-font-display);font-size:17px;color:${t.ink};text-transform:var(--peek-display-case)`,
              text: v.title,
            }),
            el('div', { style: `font-family:var(--peek-font-body);font-size:12.5px;color:${t.muted};margin-top:2px`, text: v.description || '' }),
          ]),
          el('span', { style: `font-family:var(--peek-font-accent);font-size:12px;color:${t.muted}`, text: v.priceText || '' }),
        ],
      ),
    );
  });
  return sec;
}

// ── flightplan (itinerary spine) ────────────────────────────────────────────
function buildFlightplan(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const head = sectionHead(ctx, s.title || 'Flight Plan', { eyebrow: strData(s, 'eyebrow') });
  if (head) sec.appendChild(head);
  const phases =
    Array.isArray(s.data?.phases) && (s.data.phases as unknown[]).length
      ? (s.data.phases as Array<Record<string, unknown>>)
      : ctx.cardViews.map((v) => ({ time: v.priceText || '', title: v.title, desc: v.description }));
  const ol = el('ol', {
    style: `list-style:none;margin:0;padding:0 0 0 26px;border-left:2px dashed ${t.accent}`,
  });
  phases.forEach((ph) => {
    ol.appendChild(
      el('li', { style: 'position:relative;padding:0 0 20px' }, [
        el('i', {
          style: `position:absolute;left:-33px;top:3px;width:12px;height:12px;border-radius:50%;background:${t.bg};border:2px solid ${t.accent};box-shadow:0 0 0 4px ${t.bg}`,
        }),
        ph.time
          ? el('div', { style: `font-family:var(--peek-font-accent);font-size:11px;letter-spacing:.1em;color:${t.accent};margin-bottom:3px`, text: String(ph.time) })
          : null,
        el('div', {
          style: `font-family:var(--peek-font-display);font-size:16px;color:${t.ink};text-transform:var(--peek-display-case)`,
          text: String(ph.title ?? ''),
        }),
        ph.desc
          ? el('div', { style: `font-family:var(--peek-font-body);font-size:13px;color:${t.muted};margin-top:2px`, text: String(ph.desc) })
          : null,
      ]),
    );
  });
  sec.appendChild(ol);
  return sec;
}

// ── countdown (LIVE) ──────────────────────────────────────────────────────────
function buildCountdown(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', style: 'text-align:center', 'data-section-id': s.id });
  const label = strData(s, 'label') || s.title;
  if (label) sec.appendChild(el('div', { class: 'peek-eyebrow', style: 'margin-bottom:14px', text: label }));
  const target = strData(s, 'target_iso') || strData(s, 'target') || '';
  const units = ['d', 'h', 'm', 's'];
  const labels: Record<string, string> = { d: 'Days', h: 'Hours', m: 'Min', s: 'Sec' };
  const row = el('div', { style: 'display:flex;gap:14px;justify-content:center' });
  units.forEach((u) => {
    row.appendChild(
      el('div', { style: 'text-align:center' }, [
        el('div', {
          'data-k': u,
          style: `font-family:var(--peek-font-display);font-size:38px;color:${t.ink};font-variant-numeric:tabular-nums;line-height:1`,
          text: '00',
        }),
        el('div', {
          style: `font-family:var(--peek-font-body);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${t.accent2};margin-top:6px`,
          text: labels[u],
        }),
      ]),
    );
  });
  sec.appendChild(row);
  if (target) ctx.registerCountdown(row, target, strData(s, 'doneText') || strData(s, 'done_text') || undefined);
  return sec;
}

// ── claim (RSVP / final action) ───────────────────────────────────────────────
function buildClaim(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const sec = el('section', { class: 'peek-sec peek-reveal', 'data-section-id': s.id });
  const field = (s.data?.field as { type?: string; placeholder?: string } | undefined) || {};
  const successMsg = strData(s, 'success_msg') || 'You are on the list ✓';
  const panel = el('div', {
    style:
      `position:relative;border-radius:var(--peek-radius-lg);border:1px solid ${t.line};background:${t.surface};` +
      `padding:32px var(--peek-space-gutter);text-align:center;overflow:hidden`,
  });
  // Allow a HEADING-LESS claim: when eyebrow is explicitly '' and there is no title/heading,
  // suppress the "YOU'RE INVITED / Will you be there?" boilerplate (single-action invites where
  // the hero already carries the message — e.g. El Taquito's RSVP).
  const eyebrowRaw = s.data?.eyebrow;
  const hasEyebrowKey = typeof eyebrowRaw === 'string';
  const eyebrowTxt = strData(s, 'eyebrow');
  const headingTxt = s.title || strData(s, 'heading');
  const suppressHeading = hasEyebrowKey && eyebrowRaw === '' && !headingTxt;

  const mr = motifRow(t, 18);
  if (mr && !suppressHeading) {
    mr.style.marginBottom = '14px';
    panel.appendChild(mr);
  }
  if (!suppressHeading) {
    if (eyebrowTxt || !hasEyebrowKey) {
      panel.appendChild(el('div', { class: 'peek-eyebrow', text: eyebrowTxt || 'You’re invited' }));
    }
    panel.appendChild(
      el('h2', {
        style: `font-family:var(--peek-font-display);font-size:30px;color:${t.ink};margin:8px 0 0;line-height:1.05;text-transform:var(--peek-display-case)`,
        text: headingTxt || 'Will you be there?',
      }),
    );
  }
  const dek = strData(s, 'dek');
  if (dek) panel.appendChild(el('p', { class: 'peek-dek', style: 'margin:10px auto 0;max-width:30em', text: dek }));

  const form = el('form', { style: 'display:flex;gap:8px;margin-top:20px' });
  const input = el('input', {
    type: field.type === 'email' ? 'email' : 'text',
    placeholder: field.placeholder || 'your@email.com',
    style: `flex:1;font-family:var(--peek-font-body);font-size:14px;padding:13px 14px;border:1px solid ${t.line};border-radius:var(--peek-radius-pill);background:${t.bg};color:${t.ink}`,
  });
  const btn = el('button', { class: 'peek-btn', type: 'submit', text: ctx.ir.peek.cta_label || 'RSVP' }) as HTMLButtonElement;
  form.appendChild(input);
  form.appendChild(btn);
  panel.appendChild(form);
  const fine = strData(s, 'fine');
  if (fine) panel.appendChild(el('div', { style: `font-family:var(--peek-font-body);font-size:11px;color:${t.muted};margin-top:12px`, text: fine }));

  ctx.registerClaim(form, btn, successMsg);
  sec.appendChild(panel);
  return sec;
}

// ── custom (escape hatch) + unknown-kind fallback ────────────────────────────
function buildCustom(ctx: SectionContext, s: Section): HTMLElement {
  const sec = el('section', { class: 'peek-sec peek-reveal peek-custom-sec', 'data-section-id': s.id });
  if (s.title) {
    const head = sectionHead(ctx, s.title, {});
    if (head) sec.appendChild(head);
  }
  const raw = strData(s, 'html') || '';
  const box = el('div', { class: 'peek-custom' });
  box.innerHTML = ctx.sanitize(raw); // sanitize even if upstream did — belt + suspenders
  sec.appendChild(box);
  return sec;
}

// ── dispatch ──────────────────────────────────────────────────────────────────
export function buildSection(ctx: SectionContext, s: Section): HTMLElement {
  switch (s.kind) {
    case 'hero':
      return buildHero(ctx, s); // exported separately; hero is special (load cascade)
    case 'note':
      return buildNote(ctx, s);
    case 'giftgrid':
      return buildGiftgrid(ctx, s);
    case 'rail':
      return buildRail(ctx, s);
    case 'lookbook':
      return buildLookbook(ctx, s);
    case 'gallery':
      return buildGallery(ctx, s);
    case 'details':
      return buildDetails(ctx, s);
    case 'stats':
      return buildStats(ctx, s);
    case 'lede':
      return buildLede(ctx, s);
    case 'steps':
      return buildSteps(ctx, s);
    case 'countdown':
      return buildCountdown(ctx, s);
    case 'claim':
      return buildClaim(ctx, s);
    case 'tiers':
      return buildTiers(ctx, s);
    case 'stubs':
      return buildStubs(ctx, s);
    case 'tracklist':
      return buildTracklist(ctx, s);
    case 'courses':
      return buildCourses(ctx, s);
    case 'flightplan':
      return buildFlightplan(ctx, s);
    case 'custom':
      return buildCustom(ctx, s);
    default:
      // unknown kind → render as custom (sanitized) so forward-compat never breaks
      return buildCustom(ctx, s);
  }
}

// ── HERO (4 variants) ─────────────────────────────────────────────────────────
export function buildHero(ctx: SectionContext, s: Section): HTMLElement {
  const { t } = ctx;
  const eyebrowTxt = strData(s, 'eyebrow');
  const headline = strData(s, 'headline') || ctx.ir.peek.recipient_name || '';
  const dekTxt = strData(s, 'dek');
  const variant = strData(s, 'variant') || (s.media?.url || ctx.ir.peek.hero?.url ? 'framed-media' : 'type-mega');
  const heroMedia = s.media || ctx.ir.peek.hero || undefined;
  const ledger = Array.isArray(s.data?.ledger) ? (s.data.ledger as unknown[][]) : [];

  const sectionEl = el('section', {
    class: 'peek-hero peek-sec',
    'data-section-id': s.id,
    style: 'position:relative;z-index:1;padding-top:24px',
  });

  // hero inline accent: color + optional italic on ONE matching word (the rust "OLD MAN",
  // the italic "Gala"). Falls back to plain escaped text when no accent authored.
  const accentSpec = (s.data?.accent && typeof s.data.accent === 'object'
    ? (s.data.accent as { word?: string; color?: string; italic?: boolean })
    : null);
  const headlineHtml = accentSpec?.word
    ? accentHeadlineHtml(headline, accentSpec, t)
    : escMultiline(headline);

  const mkEyebrow = (cls = '') =>
    eyebrowTxt ? el('div', { class: 'peek-eyebrow peek-anim ' + cls, style: 'animation-delay:.1s' as string, text: eyebrowTxt }) : null;
  const mkHead = (size: string, lh: string) =>
    el('h1', {
      class: 'peek-anim',
      style:
        `margin:14px 0 0;font-family:var(--peek-font-display);font-weight:700;line-height:${lh};` +
        `font-size:${size};letter-spacing:var(--peek-display-tracking);text-transform:var(--peek-display-case);color:${t.ink};` +
        `animation-delay:.28s;text-shadow:var(--peek-display-shadow,${t.glow ? `0 0 20px ${rgba(t.accent, 0.55)}` : 'none'});`,
      html: headlineHtml,
    });
  const mkDek = () =>
    dekTxt
      ? el('p', { class: 'peek-dek peek-anim', style: 'margin:18px 0 0;max-width:32em;animation-delay:.46s', text: dekTxt })
      : null;
  const mkLedger = () =>
    ledger.length
      ? (() => {
          const strip = el('div', {
            class: 'peek-anim',
            style: `display:flex;margin-top:18px;border:1px solid ${t.ink === '#000' ? t.line : t.ink};border-radius:var(--peek-radius-card);overflow:hidden;animation-delay:.62s`,
          });
          ledger.forEach((row, i) => {
            strip.appendChild(
              el(
                'div',
                {
                  style: `flex:1;padding:10px 12px;${i < ledger.length - 1 ? `border-right:1px solid ${t.ink === '#000' ? t.line : t.ink}` : ''}`,
                },
                [
                  el('div', {
                    style: `font-family:var(--peek-font-accent);font-size:9px;letter-spacing:.1em;color:${t.muted};text-transform:uppercase`,
                    text: String(row[0] ?? ''),
                  }),
                  el('div', {
                    style: `font-family:var(--peek-font-display);font-weight:600;font-size:16px;color:${t.ink};margin-top:3px`,
                    text: String(row[1] ?? ''),
                  }),
                ],
              ),
            );
          });
          return strip;
        })()
      : null;

  if (variant === 'full-bleed-photo' && heroMedia?.url) {
    sectionEl.style.cssText =
      'position:relative;z-index:1;min-height:88vh;display:flex;flex-direction:column;justify-content:flex-end;padding:30px var(--peek-space-gutter) calc(var(--peek-space-section-y) * .7)';
    const bg = el('div', { style: 'position:absolute;inset:0;z-index:0;overflow:hidden' }, [
      el('img', {
        class: t.intensity > 0 ? 'peek-amb' : '',
        src: heroMedia.url,
        alt: heroMedia.alt || '',
        style: `width:100%;height:100%;object-fit:cover;${t.intensity > 0 ? 'animation:peek-ken 24s ease-in-out infinite alternate;' : ''}`,
      }),
      el('div', {
        style: `position:absolute;inset:0;background:linear-gradient(180deg,${rgba(t.bg, 0.2)} 0%,${rgba(t.bg, 0.5)} 52%,${t.bg} 100%)`,
      }),
    ]);
    sectionEl.appendChild(bg);
    sectionEl.appendChild(
      el('div', { style: 'position:relative;z-index:1' }, [mkEyebrow(), mkHead('clamp(54px,15vw,108px)', '.92'), mkDek(), mkLedger()].filter(Boolean) as Node[]),
    );
    return sectionEl;
  }

  if (variant === 'framed-media') {
    const left = el('div', {}, [mkEyebrow(), mkHead('clamp(40px,12vw,64px)', '.96'), mkDek(), mkLedger()].filter(Boolean) as Node[]);
    sectionEl.appendChild(left);
    if (heroMedia) {
      sectionEl.appendChild(
        el('div', { class: 'peek-anim', style: 'margin-top:24px;animation-delay:.7s' }, [
          frameMedia(heroMedia.frame || t.frame, t, heroMedia.url, heroMedia.alt, strData(s, 'caption') || undefined),
        ]),
      );
    }
    const mr = motifRow(t);
    if (mr) {
      mr.classList.add('peek-anim');
      mr.style.marginTop = '20px';
      mr.style.animationDelay = '.86s';
      mr.style.justifyContent = 'flex-start';
      sectionEl.appendChild(mr);
    }
    return sectionEl;
  }

  if (variant === 'centered') {
    sectionEl.style.textAlign = 'center';
    const mr = motifRow(t);
    if (mr) {
      mr.classList.add('peek-anim');
      mr.style.marginBottom = '16px';
      sectionEl.appendChild(mr);
    }
    sectionEl.appendChild(
      el('div', {}, [mkEyebrow(), mkHead('clamp(44px,13vw,72px)', '1.0'), mkDek()].filter(Boolean) as Node[]),
    );
    if (heroMedia) {
      sectionEl.appendChild(
        el('div', { class: 'peek-anim', style: 'margin-top:26px;display:flex;justify-content:center;animation-delay:.62s' }, [
          frameMedia(heroMedia.frame || (t.frame === 'idcard' ? 'locket' : t.frame), t, heroMedia.url, heroMedia.alt),
        ]),
      );
    }
    return sectionEl;
  }

  // type-mega (default)
  sectionEl.style.paddingTop = '40px';
  sectionEl.appendChild(
    el('div', {}, [mkEyebrow(), mkHead('clamp(54px,14vw,120px)', '.9'), mkDek(), mkLedger()].filter(Boolean) as Node[]),
  );
  // type-mega still renders a framed photo slot when the hero carries media (the mockup's
  // [YOUR PHOTO] framed block under the work-order header).
  if (heroMedia) {
    sectionEl.appendChild(
      el('div', { class: 'peek-anim', style: 'margin-top:18px;animation-delay:.74s' }, [
        frameMedia(heroMedia.frame || t.frame, t, heroMedia.url, heroMedia.alt, strData(s, 'caption') || undefined),
      ]),
    );
  }
  const mr = motifRow(t);
  if (mr) {
    mr.classList.add('peek-anim');
    mr.style.marginTop = '24px';
    mr.style.justifyContent = 'flex-start';
    sectionEl.appendChild(mr);
  }
  return sectionEl;
}

// ── small helpers ──────────────────────────────────────────────────────────────
function strData(s: Section, key: string): string {
  const v = s.data?.[key];
  return typeof v === 'string' ? v : '';
}
function countLabel(s: Section, word: string): string {
  const steps = s.data?.steps;
  const n = Array.isArray(steps) ? steps.length : 0;
  return n ? `${n} ${word}` : '';
}
function normSteps(s: Section): Array<{ n: string; label: string; desc?: string }> {
  const raw = s.data?.steps;
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (Array.isArray(item)) return { n: String(item[0] ?? num(i + 1)), label: String(item[1] ?? '') };
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      return { n: String(o.n ?? num(i + 1)), label: String(o.title ?? o.label ?? ''), desc: o.desc ? String(o.desc) : undefined };
    }
    return { n: num(i + 1), label: String(item) };
  });
}

/** Render a hero headline with ONE accent word colored/italicized. Escapes the whole headline
 *  first (XSS-safe), converts \n → <br>, then wraps the (already-escaped) accent word in a span.
 *  color: 'accent'|'accent2'|raw css color. The match is case-insensitive on the raw word. */
function accentHeadlineHtml(
  headline: string,
  spec: { word?: string; color?: string; italic?: boolean },
  t: Tokens,
): string {
  const word = spec.word || '';
  if (!word) return escMultiline(headline);
  const color =
    spec.color === 'accent' || !spec.color
      ? t.accent
      : spec.color === 'accent2'
        ? t.accent2
        : spec.color;
  const escFull = escMultiline(headline);
  const escWord = esc(word);
  const style =
    `color:${color}` + (spec.italic ? ';font-style:italic;font-weight:400' : '');
  // case-insensitive replace of the escaped word (handles "OLD MAN" across a <br> too, since
  // escMultiline already turned \n into <br> — match the literal escaped substring).
  const re = new RegExp(escWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (!re.test(escFull)) return escFull;
  return escFull.replace(re, `<em style="${style}">${escWord}</em>`);
}

/** Minimal inline markdown → safe HTML for the note (bold/italic/links).
 *  Escapes first, then re-introduces a whitelist of inline marks. No block HTML. */
function mdInline(md: string): string {
  let h = esc(md);
  // **bold** / __bold__
  h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
  // *italic* / _italic_
  h = h.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>').replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>');
  // line breaks
  h = h.replace(/\n/g, '<br>');
  return h;
}
