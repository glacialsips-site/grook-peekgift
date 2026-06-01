// ============================================================================
// peek-render/scenes.ts — scene / frame / motif builders (SHELL_SPEC §3)
// ----------------------------------------------------------------------------
// Parameterized decorative primitives reading the resolved Tokens. Ambient/animated
// scenes gate on motion.intensity AND reduced-motion: animated elements get class
// `.peek-amb` (killed by the reduced-motion guard in styles.ts) and we only attach the
// animation when intensity > 0. Unknown enum values degrade to none/plain (never throw).
// ============================================================================

import type { Tokens } from './theme';
import { el, rgba } from './dom';

const GRAIN_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>";

/** Should this theme run ambient/decorative animation? (reduced-motion handled in CSS.) */
function animate(t: Tokens): boolean {
  return t.intensity > 0;
}
function amb(t: Tokens, anim: string): string {
  return animate(t) ? `animation:${anim};` : '';
}

// ── SCENES ────────────────────────────────────────────────────────────────────
export function buildScene(t: Tokens): HTMLElement | null {
  const name = t.scene;
  const A = t.accent;
  const A2 = t.accent2;
  const INK = t.ink;
  const wrap = el('div', { class: 'peek-scene' });

  switch (name) {
    case 'none':
      // still allow texture overlay below
      break;
    case 'starfield': {
      wrap.appendChild(
        el('div', {
          style: `position:absolute;inset:0;background:radial-gradient(120% 80% at 70% 0,${rgba(A2, 0.18)},transparent 55%)`,
        }),
      );
      wrap.appendChild(
        el('div', {
          class: animate(t) ? 'peek-amb' : '',
          style:
            `position:absolute;inset:-50%;background-image:` +
            `radial-gradient(1.5px 1.5px at 20% 30%,#fff,transparent),` +
            `radial-gradient(1px 1px at 70% 60%,#cfe0ff,transparent),` +
            `radial-gradient(1.5px 1.5px at 40% 80%,#fff,transparent),` +
            `radial-gradient(1px 1px at 85% 20%,#fff,transparent);` +
            `background-size:300px 300px;${amb(t, 'peek-drift 30s linear infinite')}`,
        }),
      );
      break;
    }
    case 'gridfloor':
      wrap.appendChild(
        el('div', {
          class: animate(t) ? 'peek-amb' : '',
          style:
            `position:absolute;left:-40%;right:-40%;bottom:-20%;height:62%;` +
            `transform:rotateX(72deg);transform-origin:bottom;perspective:340px;` +
            `background:repeating-linear-gradient(0deg,transparent 0 48px,${rgba(A2, 0.5)} 48px 50px),` +
            `repeating-linear-gradient(90deg,transparent 0 48px,${rgba(A, 0.5)} 48px 50px);` +
            `${amb(t, 'peek-floor 1.8s linear infinite')}` +
            `-webkit-mask-image:linear-gradient(#000,transparent);mask-image:linear-gradient(#000,transparent)`,
        }),
      );
      break;
    case 'rayfan':
      wrap.appendChild(
        el('div', {
          style: `position:absolute;inset:-20%;background:repeating-conic-gradient(from 0deg at 50% 35%,${rgba(A, 0.16)} 0 6deg,transparent 6deg 13deg)`,
        }),
      );
      break;
    case 'sunburst':
      wrap.appendChild(
        el('div', {
          style:
            `position:absolute;top:-30%;left:50%;width:340px;height:340px;transform:translateX(-50%);` +
            `background:repeating-conic-gradient(from 0deg,${rgba(A, 0.22)} 0 9deg,${rgba(A2, 0.1)} 9deg 18deg);` +
            `-webkit-mask-image:radial-gradient(circle,#000 58%,transparent 72%);mask-image:radial-gradient(circle,#000 58%,transparent 72%)`,
        }),
      );
      break;
    case 'mirrorball':
      wrap.appendChild(
        el('div', {
          class: animate(t) ? 'peek-amb' : '',
          style:
            `position:absolute;top:14px;left:50%;width:96px;height:96px;margin-left:-48px;border-radius:50%;` +
            `background-image:repeating-conic-gradient(from 0deg,#aab4c4 0 9deg,#eef3fa 9deg 18deg),` +
            `repeating-linear-gradient(${rgba('#000', 0.2)} 0 6px,transparent 6px 12px);` +
            `box-shadow:0 0 36px ${rgba(A2, 0.5)};${amb(t, 'peek-spin 8s linear infinite')}`,
        }),
      );
      break;
    case 'mesh':
      wrap.appendChild(
        el('div', {
          class: animate(t) ? 'peek-amb' : '',
          style:
            `position:absolute;inset:0;background:radial-gradient(40% 50% at 18% 16%,${rgba(A, 0.35)},transparent),` +
            `radial-gradient(40% 50% at 82% 8%,${rgba(A2, 0.35)},transparent),` +
            `radial-gradient(50% 60% at 60% 86%,${rgba(A, 0.22)},transparent);${amb(t, 'peek-drift 20s ease-in-out infinite')}`,
        }),
      );
      break;
    case 'halftone':
      wrap.appendChild(
        el('div', {
          style: `position:absolute;inset:0;opacity:.5;background-image:radial-gradient(circle,${rgba(INK, 0.5)} 1.4px,transparent 1.6px);background-size:12px 12px`,
        }),
      );
      break;
    case 'blueprint':
      wrap.appendChild(
        el('div', {
          style: `position:absolute;inset:0;background-image:linear-gradient(${rgba('#fff', 0.08)} 1px,transparent 1px),linear-gradient(90deg,${rgba('#fff', 0.08)} 1px,transparent 1px);background-size:28px 28px`,
        }),
      );
      break;
    case 'topo':
      wrap.appendChild(
        el('div', {
          style: `position:absolute;inset:0;opacity:.6;background-image:repeating-radial-gradient(circle at 30% 30%,transparent 0 18px,${rgba(INK, 0.05)} 18px 19px)`,
        }),
      );
      break;
    case 'scanlines':
      wrap.appendChild(
        el('div', {
          style: `position:absolute;inset:0;background:repeating-linear-gradient(transparent 0 2px,${rgba('#000', 0.18)} 2px 4px);mix-blend-mode:${t.blend};opacity:.5`,
        }),
      );
      break;
    case 'confetti':
      for (let i = 0; i < 14; i++) {
        const c = [A, A2, INK][i % 3];
        wrap.appendChild(
          el('div', {
            class: animate(t) ? 'peek-amb' : '',
            style: `position:absolute;top:${-10 - Math.random() * 30}%;left:${Math.random() * 100}%;width:7px;height:12px;border-radius:2px;background:${c};${animate(t) ? `animation:peek-conf ${3 + Math.random() * 3}s linear ${Math.random() * 3}s infinite` : 'opacity:.5'}`,
          }),
        );
      }
      break;
    case 'bubbles':
      for (let i = 0; i < 10; i++) {
        const d = 10 + Math.random() * 22;
        wrap.appendChild(
          el('div', {
            class: animate(t) ? 'peek-amb' : '',
            style: `position:absolute;bottom:-10%;left:${Math.random() * 100}%;width:${d}px;height:${d}px;border-radius:50%;border:1px solid ${rgba('#fff', 0.5)};background:${rgba('#fff', 0.08)};${animate(t) ? `animation:peek-bub ${6 + Math.random() * 5}s linear ${Math.random() * 4}s infinite` : ''}`,
          }),
        );
      }
      break;
    case 'grain':
      // handled by the texture overlay below (so grain + texture share one path)
      break;
    default:
      // unknown scene → degrade to none (still apply texture overlay if requested)
      break;
  }

  // grain everywhere on `grain` scene OR textured palettes
  if (name === 'grain' || t.texture) {
    wrap.appendChild(
      el('div', {
        style: `position:absolute;inset:0;opacity:.06;mix-blend-mode:${t.blend};background-image:url("${GRAIN_SVG}")`,
      }),
    );
  }

  return wrap.childNodes.length ? wrap : null;
}

// ── MEDIA placeholder (themed gradient fallback until a url lands) ──────────────
export function media(t: Tokens, aspect: string, url?: string | null, alt?: string): HTMLElement {
  const box = el('div', {
    class: 'peek-media',
    style:
      `position:relative;width:100%;aspect-ratio:${aspect};border-radius:var(--peek-radius-card);overflow:hidden;` +
      `background:linear-gradient(150deg, ${t.accent}, ${t.accent2})`,
  });
  if (url) {
    box.appendChild(
      el('img', {
        src: url,
        alt: alt || '',
        loading: 'lazy',
        style: 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover',
      }),
    );
  } else {
    // noise + sheen so the placeholder reads as art-directed, not a flat block
    box.appendChild(
      el('div', {
        style: `position:absolute;inset:0;opacity:.18;mix-blend-mode:overlay;background-image:url("${GRAIN_SVG}")`,
      }),
    );
    box.appendChild(
      el('div', {
        style: `position:absolute;inset:0;background:radial-gradient(120% 80% at 30% 0,${rgba('#ffffff', 0.28)},transparent 60%)`,
      }),
    );
  }
  return box;
}

// ── FRAMES (wraps hero/card media) ──────────────────────────────────────────────
export function frameMedia(
  frame: string,
  t: Tokens,
  url?: string | null,
  alt?: string,
  caption?: string,
): HTMLElement {
  const cap = caption
    ? el('div', {
        class: 'peek-frame-cap',
        style: `position:absolute;left:0;right:0;bottom:0;padding:8px 12px;background:${rgba(t.ink, 0.66)};color:${rgba('#fff', 0.92)};font-family:var(--peek-font-accent);font-size:11px;letter-spacing:.04em`,
        text: caption,
      })
    : null;

  switch (frame) {
    case 'vinyl':
      return el('div', { style: 'display:flex;justify-content:center;padding:6px 0' }, [
        el(
          'div',
          {
            class: t.intensity > 0 ? 'peek-amb' : '',
            style:
              `width:230px;height:230px;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 2px,#1c1c1c 2px 5px);` +
              `position:relative;${t.intensity > 0 ? 'animation:peek-spin 16s linear infinite;' : ''}box-shadow:0 18px 44px ${rgba('#000', 0.5)}`,
          },
          [
            el(
              'div',
              {
                style: `position:absolute;inset:34%;border-radius:50%;overflow:hidden;box-shadow:0 0 0 4px ${rgba('#000', 0.5)}`,
              },
              [media(t, '1/1', url, alt)],
            ),
            el('div', {
              style: `position:absolute;top:50%;left:50%;width:14px;height:14px;border-radius:50%;background:${t.bg};transform:translate(-50%,-50%);box-shadow:0 0 0 2px ${rgba('#000', 0.6)}`,
            }),
          ],
        ),
      ]);
    case 'porthole':
      return el('div', { style: 'display:flex;justify-content:center;padding:4px 0' }, [
        el(
          'div',
          {
            style:
              `width:220px;height:220px;border-radius:50%;position:relative;overflow:hidden;` +
              `box-shadow:inset 0 0 0 9px #1a222c,inset 0 0 36px #000,0 0 0 13px #11181f,0 0 50px ${rgba(t.accent2, 0.4)}`,
          },
          [media(t, '1/1', url, alt)],
        ),
      ]);
    case 'polaroid':
      return el('div', { style: 'display:flex;justify-content:center;padding:8px 0' }, [
        el(
          'div',
          {
            style: `background:#fff;padding:12px 12px 46px;box-shadow:0 14px 30px ${rgba('#000', 0.22)};transform:rotate(-3deg);max-width:240px;position:relative`,
          },
          [
            media(t, '1/1', url, alt),
            caption
              ? el('div', {
                  style: 'position:absolute;left:0;right:0;bottom:14px;text-align:center;font-family:var(--peek-font-accent);font-size:13px;color:#333',
                  text: caption,
                })
              : null,
          ],
        ),
      ]);
    case 'arch': {
      const m = media(t, '3/4', url, alt);
      m.style.borderRadius = '300px 300px 22px 22px / 60% 60% 22px 22px';
      const box = el('div', { style: 'position:relative;padding:2px 6px' }, [m]);
      if (cap) box.appendChild(cap);
      return box;
    }
    case 'locket': {
      const m = media(t, '3/4', url, alt);
      m.style.borderRadius = '48%';
      return el('div', { style: 'display:flex;justify-content:center' }, [
        el(
          'div',
          {
            style: `padding:5px;border-radius:48%;box-shadow:0 0 0 5px ${t.accent},0 0 0 8px ${t.surface},0 12px 26px ${rgba('#000', 0.25)};max-width:220px`,
          },
          [m],
        ),
      ]);
    }
    case 'idcard':
      return el(
        'div',
        {
          style: `display:grid;grid-template-columns:90px 1fr;gap:12px;background:${t.surface};border:1px solid ${t.line};border-radius:var(--peek-radius-card);padding:12px;font-family:var(--peek-font-accent);position:relative`,
        },
        [
          media(t, '1/1', url, alt),
          el('div', {
            html: `<div style="font-size:10px;letter-spacing:.16em;color:${t.muted}">BACKSTAGE</div><div style="font-size:18px;color:${t.ink};margin-top:4px;font-family:var(--peek-font-display)">ALL ACCESS</div><div style="font-size:11px;color:${t.muted};margin-top:8px">NO. 0042 · ZONE A</div>`,
          }),
        ],
      );
    case 'ticket':
    case 'stub': {
      const box = el(
        'div',
        {
          style: `position:relative;border-radius:var(--peek-radius-card);overflow:hidden`,
        },
        [media(t, '4/3', url, alt)],
      );
      // punched notch circles straddling the vertical center edges
      box.appendChild(
        el('div', {
          style: `position:absolute;top:50%;left:-11px;width:22px;height:22px;border-radius:50%;background:${t.bg};transform:translateY(-50%)`,
        }),
      );
      box.appendChild(
        el('div', {
          style: `position:absolute;top:50%;right:-11px;width:22px;height:22px;border-radius:50%;background:${t.bg};transform:translateY(-50%)`,
        }),
      );
      if (cap) box.appendChild(cap);
      return box;
    }
    case 'stamp': {
      const m = media(t, '1/1', url, alt);
      return el('div', {
        style: `padding:8px;border:2px dashed ${t.line};border-radius:6px;transform:rotate(-1.5deg);background:${t.surface}`,
      }, [m]);
    }
    case 'plain':
    default: {
      const m = media(t, '4/3', url, alt);
      const box = el('div', { style: `position:relative;border:1px solid ${t.line};border-radius:var(--peek-radius-card);overflow:hidden` }, [m]);
      if (cap) box.appendChild(cap);
      return box;
    }
  }
}

// ── MOTIFS (inline SVG, recolored via currentColor) ────────────────────────────
type MotifFn = (s?: number) => string;
export const MOTIFS: Record<string, MotifFn> = {
  sparkle: (s = 18) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><path d="M12 0c1 6 5 10 12 12-7 2-11 6-12 12-1-6-5-10-12-12 7-2 11-6 12-12z"/></svg>`,
  star: (s = 18) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z"/></svg>`,
  crown: (s = 22) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><path d="M3 8l4 3 5-6 5 6 4-3-2 11H5z"/></svg>`,
  suit: (s = 18) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><path d="M12 21s-7-4.5-7-9a4 4 0 017-2 4 4 0 017 2c0 4.5-7 9-7 9z"/></svg>`,
  leaf: (s = 20) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14zM7 17C11 13 13 11 17 7"/></svg>`,
  zigzag: (s = 70) =>
    `<svg viewBox="0 0 80 20" width="${s}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M2 10q6-8 12 0t12 0 12 0 12 0 12 0"/></svg>`,
  rule: (s = 70) =>
    `<svg viewBox="0 0 120 8" width="${s}" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M0 4h48"/><path d="M72 4h48"/><circle cx="60" cy="4" r="3" fill="currentColor" stroke="none"/></svg>`,
  dots: (s = 60) =>
    `<svg viewBox="0 0 60 12" width="${s}" fill="currentColor"><circle cx="6" cy="6" r="4"/><circle cx="24" cy="6" r="4"/><circle cx="42" cy="6" r="4"/></svg>`,
  sunburst: (s = 22) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><g>${Array.from({ length: 12 })
      .map((_, i) => `<rect x="11" y="0" width="2" height="7" transform="rotate(${i * 30} 12 12)"/>`)
      .join('')}</g></svg>`,
  hanko: (s = 34) =>
    `<svg viewBox="0 0 40 40" width="${s}" height="${s}"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="3"/><path d="M14 14h12M20 13v14M14 26h12" stroke="currentColor" stroke-width="2.2" fill="none"/></svg>`,
  chrome: (s = 22) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><defs><linearGradient id="pkcr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef4ff"/><stop offset=".5" stop-color="#5b6a82"/><stop offset="1" stop-color="#dfe8f5"/></linearGradient></defs><circle cx="12" cy="12" r="9" fill="url(#pkcr)"/></svg>`,
  stamp: (s = 20) =>
    `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><path d="M5 5h14v14H5z" opacity=".15"/><path d="M5 5h14v14H5z" fill="none" stroke="currentColor" stroke-dasharray="2 2" stroke-width="1.4"/></svg>`,
};

/** A centered motif row (used under eyebrows / in footers). Returns null if no motifs. */
export function motifRow(t: Tokens, size = 16, color?: string): HTMLElement | null {
  const html = t.motifs
    .slice(0, 4)
    .map((k) => (MOTIFS[k] ? MOTIFS[k](size) : ''))
    .filter(Boolean)
    .join('');
  if (!html) return null;
  return el('div', {
    style: `display:flex;gap:10px;justify-content:center;align-items:center;color:${color || t.accent};${t.glow ? `filter:drop-shadow(0 0 6px ${t.accent})` : ''}`,
    html,
  });
}
