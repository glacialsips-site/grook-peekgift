// ============================================================================
// peek-render/fonts.ts — DYNAMIC Google-fonts loader (SHELL_SPEC §4)
// ----------------------------------------------------------------------------
// Consumes FontSpec (ir/contract.ts: family + optional axis + weights). Builds ONE
// deduped `css2?family=…&family=…` <link>, appended incrementally as themes load,
// with preconnect. PREFERS FontSpec.axis when present (so ANY arbitrary family the
// model picks still loads) and falls back to a built-in registry, which is a floor,
// NOT a gate (per the brief: FONT_SPECS is a pantry suggestion).
// ============================================================================

import type { FontSpec } from '@/lib/ir/contract';

// ── The registry: union of the prior-gen FONT_SPECS + every family across all 15
//    mockups (SHELL_SPEC §4). family → css2 axis query string. ──────────────────
export const FONT_SPECS: Record<string, string> = {
  // — prior-gen pantry —
  Fraunces: 'Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700',
  Inter: 'Inter:wght@400;500;600;700;800',
  Cinzel: 'Cinzel:wght@400;500;600;700;800',
  'Cinzel Decorative': 'Cinzel+Decorative:wght@400;700;900',
  'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600',
  Cormorant: 'Cormorant:ital,wght@0,400;0,500;0,600;1,400',
  Marcellus: 'Marcellus',
  Mulish: 'Mulish:wght@300;400;500;600;700;800',
  Shrikhand: 'Shrikhand',
  Poppins: 'Poppins:wght@400;500;600;700;800',
  Monoton: 'Monoton',
  Orbitron: 'Orbitron:wght@500;700;900',
  Rajdhani: 'Rajdhani:wght@400;500;600;700',
  'Share Tech Mono': 'Share+Tech+Mono',
  'Dancing Script': 'Dancing+Script:wght@500;600;700',
  Quicksand: 'Quicksand:wght@400;500;600;700',
  'Baloo 2': 'Baloo+2:wght@500;600;700;800',
  'Archivo Black': 'Archivo+Black',
  'Space Grotesk': 'Space+Grotesk:wght@400;500;600;700',
  'Space Mono': 'Space+Mono:wght@400;700',
  'Saira Condensed': 'Saira+Condensed:wght@500;600;700;800',
  'Nunito Sans': 'Nunito+Sans:wght@400;500;600;700;800',
  Jost: 'Jost:wght@300;400;500;600',
  'Bodoni Moda':
    'Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,400;1,6..96,500',
  'Work Sans': 'Work+Sans:wght@400;500;600;700',
  'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400',
  'Pinyon Script': 'Pinyon+Script',
  'Source Serif 4':
    'Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,500',
  'Bebas Neue': 'Bebas+Neue',
  Lora: 'Lora:ital,wght@0,400;0,500;0,600;1,400',
  Anton: 'Anton',
  // — SHELL_SPEC §4 additions (the families the 15 mockups actually use) —
  'Shippori Mincho': 'Shippori+Mincho:wght@400;500;600;700;800',
  'Zen Kaku Gothic New': 'Zen+Kaku+Gothic+New:wght@300;400;500;700',
  'Chakra Petch': 'Chakra+Petch:wght@400;500;600;700',
  'Lilita One': 'Lilita+One',
  Yellowtail: 'Yellowtail',
  Nunito: 'Nunito:ital,wght@0,400;0,600;0,700;0,800;1,600',
  Bungee: 'Bungee',
  'Bungee Shade': 'Bungee+Shade',
  Fredoka: 'Fredoka:wght@400;500;600;700',
  Oswald: 'Oswald:wght@300;400;500;600;700',
  Barlow: 'Barlow:ital,wght@0,400;0,500;0,600;1,400;1,500',
  Tangerine: 'Tangerine:wght@400;700',
  'Roboto Mono': 'Roboto+Mono:wght@400;500;700',
  Graduate: 'Graduate',
  'Hanken Grotesk': 'Hanken+Grotesk:wght@400;500;600;700;800',
  'Libre Franklin': 'Libre+Franklin:wght@600;700;800;900',
  Newsreader: 'Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500',
  'Libre Baskerville': 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',
  'Special Elite': 'Special+Elite',
  'Yeseva One': 'Yeseva+One',
  Rubik: 'Rubik:wght@400;500;600;700;800;900',
};

// Families that read as serif / script / mono — drives the CSS fallback class.
const SERIFS = new Set([
  'Fraunces', 'Cinzel', 'Cinzel Decorative', 'Cormorant Garamond', 'Cormorant', 'Marcellus',
  'Bodoni Moda', 'Playfair Display', 'Source Serif 4', 'Lora', 'Shippori Mincho', 'Newsreader',
  'Libre Baskerville', 'Yeseva One',
]);
const SCRIPTS = new Set([
  'Dancing Script', 'Pinyon Script', 'Monoton', 'Shrikhand', 'Yellowtail', 'Tangerine',
]);
const MONO = new Set(['Share Tech Mono', 'Space Mono', 'Roboto Mono', 'Special Elite']);

/** Map a family to a CSS font stack with a sensible fallback class. */
export function fontStack(family: string | undefined): string {
  if (!family) return '-apple-system, system-ui, sans-serif';
  const fb = SERIFS.has(family)
    ? 'Georgia, "Times New Roman", serif'
    : SCRIPTS.has(family)
      ? 'cursive'
      : MONO.has(family)
        ? 'ui-monospace, "SF Mono", Menlo, monospace'
        : '-apple-system, system-ui, sans-serif';
  return `"${family}", ${fb}`;
}

/** Resolve the css2 axis query for a FontSpec: prefer the model-supplied axis, then the
 *  registry, then synthesize one from weights, then a bare family. */
function axisFor(spec: FontSpec): string | null {
  if (!spec || !spec.family) return null;
  // Only Google-loadable families go through this loader; self/fontsource are host-managed.
  if (spec.source && spec.source !== 'google') {
    // still allow if an explicit Google-style axis was given
    if (!spec.axis) return null;
  }
  if (spec.axis && spec.axis.trim()) return spec.axis.trim();
  const reg = FONT_SPECS[spec.family];
  if (reg) return reg;
  const famQuery = spec.family.trim().replace(/\s+/g, '+');
  if (spec.weights && spec.weights.length) {
    return `${famQuery}:wght@${[...new Set(spec.weights)].sort((a, b) => a - b).join(';')}`;
  }
  return famQuery;
}

const LINK_ID = 'peek-fonts';
const PRECONNECT_FLAG = 'peek-fonts-preconnect';

/** A per-document loader. mountPeek owns one; destroy() can leave the link (fonts are cheap,
 *  shared) but we scope dedupe per loader instance so updates are incremental. */
export class FontLoader {
  private loaded = new Map<string, string>(); // family → axis query (one entry per family)
  private doc: Document;

  constructor(doc: Document = document) {
    this.doc = doc;
  }

  private ensurePreconnect() {
    const head = this.doc.head;
    if (head.querySelector(`[data-${PRECONNECT_FLAG}]`)) return;
    const a = this.doc.createElement('link');
    a.rel = 'preconnect';
    a.href = 'https://fonts.googleapis.com';
    a.setAttribute(`data-${PRECONNECT_FLAG}`, '1');
    const b = this.doc.createElement('link');
    b.rel = 'preconnect';
    b.href = 'https://fonts.gstatic.com';
    b.crossOrigin = 'anonymous';
    b.setAttribute(`data-${PRECONNECT_FLAG}`, '1');
    head.appendChild(a);
    head.appendChild(b);
  }

  /** Ensure the css2 link covers these specs. Dedupes by family; appends incrementally. */
  ensure(specs: Array<FontSpec | undefined>): void {
    let changed = false;
    for (const spec of specs) {
      if (!spec || !spec.family) continue;
      if (this.loaded.has(spec.family)) continue;
      const axis = axisFor(spec);
      if (!axis) continue;
      this.loaded.set(spec.family, axis);
      changed = true;
    }
    if (!changed) return;
    this.ensurePreconnect();
    const q = [...this.loaded.values()].map((a) => 'family=' + a).join('&');
    let link = this.doc.getElementById(LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = this.doc.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      this.doc.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?${q}&display=swap`;
  }
}
