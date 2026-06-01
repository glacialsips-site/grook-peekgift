// ============================================================================
// peek-render/mount.ts — the mountPeek controller (INTERFACES.md §1.1)
// ----------------------------------------------------------------------------
// Imperative, framework-agnostic. Creates ONCE, update() on every IR snapshot,
// destroy() tears everything down. Self-contained absolutely-positioned root with
// its OWN internal scroll (SHELL_SPEC §0). Maps ThemeSpec → --peek-* on the root.
// ============================================================================

import type { PeekIR } from '@/lib/ir/contract';
import { sanitizeCustomHtml, sanitizeCssVars } from '@/lib/ir/schema';
import type { PeekRenderer, RenderOptions, RecipientInteractions } from './types';
import { el } from './dom';
import { ensureStyles } from './styles';
import { FontLoader } from './fonts';
import { toTokens, applyThemeVars, backgroundWash, type Tokens } from './theme';
import { buildScene } from './scenes';
import { buildSection, buildHero, type SectionContext } from './sections';
import { buildShell, type ShellHandle, type ShellRefs } from './shell';
import { toCardView, orderedCards, type CardView } from './cards';

const NOOP_INTERACTIONS: RecipientInteractions = {};

export function mountPeek(root: HTMLElement, ir: PeekIR, opts: RenderOptions): PeekRenderer {
  const doc = root.ownerDocument || document;
  ensureStyles(doc);
  const fonts = new FontLoader(doc);

  const surface = opts.surface;
  const interactions = opts.interactions || NOOP_INTERACTIONS;

  // honor prefers-reduced-motion: explicit opt OR the media query
  const mql =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  const reducedMotion = opts.reducedMotion ?? (mql ? mql.matches : false);

  // root scaffolding (persists across updates; we only rebuild the inner content)
  root.classList.add('peek-root');
  if (reducedMotion) root.classList.add('peek-reduced');

  let shell: ShellHandle | null = null;
  let currentIR = ir;

  function teardownInner() {
    if (shell) {
      shell.destroy();
      shell = null;
    }
    // remove everything we created (keep the host root element itself)
    while (root.firstChild) root.removeChild(root.firstChild);
    // clear menu/sheet state classes
    root.classList.remove('peek-menu-open', 'peek-sheet-open');
  }

  function render(next: PeekIR) {
    currentIR = next;
    teardownInner();

    const theme = next.peek.theme;
    const t: Tokens = toTokens(theme);

    // load fonts for this theme (display/body/accent) + dedupe across updates
    fonts.ensure([theme.type?.display, theme.type?.body, theme.type?.accent]);

    // theme vars on the root (+ sanitized cssVars merged last)
    const extraVars = sanitizeCssVars(theme.cssVars);
    applyThemeVars(root, theme, t, extraVars);
    root.style.background = backgroundWash(t);
    root.style.color = t.ink;

    // scene at z-0
    const sceneEl = buildScene(t);
    if (sceneEl) root.appendChild(sceneEl);

    // internal scroll container
    const scroll = el('div', { class: 'peek-scroll' });
    const content = el('div', { class: 'peek-content' });

    // card views (display order)
    const cardViews: CardView[] = orderedCards(next.cards).map(toCardView);

    // shell first (so its registries exist). It reads refs.heroEl LAZILY in start(), so we
    // pass a mutable refs object and set heroEl after building sections, before start().
    const refs: ShellRefs = { root, scroll, heroEl: null };
    const handle = buildShell(refs, next, t, cardViews, {
      surface,
      interactions,
      reducedMotion,
    });
    shell = handle;

    // section context
    const ctx: SectionContext = {
      t,
      ir: next,
      cardViews,
      onTapCard: (v) => handle.openSheet(v),
      registerCountdown: (node, target, done) => handle.registerCountdown(node, target, done),
      registerCounter: (node, target, dec, pre) => handle.registerCounter(node, target, dec, pre),
      registerClaim: (form, btn, msg) => handle.registerClaim(form, btn, msg),
      sanitize: sanitizeCustomHtml,
    };

    // nav goes at the top of the scroll content (sticky); shell built it
    const nav = (root as unknown as { __peekNav?: HTMLElement }).__peekNav;
    if (nav) content.appendChild(nav);

    // build sections in array order; first hero becomes the IO target for the action bar
    let heroEl: HTMLElement | null = null;
    next.sections.forEach((s) => {
      const node = s.kind === 'hero' ? buildHero(ctx, s) : buildSection(ctx, s);
      content.appendChild(node);
      if (s.kind === 'hero' && !heroEl) heroEl = node;
      // register section-level reveal (hero animates via load cascade, not reveal)
      if (s.kind !== 'hero') handle.observeReveal(node);
      // stagger children of grids/lists
      staggerChildren(node);
    });

    // footer
    content.appendChild(buildFooter(next, t));

    scroll.appendChild(content);
    root.appendChild(scroll);

    // hand the hero element to the shell (it reads refs.heroEl lazily in start())
    refs.heroEl = heroEl;

    // start the shell (wires scroll/IO/timers, appends overlays)
    handle.start();

    // hero auto-fit (re-run on fonts.ready since display metrics shift)
    scheduleHeroFit(root);
  }

  render(ir);

  return {
    update(next: PeekIR) {
      render(next);
    },
    destroy() {
      teardownInner();
      root.classList.remove('peek-root', 'peek-reduced');
      // leave injected <style>/<link> in head (shared, idempotent); per INTERFACES we may
      // also remove them, but they're harmless and re-created on next mount.
    },
    markPlaced(id: string) {
      const node =
        root.querySelector(`[data-section-id="${cssEsc(id)}"]`) ||
        root.querySelector(`[data-card-id="${cssEsc(id)}"]`);
      if (!node) return;
      const eln = node as HTMLElement;
      eln.classList.remove('peek-placed');
      // force reflow so re-adding the class restarts the animation
      void eln.offsetWidth;
      eln.classList.add('peek-placed');
      if (!eln.querySelector(':scope > .peek-newbadge')) {
        eln.appendChild(el('span', { class: 'peek-newbadge', text: 'Just placed' }));
      }
    },
  };
}

function buildFooter(ir: PeekIR, t: Tokens): HTMLElement {
  return el(
    'footer',
    {
      style: `padding:30px var(--peek-space-gutter) calc(110px + var(--peek-safe-b));text-align:center;border-top:1px solid ${t.line};margin-top:8px`,
    },
    [
      el('div', {
        style: `font-family:var(--peek-font-accent);font-size:11px;letter-spacing:.1em;color:${t.muted};text-transform:uppercase`,
        text:
          (ir.peek.recipient_name ? `For ${ir.peek.recipient_name} · ` : '') +
          `peek.gift/${ir.peek.slug || ''}`,
      }),
    ],
  );
}

/** Set per-child transition-delay on the children of a grid/list for the reveal stagger. */
function staggerChildren(sectionNode: HTMLElement) {
  const groups = sectionNode.querySelectorAll('.peek-grid, .peek-stub');
  // grids: stagger direct children
  const grid = sectionNode.querySelector('.peek-grid');
  if (grid) {
    [...grid.children].forEach((c, i) => {
      (c as HTMLElement).dataset.delay = String(Math.min(i, 6) * 90);
    });
  }
}

/** Auto-fit hero h1 so long words never overflow and it keeps its intended line count. */
function scheduleHeroFit(root: HTMLElement) {
  const fit = () => {
    const h = root.querySelector('.peek-hero h1') as HTMLElement | null;
    if (!h) return;
    const intended = (h.innerHTML.match(/<br>/g) || []).length + 1;
    const lineHeight = () =>
      parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize);
    const lines = () => Math.round(h.scrollHeight / lineHeight());
    let fs = parseFloat(getComputedStyle(h).fontSize);
    let g = 0;
    while ((h.scrollWidth > h.clientWidth + 1 || lines() > intended) && fs > 20 && g < 90) {
      fs -= 1.5;
      h.style.fontSize = fs + 'px';
      g++;
    }
  };
  requestAnimationFrame(fit);
  if (typeof document !== 'undefined' && (document as Document).fonts) {
    (document as Document).fonts.ready.then(() => setTimeout(fit, 40));
  }
  setTimeout(fit, 600);
}

function cssEsc(s: string): string {
  return s.replace(/["\\]/g, '\\$&');
}
