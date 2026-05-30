import type { Block, Card } from "@peek/site-ir";
import type { Genome } from "@peek/vibe-genome";
import { backgroundEffect, type Effect } from "./effects";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const GLYPHS = ["✦", "✺", "❖", "✿", "♦", "★", "❀", "◆", "✷", "❉"];

function emphasize(lines: string[], emphasis: number[]): string {
  return lines
    .map((l, i) => (emphasis.includes(i) ? `<em>${esc(l)}</em>` : esc(l)))
    .join("<br>");
}

function btn(label: string, variant: "primary" | "ghost" | "link"): string {
  return `<a class="btn btn-${variant}" href="#">${esc(label)}</a>`;
}

function mediaInner(m: Card["media"], i: number): string {
  if (m.kind === "glyph") return `<span class="ph">${m.glyph ?? GLYPHS[i % GLYPHS.length]}</span>`;
  if (m.kind === "photo" && m.src) return `<img src="${esc(m.src)}" alt="${esc(m.alt ?? "")}" style="width:100%;height:100%;object-fit:cover">`;
  return `<span class="ph">${GLYPHS[i % GLYPHS.length]}</span>`;
}

function renderCard(c: Card, i: number): string {
  const badge = c.badge ? `<span class="badge">${esc(c.badge)}</span>` : "";
  const sub = c.subtitle ? `<div class="sub">${esc(c.subtitle)}</div>` : "";
  const desc = c.description ? `<p class="desc">${esc(c.description)}</p>` : "";
  const price = c.price ? `<span class="price">${esc(c.price)}</span>` : "";
  const action = c.claim ? `<button class="claim">${esc(c.claim.label)}</button>` : "";
  return `<article class="card">
  <div class="card-media">${badge}${mediaInner(c.media, i)}</div>
  <div class="card-body"><h3>${esc(c.name)}</h3>${sub}${desc}<div class="row">${price}${action}</div></div>
</article>`;
}

/** Render one block to HTML. Hero pulls in its background effect. */
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
      const cls = layout === "split-lr" ? "split" : layout === "centered" ? "centered" : "centered";
      const greeting = block.greeting ? `<span class="hero-greeting">${esc(block.greeting)}</span>` : "";
      const eyebrow = block.eyebrow ? `<span class="eyebrow">${esc(block.eyebrow)}</span>` : "";
      const lede = block.lede ? `<p class="hero-lede">${esc(block.lede)}</p>` : "";
      const meta = block.meta.length
        ? `<div class="hero-meta">${block.meta.map((m) => `<span class="pill">${esc(m.key)} · ${esc(m.value)}</span>`).join("")}</div>`
        : "";
      const ctas = block.ctas.length
        ? `<div class="hero-cta">${block.ctas.map((cc, i) => btn(cc.label, i === 0 ? "primary" : "ghost")).join("")}</div>`
        : "";
      const frame = block.media?.frame ?? "none";
      const media =
        block.media && layout === "split-lr"
          ? `<div class="hero-media ${frame}">${mediaInner(block.media, 0)}</div>`
          : "";
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
      const cards = block.items.map((c, i) => renderCard(c, i)).join("");
      return `<section class="section"><div class="wrap">${head}<div class="grid">${cards}</div></div></section>`;
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

// (no re-exports)
