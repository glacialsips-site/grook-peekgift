/* Mitti demo film — shared scene kit (Node, rendered via sharp/librsvg). */
const Art = require('../mockup/lib/art.js');
const Cat = require('../mockup/lib/catalog.js');

const W = 1920, H = 1080;
const C = {
  paper: '#f7efe1', paper2: '#efe3cf', paper3: '#e7d7bb',
  ink: '#211a13', inkSoft: '#5e5042', inkFaint: '#94866f',
  clay: '#bf6238', clayDeep: '#8a3f22',
  jaipur: '#2f74a4', marigold: '#e08a1e', neem: '#6f8a55',
  line: 'rgba(33,26,19,0.14)', card: '#fffaf2', stripe: '#635bff'
};
const SERIF = 'Fraunces', SANS = 'Karla', DEVA = 'Mukta';

/* ---- math / easing ---- */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
// progress of a sub-segment [a,b] within global t, eased
function seg(t, a, b, ease = easeInOut) { return ease(clamp((t - a) / (b - a))); }
function mixHex(h1, h2, t) {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const a = p(h1), b = p(h2);
  const c = a.map((v, i) => Math.round(lerp(v, b[i], t)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ---- xml escape ---- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---- primitives ---- */
function rrect(x, y, w, h, r, fill, extra = '') {
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${r}" fill="${fill}" ${extra}/>`;
}
function txt(x, y, s, o = {}) {
  const a = {
    size: 30, family: SANS, weight: 400, fill: C.ink, anchor: 'start',
    italic: false, spacing: 0, opacity: 1, ...o
  };
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${a.family}" font-size="${a.size}" ` +
    `font-weight="${a.weight}" fill="${a.fill}" text-anchor="${a.anchor}" opacity="${a.opacity}" ` +
    `${a.italic ? 'font-style="italic" ' : ''}${a.spacing ? `letter-spacing="${a.spacing}" ` : ''}>${esc(s)}</text>`;
}

/* ---- vessel placement (inline defs, scaled into local space) ---- */
let _vid = 0;
function vessel(typeOrProduct, glazeKey, x, y, scale, opts = {}) {
  const type = typeof typeOrProduct === 'string' ? typeOrProduct : typeOrProduct.type;
  const seed = opts.seed != null ? opts.seed : (typeof typeOrProduct === 'object' ? typeOrProduct.seed : 7);
  const vg = Art.vesselGroup({ type, glaze: glazeKey, uid: 'f' + (_vid++), seed });
  const op = opts.opacity != null ? ` opacity="${opts.opacity}"` : '';
  // vessel art is authored in a 260x300 box; center it on x, foot near y
  return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${scale}) translate(-130,-300)"${op}>` +
    `<defs>${vg.defs}</defs>${vg.group}</g>`;
}

/* ---- glaze blob ---- */
function glazeBlob(x, y, r, key, opacity = 1) {
  const g = Art.GLAZES[key];
  const id = 'gb' + (_vid++);
  return `<defs><radialGradient id="${id}" cx="0.36" cy="0.3" r="0.75">` +
    `<stop offset="0" stop-color="${g.light}"/><stop offset="0.6" stop-color="${g.base}"/><stop offset="1" stop-color="${g.dark}"/>` +
    `</radialGradient></defs>` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})" opacity="${opacity}" ` +
    `style="filter:drop-shadow(0 ${r * 0.18}px ${r * 0.26}px rgba(70,40,18,.35))"/>`;
}

/* ---- mouse cursor ---- */
function cursor(x, y, pressed = false) {
  const s = pressed ? 0.92 : 1;
  const ring = pressed ? `<circle cx="${x}" cy="${y}" r="26" fill="none" stroke="${C.clay}" stroke-width="3" opacity="0.6"/>` : '';
  return ring +
    `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s})" style="filter:drop-shadow(0 3px 5px rgba(0,0,0,.35))">` +
    `<path d="M0,0 L0,26 L7,20 L12,30 L16,28 L11,18 L20,18 Z" fill="#fff" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round"/></g>`;
}

/* ---- soft vignette / grain backdrop ---- */
function backdrop(bg = C.paper) {
  return rrect(0, 0, W, H, 0, bg) +
    `<rect width="${W}" height="${H}" fill="url(#vign)"/>`;
}
const DEFS_GLOBAL =
  `<radialGradient id="vign" cx="0.5" cy="0.42" r="0.75">` +
  `<stop offset="0.55" stop-color="#000000" stop-opacity="0"/>` +
  `<stop offset="1" stop-color="#3a2410" stop-opacity="0.14"/></radialGradient>` +
  `<linearGradient id="stageG" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#f8f0e1"/><stop offset="0.6" stop-color="#efe1c8"/><stop offset="1" stop-color="#e6d4b4"/></linearGradient>`;

/* wrap inner content into a full frame svg */
function frame(inner, bg = C.paper) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>${DEFS_GLOBAL}</defs>${backdrop(bg)}${inner}</svg>`;
}

/* small vector icons (avoid emoji tofu in librsvg) */
function lock(x, y, s = 1, color = '#fff7ef') {
  return `<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="2">` +
    `<rect x="-7" y="-3" width="14" height="11" rx="2.5" fill="${color}" stroke="none"/>` +
    `<path d="M-4,-3 V-7 a4,4 0 0 1 8,0 V-3"/></g>`;
}
function mail(x, y, s = 1, color = '#5e5042') {
  return `<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.8">` +
    `<rect x="-11" y="-8" width="22" height="16" rx="2.5"/><path d="M-11,-6 L0,3 L11,-6"/></g>`;
}

/* brand wordmark group */
function wordmark(cx, y, scale = 1, opacity = 1) {
  return `<g opacity="${opacity}" transform="translate(${cx},${y}) scale(${scale})">` +
    txt(-12, 0, 'मिट्टी', { family: DEVA, weight: 600, size: 64, fill: C.clay, anchor: 'end' }) +
    txt(18, 0, 'mitti', { family: SERIF, weight: 600, size: 70, fill: C.ink, anchor: 'start', spacing: 1 }) +
    `</g>`;
}

module.exports = {
  W, H, C, SERIF, SANS, DEVA, Art, Cat,
  clamp, lerp, easeOut, easeInOut, easeOutBack, seg, mixHex, esc,
  rrect, txt, vessel, glazeBlob, cursor, backdrop, frame, wordmark, lock, mail
};
