import type { Genome } from "@peek/vibe-genome";

/** A background effect contributes positioned HTML (z-index 1, behind content) + its own CSS. */
export interface Effect {
  html: string;
  css: string;
}

/** Deterministic PRNG so effect placement is reproducible per genome.seed. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FX_BASE = `.fx{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}`;

export function backgroundEffect(effect: string, genome: Genome): Effect {
  const rnd = mulberry32(genome.seed || 1);

  switch (effect) {
    case "starfield": {
      let dots = "";
      for (let i = 0; i < 80; i++) {
        const x = (rnd() * 100).toFixed(2);
        const y = (rnd() * 78).toFixed(2);
        const sz = (0.4 + rnd() * 2.2).toFixed(2);
        const dl = (rnd() * 4).toFixed(2);
        dots += `<i style="left:${x}%;top:${y}%;width:${sz}px;height:${sz}px;animation-delay:${dl}s"></i>`;
      }
      return {
        html: `<div class="fx fx-stars">${dots}</div>`,
        css: `${FX_BASE}.fx-stars i{position:absolute;background:#fff;border-radius:50%;box-shadow:0 0 6px #fff;animation:twinkle 3.2s ease-in-out infinite}`,
      };
    }
    case "grid-floor":
      return {
        html: `<div class="fx fx-grid"></div>`,
        css: `${FX_BASE}.fx-grid{top:auto;height:62%;transform:perspective(440px) rotateX(66deg);transform-origin:bottom;opacity:.45;
  background:repeating-linear-gradient(90deg,transparent 0 39px,color-mix(in srgb,var(--accent) 70%,transparent) 39px 40px),
  repeating-linear-gradient(0deg,transparent 0 39px,color-mix(in srgb,var(--accent) 70%,transparent) 39px 40px);
  -webkit-mask-image:linear-gradient(transparent,#000);mask-image:linear-gradient(transparent,#000)}`,
      };
    case "conic-rays":
    case "sunburst":
      return {
        html: `<div class="fx fx-rays"></div>`,
        css: `${FX_BASE}.fx-rays{inset:-30% -10% auto -10%;height:130%;opacity:.16;
  background:repeating-conic-gradient(from 0deg at 50% 0%,var(--accent) 0deg 3.5deg,transparent 3.5deg 11deg);
  -webkit-mask-image:radial-gradient(62% 60% at 50% 0%,#000,transparent);mask-image:radial-gradient(62% 60% at 50% 0%,#000,transparent)}`,
      };
    case "radial-glow":
      return {
        html: `<div class="fx fx-glow"></div>`,
        css: `${FX_BASE}.fx-glow{background:radial-gradient(46% 42% at 18% 8%,color-mix(in srgb,var(--accent) 40%,transparent),transparent 60%),radial-gradient(42% 42% at 86% 26%,color-mix(in srgb,var(--accent2) 34%,transparent),transparent 60%)}`,
      };
    case "memphis": {
      const cols = ["var(--accent)", "var(--accent2)", "var(--accent3)", "var(--accent-deep)"];
      const kinds = ["circle", "ring", "bar", "tri"];
      let sh = "";
      for (let i = 0; i < 9; i++) {
        const x = (rnd() * 92).toFixed(1);
        const y = (rnd() * 82).toFixed(1);
        const s = Math.round(22 + rnd() * 44);
        const r = Math.round(rnd() * 360);
        const col = cols[Math.floor(rnd() * cols.length)] ?? cols[0];
        const kind = kinds[Math.floor(rnd() * kinds.length)] ?? "circle";
        const dl = (rnd() * 3).toFixed(2);
        sh += `<span class="m-${kind}" style="left:${x}%;top:${y}%;--s:${s}px;color:${col};transform:rotate(${r}deg);animation-delay:${dl}s"></span>`;
      }
      return {
        html: `<div class="fx fx-memphis">${sh}</div>`,
        css: `${FX_BASE}.fx-memphis span{position:absolute;width:var(--s);height:var(--s);animation:float 6s ease-in-out infinite;opacity:.92}
.fx-memphis .m-circle{border-radius:50%;background:currentColor}
.fx-memphis .m-ring{border-radius:50%;border:7px solid currentColor;background:none}
.fx-memphis .m-bar{height:14px;border-radius:999px;background:currentColor}
.fx-memphis .m-tri{width:0;height:0;border-left:calc(var(--s)/2) solid transparent;border-right:calc(var(--s)/2) solid transparent;border-bottom:var(--s) solid currentColor;background:none}`,
      };
    }
    case "botanicals": {
      const leaf = (): string =>
        [...Array(7)]
          .map(
            (_, i) =>
              `<path d="M20 ${14 + i * 8} Q${i % 2 ? 36 : 4} ${9 + i * 8} ${i % 2 ? 31 : 9} ${3 + i * 8}" stroke="var(--accent)" stroke-width="1.5" fill="color-mix(in srgb,var(--accent) 28%,transparent)"/>`,
          )
          .join("") + `<path d="M20 78 Q20 40 20 2" stroke="var(--accent)" stroke-width="2" fill="none"/>`;
      const sprig = (style: string, r: number, sc: number, dl: number): string =>
        `<svg class="sprig" viewBox="0 0 40 80" style="${style};transform:rotate(${r}deg) scale(${sc});animation-delay:${dl}s">${leaf()}</svg>`;
      return {
        html: `<div class="fx fx-bot">${sprig("left:-14px;bottom:-10px", -18, 1.3, 0)}${sprig("right:-10px;bottom:-14px", 24, 1.15, 0.6)}${sprig("right:8%;top:-12px", 150, 0.8, 1.1)}</div>`,
        css: `${FX_BASE}.fx-bot .sprig{position:absolute;width:90px;height:170px;transform-origin:bottom center;animation:float 8s ease-in-out infinite;opacity:.8}`,
      };
    }
    case "image-gradient":
      return {
        html: `<div class="fx fx-veil"></div>`,
        css: `${FX_BASE}.fx-veil{background:linear-gradient(180deg,transparent 38%,color-mix(in srgb,var(--bg) 72%,transparent))}`,
      };
    default:
      return { html: "", css: "" };
  }
}
