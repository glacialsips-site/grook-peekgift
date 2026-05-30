/**
 * armory/frames — the first armory module: rich, *themeable* media treatments that replace the
 * flat gradient-box. Every frame reads the design tokens (--accent etc.), so it adapts to any vibe.
 * This is a growing registry: add a case, it's available everywhere. (Mined + generalized from the
 * reference sites: arched window, orbiting porthole, vinyl, polaroid, boarding-pass…)
 */

export interface FrameOut {
  html: string;
  css: string;
}
export interface FrameContent {
  glyph?: string;
  photo?: string;
  alt?: string;
}

const q = (s: string): string => s.replace(/"/g, "&quot;");

function inner(c: FrameContent, size: string): string {
  if (c.photo) return `<img src="${q(c.photo)}" alt="${q(c.alt ?? "")}" style="width:100%;height:100%;object-fit:cover">`;
  return `<span class="frm-g" style="font-size:${size}">${c.glyph ?? "✦"}</span>`;
}

const SPIN = `@keyframes spin{to{transform:rotate(360deg)}}`;

/** Render a media frame by kind. Unknown kinds fall back to a rich themed panel. */
export function mediaFrame(kind: string, c: FrameContent): FrameOut {
  switch (kind) {
    case "arched":
      return {
        html: `<div class="frm-arch">${inner(c, "4.2rem")}</div>`,
        css: `.frm-arch{height:100%;min-height:340px;border-radius:300px 300px var(--radius-card) var(--radius-card);background:linear-gradient(160deg,var(--accent),var(--accent-deep));display:grid;place-items:center;color:var(--on-accent);box-shadow:var(--shadow-card),inset 0 0 0 7px color-mix(in srgb,#fff 24%,transparent)}`,
      };
    case "porthole":
      return {
        html: `<div class="frm-port"><div class="ring r1"><i></i></div><div class="ring r2"><i></i></div><div class="planet">${inner(c, "2.4rem")}</div></div>`,
        css: `.frm-port{position:relative;aspect-ratio:1;display:grid;place-items:center;min-height:340px}
.frm-port .planet{width:54%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 34% 30%,color-mix(in srgb,#fff 28%,var(--accent)),var(--accent) 55%,var(--accent-deep));display:grid;place-items:center;color:var(--on-accent);box-shadow:inset -10px -14px 34px #0006,0 0 55px color-mix(in srgb,var(--accent) 50%,transparent)}
.frm-port .ring{position:absolute;border:1px solid color-mix(in srgb,var(--accent) 55%,transparent);border-radius:50%;animation:spin linear infinite}
.frm-port .r1{width:74%;aspect-ratio:1;animation-duration:16s}
.frm-port .r2{width:97%;aspect-ratio:1;animation-duration:30s;animation-direction:reverse}
.frm-port .ring i{position:absolute;top:-6px;left:calc(50% - 6px);width:12px;height:12px;border-radius:50%;background:var(--accent2);box-shadow:0 0 14px var(--accent2)}
${SPIN}`,
      };
    case "vinyl":
      return {
        html: `<div class="frm-vinyl"><div class="disc"><div class="lbl">${inner(c, "1.7rem")}</div></div></div>`,
        css: `.frm-vinyl{display:grid;place-items:center;aspect-ratio:1;min-height:340px}
.frm-vinyl .disc{width:90%;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle at 50% 50%,#0b0b0b 0 2px,#171717 2px 4px),#0d0d0d;display:grid;place-items:center;box-shadow:0 24px 46px -18px #000a;animation:spin 14s linear infinite}
.frm-vinyl .lbl{width:38%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,var(--accent),var(--accent-deep));display:grid;place-items:center;color:var(--on-accent);box-shadow:0 0 0 4px #0009}
${SPIN}`,
      };
    case "polaroid":
      return {
        html: `<div class="frm-pol"><span class="tape"></span><div class="win">${inner(c, "3rem")}</div></div>`,
        css: `.frm-pol{position:relative;background:#fff;padding:14px 14px 42px;border-radius:4px;box-shadow:0 26px 54px -22px rgba(0,0,0,.45);transform:rotate(-3deg)}
.frm-pol .win{aspect-ratio:1;background:linear-gradient(150deg,var(--accent),var(--accent-deep));display:grid;place-items:center;color:var(--on-accent)}
.frm-pol .tape{position:absolute;top:-9px;left:50%;width:96px;height:24px;transform:translateX(-50%) rotate(-4deg);background:color-mix(in srgb,var(--accent) 45%,#fff);opacity:.65}`,
      };
    case "circular":
      return {
        html: `<div class="frm-circ">${inner(c, "3rem")}</div>`,
        css: `.frm-circ{aspect-ratio:1;border-radius:50%;background:linear-gradient(150deg,var(--accent),var(--accent-deep));display:grid;place-items:center;color:var(--on-accent);box-shadow:var(--shadow-card),inset 0 0 0 6px color-mix(in srgb,#fff 18%,transparent)}`,
      };
    case "id-card":
      return {
        html: `<div class="frm-id"><div class="strip"></div><div class="win">${inner(c, "2.6rem")}</div></div>`,
        css: `.frm-id{background:var(--surface);border:var(--border);border-radius:10px;padding:12px;box-shadow:var(--shadow-card)}
.frm-id .strip{height:8px;border-radius:99px;background:var(--accent);margin-bottom:10px}
.frm-id .win{aspect-ratio:1;background:linear-gradient(150deg,var(--accent),var(--accent-deep));display:grid;place-items:center;color:var(--on-accent)}`,
      };
    case "medallion":
      return {
        html: `<div class="frm-med">${inner(c, "2.2rem")}</div>`,
        css: `.frm-med{aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 32% 28%,color-mix(in srgb,#fff 36%,var(--accent)),var(--accent) 55%,var(--accent-deep));display:grid;place-items:center;box-shadow:inset 0 0 0 5px color-mix(in srgb,#fff 50%,transparent),0 14px 28px -10px var(--accent-deep)}`,
      };
    case "panel":
    default:
      return {
        html: `<div class="frm-panel"><span class="c tl"></span><span class="c br"></span>${inner(c, "3.4rem")}</div>`,
        css: `.frm-panel{position:relative;aspect-ratio:4/3;height:100%;min-height:240px;border-radius:var(--radius-card);background:linear-gradient(150deg,var(--accent),var(--accent-deep));display:grid;place-items:center;color:var(--on-accent);box-shadow:var(--shadow-card),inset 0 -44px 64px -30px #0005;overflow:hidden}
.frm-panel::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 72% 18%,#fff5,transparent 44%);pointer-events:none}
.frm-panel .c{position:absolute;width:20px;height:20px;border:2px solid color-mix(in srgb,#fff 42%,transparent)}
.frm-panel .tl{top:12px;left:12px;border-right:0;border-bottom:0}
.frm-panel .br{bottom:12px;right:12px;border-left:0;border-top:0}`,
      };
  }
}
