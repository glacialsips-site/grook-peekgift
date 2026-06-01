// ============================================================================
// peek-render/shell.ts — the shared interaction shell (SHELL_SPEC §1)
// ----------------------------------------------------------------------------
// Builds + wires the overlays that wrap every page: top bar (condense-on-scroll OR
// glass), hamburger→staggered menu, sticky action bar (IO reveal past hero + LIVE
// running total), bottom sheet (populated from tapped card, claim→state+badge+dim,
// recompute total, auto-close), scroll reveals (IO+stagger+failsafe), hero load
// cascade, count-ups, live countdowns, claim theater, ?cc= deep-link, markPlaced.
//
// Everything is position:absolute to the .peek-root (NOT fixed) and observes the
// internal .peek-scroll container — so overlays never escape the device frame.
// ============================================================================

import type { PeekIR } from '@/lib/ir/contract';
import type { RecipientInteractions } from './types';
import type { Tokens } from './theme';
import { el, rgba, esc } from './dom';
import { media } from './scenes';
import {
  type CardView,
  computeTotal,
  formatTotal,
  type TotalState,
} from './cards';

export interface ShellRefs {
  root: HTMLElement;
  scroll: HTMLElement;
  heroEl: HTMLElement | null;
}

export interface ShellHandle {
  /** open the bottom sheet for a card view */
  openSheet(view: CardView): void;
  /** the set of claimed card ids (recipient state mirror; builder uses it for the bar too) */
  claimed: Set<string>;
  /** recompute + repaint the running total in the action bar */
  refreshTotal(): void;
  /** tick registry hooks */
  registerCountdown(node: HTMLElement, targetISO: string, doneText?: string): void;
  registerCounter(node: HTMLElement, target: number, dec: number, pre?: string): void;
  registerClaim(form: HTMLElement, btn: HTMLButtonElement, successMsg: string): void;
  /** observe a node for scroll-reveal (with sibling stagger handled by caller groups) */
  observeReveal(node: HTMLElement): void;
  /** start everything once the DOM is in place */
  start(): void;
  /** tear down all timers/observers/listeners */
  destroy(): void;
}

export function buildShell(
  refs: ShellRefs,
  ir: PeekIR,
  t: Tokens,
  cardViews: CardView[],
  opts: {
    surface: 'builder' | 'recipient';
    interactions: RecipientInteractions;
    reducedMotion: boolean;
  },
): ShellHandle {
  const { root, scroll } = refs;
  const isRecipient = opts.surface === 'recipient';
  const viewById = new Map(cardViews.map((v) => [v.id, v]));
  const claimed = new Set<string>();

  // ── teardown bag ──
  const cleanups: Array<() => void> = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  const intervals: ReturnType<typeof setInterval>[] = [];
  const observers: IntersectionObserver[] = [];
  const on = (target: EventTarget, type: string, fn: EventListener, optsL?: AddEventListenerOptions) => {
    target.addEventListener(type, fn, optsL);
    cleanups.push(() => target.removeEventListener(type, fn, optsL));
  };

  // ════════════════════════════════════════════════════════════════════════
  // TOP BAR (hero-dependent state resolved lazily in start(), since sections — and
  // thus refs.heroEl — are built AFTER the shell)
  // ════════════════════════════════════════════════════════════════════════
  const heroIsFullBleedPhoto = () =>
    !!refs.heroEl &&
    refs.heroEl.querySelector('img') != null &&
    (refs.heroEl.style.minHeight || '').length > 0;

  const wordmark = el('div', {
    class: 'peek-wordmark',
    html: `${esc(brand(ir))}<b>.</b>`,
  });
  const burger = el(
    'button',
    {
      class: 'peek-burger',
      'aria-label': 'Menu',
    },
    [el('span', {})],
  );
  const nav = el('div', { class: 'peek-nav' }, [wordmark, burger]);

  // ════════════════════════════════════════════════════════════════════════
  // SCROLL PROGRESS
  // ════════════════════════════════════════════════════════════════════════
  const progress = el('div', { class: 'peek-progress' });

  // ════════════════════════════════════════════════════════════════════════
  // MENU
  // ════════════════════════════════════════════════════════════════════════
  const scrim = el('div', { class: 'peek-scrim' });
  const menu = el('nav', { class: 'peek-menu', 'aria-label': 'Page menu' });
  menu.appendChild(el('div', { class: 'peek-menu-head', text: brand(ir) }));
  const navLinks = menuLinks(ir);
  navLinks.forEach((lnk, i) => {
    const a = el(
      'a',
      {
        class: 'peek-mlink',
        href: lnk.href,
        style: `transition-delay:${(0.08 + i * 0.06).toFixed(2)}s`,
      },
      [el('span', { text: lnk.label }), el('span', { class: 'peek-ix', text: lnk.ix })],
    );
    on(a, 'click', () => closeMenu());
    menu.appendChild(a);
  });
  // footer: when/where line from peek
  const when = peekWhenWhere(ir);
  if (when) {
    menu.appendChild(
      el('div', { class: 'peek-menu-foot' }, [
        el('div', { class: 'peek-eyebrow', text: ir.peek.occasion || 'The details' }),
        el('div', { class: 'peek-when', text: when }),
      ]),
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ACTION BAR (the money bar)
  // ════════════════════════════════════════════════════════════════════════
  const barK = el('div', { class: 'peek-k', text: ir.peek.occasion || ir.peek.recipient_name || 'Your picks' });
  const barV = el('div', { class: 'peek-v', text: '' });
  const barBtn = el('button', { class: 'peek-btn', text: ctaLabel(ir) }) as HTMLButtonElement;
  const bar = el('div', { class: 'peek-bar' }, [el('div', { class: 'peek-bar-meta' }, [barK, barV]), barBtn]);
  const fallbackTotal = isRecipient ? 'Pick something' : ctaSubtitle(ir);
  on(barBtn, 'click', () => {
    if (isRecipient) opts.interactions.onCheckout?.();
  });

  function refreshTotal() {
    const state: TotalState = computeTotal(cardViews, claimed);
    barV.textContent = formatTotal(state, fallbackTotal);
    barK.textContent =
      state.count > 0 ? `${state.count} picked` : ir.peek.occasion || ir.peek.recipient_name || 'Your picks';
  }

  // ════════════════════════════════════════════════════════════════════════
  // BOTTOM SHEET
  // ════════════════════════════════════════════════════════════════════════
  const sheetScrim = el('div', { class: 'peek-sheet-scrim' });
  const sheetBody = el('div', { class: 'peek-sheet-body' });
  const sheet = el('div', { class: 'peek-sheet', role: 'dialog', 'aria-modal': 'true' }, [
    el('div', { class: 'peek-grab' }),
    sheetBody,
  ]);
  let sheetCurrent: CardView | null = null;

  function openSheet(v: CardView) {
    sheetCurrent = v;
    while (sheetBody.firstChild) sheetBody.removeChild(sheetBody.firstChild);

    // media / glyph
    sheetBody.appendChild(media(t, '4/3', v.url, v.alt));

    // retailer chip
    if (v.retailer) {
      sheetBody.appendChild(el('div', { style: 'margin-top:14px' }, [el('span', { class: 'peek-sheet-chip', text: v.retailer })]));
    }
    // name + price
    sheetBody.appendChild(el('div', { class: 'peek-sheet-name', text: v.title }));
    if (v.description) sheetBody.appendChild(el('div', { class: 'peek-sheet-desc', text: v.description }));
    if (v.type === 'activity' && (v.proposedDate || v.locationHint)) {
      sheetBody.appendChild(
        el('div', { class: 'peek-sheet-desc', style: `color:${t.accent}`, text: [fmtDate(v.proposedDate), v.locationHint].filter(Boolean).join(' · ') }),
      );
    }
    if (v.priceText) sheetBody.appendChild(el('div', { class: 'peek-sheet-price', text: v.priceText }));

    // swatches (HEMLOCK pattern)
    let selSwatch = 0;
    if (v.swatches.length) {
      const row = el('div', { class: 'peek-swatches' });
      v.swatches.forEach((c, i) => {
        const sw = el('div', {
          class: 'peek-swatch' + (i === 0 ? ' peek-sel' : ''),
          style: `background:${c}`,
        });
        on(sw, 'click', () => {
          selSwatch = i;
          row.querySelectorAll('.peek-swatch').forEach((n, j) => n.classList.toggle('peek-sel', j === i));
        });
        row.appendChild(sw);
      });
      sheetBody.appendChild(row);
    }

    // CTA row
    const isClaimed = claimed.has(v.id);
    const closeBtn = el('button', { class: 'peek-btn peek-btn-ghost', text: 'Close' });
    on(closeBtn, 'click', () => closeSheet());

    const claimBtn = el('button', { class: 'peek-btn', text: claimLabel(v, isClaimed) }) as HTMLButtonElement;
    claimBtn.disabled = isClaimed && !v.isLocked;

    // Locked cards: a beg input OR an "unlocks after" message instead of a claim.
    if (v.isLocked && v.lockKind === 'beg') {
      const promptTxt = v.begPrompt || 'Make your case…';
      const input = el('textarea', {
        placeholder: promptTxt,
        rows: '2',
        style: `width:100%;margin-top:16px;font-family:var(--peek-font-body);font-size:14px;padding:12px;border:1px solid ${t.line};border-radius:var(--peek-radius-card);background:${t.bg};color:${t.ink};resize:none`,
      }) as HTMLTextAreaElement;
      sheetBody.appendChild(input);
      claimBtn.textContent = 'Send your plea →';
      on(claimBtn, 'click', () => {
        if (isRecipient) opts.interactions.onBeg?.(v.id, input.value);
        claimBtn.textContent = 'Plea sent ✓';
        claimBtn.disabled = true;
        timers.push(setTimeout(closeSheet, 1000));
      });
    } else if (v.isLocked && (v.lockKind === 'date_after' || v.lockKind === 'event')) {
      const msg = v.unlockAfter ? `Unlocks ${fmtDate(v.unlockAfter)}` : 'Unlocks soon';
      sheetBody.appendChild(el('div', { class: 'peek-sheet-desc', style: `color:${t.accent};margin-top:12px`, text: msg }));
      claimBtn.textContent = 'Locked for now';
      claimBtn.disabled = true;
    } else if (!v.isTaunt) {
      on(claimBtn, 'click', () => {
        if (isClaimed) return;
        claimed.add(v.id);
        // flip the source card to claimed + show its badge + dim
        markCardClaimed(v.id);
        claimBtn.textContent = claimLabel(v, true);
        claimBtn.disabled = true;
        if (isRecipient) opts.interactions.onPick?.(v.id);
        refreshTotal();
        // count the bar up to the new sum, then auto-close
        timers.push(setTimeout(closeSheet, 950));
      });
    }

    sheetBody.appendChild(el('div', { class: 'peek-sheet-cta' }, [closeBtn, claimBtn]));
    root.classList.add('peek-sheet-open');
  }

  function markCardClaimed(id: string) {
    root.querySelectorAll(`[data-card-id="${cssEsc(id)}"]`).forEach((node) => {
      (node as HTMLElement).classList.add('peek-claimed');
    });
  }

  function closeSheet() {
    root.classList.remove('peek-sheet-open');
    sheetCurrent = null;
  }
  function openMenu() {
    root.classList.add('peek-menu-open');
  }
  function closeMenu() {
    root.classList.remove('peek-menu-open');
  }
  on(burger, 'click', () => (root.classList.contains('peek-menu-open') ? closeMenu() : openMenu()));
  on(scrim, 'click', () => closeMenu());
  on(sheetScrim, 'click', () => closeSheet());
  on(root, 'keydown', ((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeMenu();
      closeSheet();
    }
  }) as EventListener);

  // ════════════════════════════════════════════════════════════════════════
  // LIVE registries (countdown / count-up / claim theater)
  // ════════════════════════════════════════════════════════════════════════
  const countdowns: Array<{ node: HTMLElement; target: number; doneText?: string }> = [];
  function registerCountdown(node: HTMLElement, targetISO: string, doneText?: string) {
    let target = Date.parse(targetISO);
    if (Number.isNaN(target)) return;
    // if past, roll to next year (mockup behavior) unless it's basically now
    if (target < Date.now() - 86400000) {
      const d = new Date(target);
      d.setFullYear(new Date().getFullYear() + 1);
      target = d.getTime();
    }
    countdowns.push({ node, target, doneText });
  }
  function tickCountdowns() {
    const now = Date.now();
    for (const c of countdowns) {
      let diff = Math.max(0, c.target - now);
      if (diff === 0 && c.doneText) {
        c.node.textContent = c.doneText;
        continue;
      }
      const d = Math.floor(diff / 86400000); diff -= d * 86400000;
      const h = Math.floor(diff / 3600000); diff -= h * 3600000;
      const m = Math.floor(diff / 60000); diff -= m * 60000;
      const s = Math.floor(diff / 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const set = (k: string, val: string) => {
        const n = c.node.querySelector(`[data-k="${k}"]`);
        if (n) n.textContent = val;
      };
      set('d', pad(d)); set('h', pad(h)); set('m', pad(m)); set('s', pad(s));
    }
  }

  const counters: Array<{ node: HTMLElement; target: number; dec: number; pre?: string; done: boolean }> = [];
  function registerCounter(node: HTMLElement, target: number, dec: number, pre?: string) {
    counters.push({ node, target, dec, pre, done: false });
  }
  function runCounter(c: (typeof counters)[number]) {
    if (c.done) return;
    c.done = true;
    if (opts.reducedMotion) {
      c.node.textContent = (c.pre || '') + c.target.toFixed(c.dec);
      return;
    }
    const dur = 1600;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      c.node.textContent = (c.pre || '') + (c.target * eased).toFixed(c.dec);
      if (p < 1) requestAnimationFrame(step);
      else c.node.textContent = (c.pre || '') + c.target.toFixed(c.dec);
    };
    requestAnimationFrame(step);
  }

  function registerClaim(form: HTMLElement, btn: HTMLButtonElement, successMsg: string) {
    on(form, 'submit', ((e: Event) => {
      e.preventDefault();
      const input = form.querySelector('input');
      if (input) (input as HTMLInputElement).value = '';
      btn.textContent = successMsg;
      btn.disabled = true;
      if (isRecipient) opts.interactions.onCheckout?.();
    }) as EventListener);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCROLL REVEALS + count-up triggers + nav state + progress
  // ════════════════════════════════════════════════════════════════════════
  const revealNodes: HTMLElement[] = [];
  function observeReveal(node: HTMLElement) {
    revealNodes.push(node);
  }

  function start() {
    // assemble overlays onto the root (absolute, NOT fixed)
    root.appendChild(scrim);
    root.appendChild(menu);
    root.appendChild(bar);
    root.appendChild(sheetScrim);
    root.appendChild(sheet);
    root.appendChild(progress);

    refreshTotal();

    // resolve the nav skin now that the hero is known
    const fullBleed = heroIsFullBleedPhoto();
    nav.classList.add(fullBleed ? 'peek-nav-ondark' : 'peek-glass');

    // nav state + progress on scroll
    const onScroll = () => {
      const max = scroll.scrollHeight - scroll.clientHeight;
      progress.style.width = (max > 0 ? (scroll.scrollTop / max) * 100 : 0) + '%';
      if (fullBleed && refs.heroEl) {
        const past = scroll.scrollTop > refs.heroEl.offsetHeight - 90;
        nav.classList.toggle('peek-nav-solid', past);
        nav.classList.toggle('peek-nav-ondark', !past);
      }
    };
    on(scroll, 'scroll', onScroll, { passive: true } as AddEventListenerOptions);
    onScroll();

    // reveals (IO + stagger via dataset.delay set by caller groups + failsafe)
    if ('IntersectionObserver' in window) {
      const revealIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              const node = e.target as HTMLElement;
              node.style.transitionDelay = (node.dataset.delay || '0') + 'ms';
              node.classList.add('peek-in');
              revealIO.unobserve(node);
            }
          });
        },
        { root: scroll, threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
      );
      revealNodes.forEach((n) => revealIO.observe(n));
      observers.push(revealIO);

      // count-ups
      if (counters.length) {
        const countIO = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (!e.isIntersecting) return;
              const c = counters.find((cc) => cc.node === e.target);
              if (c) runCounter(c);
              countIO.unobserve(e.target);
            });
          },
          { root: scroll, threshold: 0.6 },
        );
        counters.forEach((c) => countIO.observe(c.node));
        observers.push(countIO);
      }

      // action bar reveal: appears once hero scrolls out of view (rootMargin -45%)
      if (refs.heroEl) {
        const barIO = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => bar.classList.toggle('peek-show', !en.isIntersecting));
          },
          { root: scroll, rootMargin: '-45% 0px 0px 0px' },
        );
        barIO.observe(refs.heroEl);
        observers.push(barIO);
      } else {
        bar.classList.add('peek-show');
      }
    } else {
      // no IO: show everything
      revealNodes.forEach((n) => n.classList.add('peek-in'));
      bar.classList.add('peek-show');
      counters.forEach(runCounter);
    }

    // reveal failsafe (framed-context IO can misfire): force-in after 1100ms
    timers.push(
      setTimeout(() => {
        revealNodes.forEach((n) => n.classList.add('peek-in'));
      }, 1100),
    );

    // live countdown tick (information, not decoration — runs regardless of reduced-motion)
    if (countdowns.length) {
      tickCountdowns();
      intervals.push(setInterval(tickCountdowns, 1000));
    }

    // ?cc= deep-link hook for screenshots/showcase
    timers.push(
      setTimeout(() => {
        try {
          const p = new URLSearchParams(location.search).get('cc');
          if (!p) return;
          if (p === 'menu') openMenu();
          else if (p === 'bar') {
            bar.classList.add('peek-show');
            scroll.scrollTo(0, Math.round(scroll.clientHeight * 0.95));
          } else if (p === 'sheet') {
            const first = cardViews.find((v) => !v.isTaunt);
            if (first) openSheet(first);
          }
        } catch {
          /* ignore */
        }
      }, 150),
    );
  }

  function destroy() {
    timers.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    observers.forEach((o) => o.disconnect());
    cleanups.forEach((fn) => fn());
    timers.length = 0;
    intervals.length = 0;
    observers.length = 0;
    cleanups.length = 0;
  }

  // expose the nav so the controller can place it inside the scroll container
  (root as unknown as { __peekNav?: HTMLElement }).__peekNav = nav;

  return {
    openSheet,
    claimed,
    refreshTotal,
    registerCountdown,
    registerCounter,
    registerClaim,
    observeReveal,
    start,
    destroy,
  };
}

// ── helpers ────────────────────────────────────────────────────────────────────
function brand(ir: PeekIR): string {
  // a concept-flavored wordmark; the mockups all stamp "PEEK.GIFT" but allow a page brand
  return 'peek';
}
function ctaLabel(ir: PeekIR): string {
  return ir.peek.cta_label || 'Send it';
}
function ctaSubtitle(ir: PeekIR): string {
  return 'The whole job';
}
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function claimLabel(v: CardView, claimed: boolean): string {
  if (claimed) return '★ Got it';
  if (v.type === 'activity') return 'Lock it in';
  return 'Pick this';
}
function cssEsc(s: string): string {
  return s.replace(/["\\]/g, '\\$&');
}

interface NavLink {
  label: string;
  href: string;
  ix: string;
}
function menuLinks(ir: PeekIR): NavLink[] {
  // derive from the section list (title-bearing sections become anchors)
  const links: NavLink[] = [];
  ir.sections.forEach((s, i) => {
    const label =
      s.title ||
      (s.kind === 'hero'
        ? 'Top'
        : s.kind === 'giftgrid'
          ? 'The Haul'
          : s.kind === 'note'
            ? 'The Note'
            : '');
    if (!label) return;
    links.push({ label, href: `#${s.id}`, ix: roman(links.length + 1) });
  });
  if (!links.length) links.push({ label: 'Top', href: '#', ix: 'I' });
  return links.slice(0, 6);
}
function roman(n: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI'][n - 1] || String(n);
}
function peekWhenWhere(ir: PeekIR): string {
  // pull a details/countdown hint if present; else recipient line
  const det = ir.sections.find((s) => s.kind === 'details');
  if (det && Array.isArray(det.data?.rows)) {
    const rows = det.data.rows as unknown[][];
    return rows
      .slice(0, 2)
      .map((r) => `${r[1] ?? ''}`)
      .filter(Boolean)
      .join(' · ');
  }
  if (ir.peek.recipient_name) return `For ${ir.peek.recipient_name}`;
  return '';
}
