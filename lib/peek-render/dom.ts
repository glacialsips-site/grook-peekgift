// ============================================================================
// peek-render/dom.ts — tiny framework-agnostic DOM helpers
// The renderer is imperative (per INTERFACES §1.1: the SEAM is mountPeek + the
// controller, not the internals). These helpers keep section builders terse.
// ============================================================================

export type ElProps = {
  class?: string;
  style?: string;
  html?: string; // innerHTML (caller is responsible for trust; custom HTML is sanitized upstream)
  text?: string; // textContent (safe)
  [attr: string]: unknown; // data-*, aria-*, role, href, src, type, on<Event> handlers, etc.
};

/** Create an element. `on<Event>` props attach listeners; `data*` camelCase → kebab attrs. */
export function el(
  tag: string,
  props?: ElProps | null,
  kids?: Array<Node | string | null | undefined>,
): HTMLElement {
  const n = document.createElement(tag);
  if (props) {
    for (const k in props) {
      const v = props[k];
      if (v == null) continue;
      if (k === 'style') n.setAttribute('style', String(v));
      else if (k === 'html') n.innerHTML = String(v);
      else if (k === 'text') n.textContent = String(v);
      else if (k === 'class') n.className = String(v);
      else if (k.startsWith('on') && typeof v === 'function') {
        n.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      } else if (k.startsWith('data') && k.length > 4) {
        n.setAttribute(k.replace(/([A-Z])/g, '-$1').toLowerCase(), String(v));
      } else {
        n.setAttribute(k, String(v));
      }
    }
  }
  if (kids) {
    for (const c of kids) {
      if (c == null) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
  }
  return n;
}

/** Convert a hex (#rgb / #rrggbb) to rgba(). Pass-through for non-hex colors (hsl/oklch/named). */
export function rgba(color: string, a: number): string {
  if (typeof color !== 'string') return `rgba(0,0,0,${a})`;
  let hex = color.trim();
  if (hex[0] !== '#') {
    // Non-hex color (hsl/oklch/named): can't safely add alpha; use color-mix as a best effort.
    return `color-mix(in srgb, ${hex} ${Math.round(a * 100)}%, transparent)`;
  }
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6) return `rgba(0,0,0,${a})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Escape text for safe interpolation into an innerHTML string. */
export function esc(s: unknown): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape but preserve author-intended newlines as <br>. Used for hero headlines. */
export function escMultiline(s: unknown): string {
  return esc(s).replace(/\n/g, '<br>');
}

/** Remove all children of a node. */
export function clear(n: HTMLElement): void {
  while (n.firstChild) n.removeChild(n.firstChild);
}
