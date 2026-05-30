import type { Block, Card } from "@peek/site-ir";
import type { Genome } from "@peek/vibe-genome";
import { backgroundEffect, type Effect } from "./effects";
import { mediaFrame, type FrameContent } from "./armory/frames";
import { pickFrame } from "./armory/select";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function emphasize(lines: string[], emphasis: number[]): string {
  return lines.map((l, i) => (emphasis.includes(i) ? `<em>${esc(l)}</em>` : esc(l))).join("<br>");
}

function btn(label: string, variant: "primary" | "ghost" | "link"): string {
  return `<a class="btn btn-${variant}" href="#">${esc(label)}</a>`;
}

/** Build a FrameContent without explicit undefineds (exactOptionalPropertyTypes-safe). */
function mediaContent(m: Card["media"]): FrameContent {
  const c: FrameContent = {};
  if (m.glyph) c.glyph = m.glyph;
  if (m.kind === "photo" && m.src) c.photo = m.src;
  if (m.alt) c.alt = m.alt;
  return c;
}

/** Per-card hue: each tile pulls a distinct tint so a grid reads as a varied set, not one color. */
function cardTint(i: number): string {
  const n = i % 6;
  const n2 = (i + 3) % 6;
  return ` style="--accent:var(--tint-${n});--accent2:var(--tint-${n2});--accent-deep:color-mix(in oklch,var(--tint-${n}),#000 26%);--accent-wash:color-mix(in oklch,var(--tint-${n}),var(--surface) 86%)"`;
}

function renderCard(
  c: Card,
  genome: Genome,
  opts?: { frame?: string; tint?: number },
): { html: string; css: string } {
  const kind = opts?.frame ?? (c.itemType === "photo" ? "polaroid" : pickFrame(genome, "card"));
  const f = mediaFrame(kind, mediaContent(c.media));
  const tint = opts?.tint !== undefined ? cardTint(opts.tint) : "";
  const badge = c.badge ? `<span class="badge">${esc(c.badge)}</span>` : "";
  const src = c.source ? `<span class="src">${esc(c.source)}</span>` : "";
  const sub = c.subtitle ? `<div class="sub">${esc(c.subtitle)}</div>` : "";
  const desc = c.description ? `<p class="desc">${esc(c.description)}</p>` : "";
  const price = c.price ? `<span class="price">${esc(c.price)}</span>` : "";
  const action = c.claim ? `<button class="claim">${esc(c.claim.label)}</button>` : "";
  const html = `<article class="card"${tint}><div class="card-media">${badge}${f.html}</div><div class="card-body">${src}<h3>${esc(c.name)}</h3>${sub}${desc}<div class="row">${price}${action}</div></div></article>`;
  return { html, css: f.css };
}

export function renderBlock(block: Block, genome: Genome, effects: Effect[]): string {
  switch (block.kind) {
    case "nav": {
      const links = block.links.map((l) => `<a href="${esc(l.href ?? "#")}">${esc(l.label)}</a>`).join("");
      const brandClass = block.brand.style === "script" ? "brand script" : "brand";
      const trailing = block.trailingAction ? btn(block.trailingAction.label, "ghost") : "";
      return `<nav class="nav"><div class="wrap"><div class="${brandClass}">${esc(block.brand.text)}</div><div class="nav-links">${links}${trailing}</div></div></nav>`;
    }
    case "hero": {
      const fx = backgroundEffect(block.backgroundEffect, genome);
      if (fx.css) effects.push(fx);
      const layout = genome.knobs.layout.heroLayout;
      const cls = layout === "split-lr" ? "split" : "centered";
      const greeting = block.greeting ? `<span class="hero-greeting">${esc(block.greeting)}</span>` : "";
      const eyebrow = block.eyebrow ? `<span class="eyebrow">${esc(block.eyebrow)}</span>` : "";
      const lede = block.lede ? `<p class="hero-lede">${esc(block.lede)}</p>` : "";
      const meta = block.meta.length
        ? `<div class="hero-meta">${block.meta.map((m) => `<span class="pill">${esc(m.key)} · ${esc(m.value)}</span>`).join("")}</div>`
        : "";
      const ctas = block.ctas.length
        ? `<div class="hero-cta">${block.ctas.map((cc, i) => btn(cc.label, i === 0 ? "primary" : "ghost")).join("")}</div>`
        : "";
      let media = "";
      if (block.media && layout === "split-lr") {
        const frameKind = block.media.frame !== "none" ? block.media.frame : pickFrame(genome, "hero");
        const f = mediaFrame(frameKind, mediaContent(block.media));
        effects.push({ html: "", css: f.css });
        media = `<div class="hero-media">${f.html}</div>`;
      }
      const text = `<div class="hero-text">${eyebrow}${greeting}<h1>${emphasize(block.title.lines, block.title.emphasis)}</h1>${lede}${meta}${ctas}</div>`;
      return `<header class="hero ${cls}">${fx.html}<div class="wrap">${text}${media}</div></header>`;
    }
    case "marquee": {
      const run = block.items
        .map((it) => `<span>${esc(it)}</span><span class="sep">${esc(block.separator)}</span>`)
        .join("");
      return `<div class="marquee"><div class="track">${run}${run}</div></div>`;
    }
    case "collection": {
      const head = block.head
        ? `<div class="sec-head">${block.head.eyebrow ? `<span class="eyebrow">${esc(block.head.eyebrow)}</span>` : ""}<h2>${esc(block.head.title)}</h2></div>`
        : "";
      const rendered = block.items.map((c, i) => renderCard(c, genome, { tint: i }));
      for (const r of rendered) effects.push({ html: "", css: r.css });
      const cards = rendered.map((r) => r.html).join("");
      return `<section class="section"><div class="wrap">${head}<div class="grid">${cards}</div></div></section>`;
    }
    case "gift-grid": {
      const head = block.head
        ? `<div class="sec-head">${block.head.eyebrow ? `<span class="eyebrow">${esc(block.head.eyebrow)}</span>` : ""}<h2>${esc(block.head.title)}</h2></div>`
        : "";
      const rendered = block.items.map((c, i) =>
        renderCard(c, genome, { frame: c.itemType === "photo" ? "polaroid" : "panel", tint: i }),
      );
      for (const r of rendered) effects.push({ html: "", css: r.css });
      const cards = rendered.map((r) => r.html).join("");
      const money = block.action
        ? `<div class="money"><a class="btn btn-primary money-btn" href="#">${esc(block.action.label)} · ${esc(block.action.price)}</a></div>`
        : "";
      return `<section class="section gift-grid"><div class="wrap">${head}<div class="grid">${cards}</div>${money}</div></section>`;
    }
    case "note": {
      const nh =
        block.from || block.to
          ? `<div class="note-head">${block.to ? `<span>To ${esc(block.to)}</span>` : "<span></span>"}${block.from ? `<span>From ${esc(block.from)}</span>` : ""}</div>`
          : "";
      return `<section class="note-block"><div class="wrap"><div class="note-card">${nh}<p class="note-body">${esc(block.body)}</p>${block.signoff ? `<div class="note-sign">${esc(block.signoff)}</div>` : ""}</div></div></section>`;
    }
    case "form": {
      return `<section class="form-block"><div class="wrap"><div class="form-card">
  ${block.eyebrow ? `<span class="eyebrow">${esc(block.eyebrow)}</span>` : ""}
  <h2>${emphasize(block.title.lines, block.title.emphasis)}</h2>
  ${block.body ? `<p class="muted">${esc(block.body)}</p>` : ""}
  <div class="row"><input type="${block.field.type}" placeholder="${esc(block.field.placeholder)}"><a class="btn btn-primary" href="#">${esc(block.submit.label)}</a></div>
  ${block.finePrint ? `<div class="fine">${esc(block.finePrint)}</div>` : ""}
</div></div></section>`;
    }
    case "footer": {
      const lines = block.centeredLines.map((l) => esc(l)).join("<br>");
      return `<footer class="footer"><div class="wrap"><div class="brand">${esc(block.brand)}</div>${block.tagline ? `<div class="lines">${esc(block.tagline)}</div>` : ""}<div class="lines">${lines}</div>${block.legal ? `<div class="legal">${esc(block.legal)}</div>` : ""}</div></footer>`;
    }
    default:
      return `<!-- block ${(block as { kind: string }).kind} not yet rendered -->`;
  }
}
