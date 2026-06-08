/**
 * Golden-brief harness v2 — ZIP-FAITHFUL.
 * Uses the owner's literal seat.ts (the proven prompt) verbatim, the zip's exact
 * set_page+publish tool surface, fills <img data-peek-img> slots with real fal
 * images (like the zip's host does), then renders headless to PNG. Adaptive
 * thinking is the only addition the zip lacked. Run with env sourced from .env.local.
 */
import Anthropic from "@anthropic-ai/sdk";
import { SEAT } from "../../../_claude/snapshots/deployed/netlify/seat";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const MODEL = "claude-opus-4-8";
const OUT = "/tmp/golden";

const TOOLS = [
  {
    name: "set_page",
    description:
      "Author the WHOLE page as one freeform HTML document and show it. Call this FIRST so the page appears at once. Include your own Google Fonts <link>, a <style> block, bespoke CSS, and CSS/SVG motion. Tag every interactive/claimable thing with the data-peek-* contract. CSS/SVG only — never a <script>, <form>, <input>, or an inline data:/base64 image; for an image you don't have, leave an <img data-peek-img data-peek-img-desc=\"vivid prompt\"> slot for the host to fill.",
    input_schema: { type: "object", properties: { html: { type: "string" } }, required: ["html"] },
  },
  { name: "publish", description: "Flag the page ready for the $12 checkout.", input_schema: { type: "object", properties: {} } },
];

const BRIEFS = [
  { id: "dad-70-bourbon-bmw", text: "my dad's turning 70. he's a quiet guy, never asks for anything — bourbon man, and he drove the same old BMW E30 for like 30 years and babied it. grown kids finally doing something for the guy who quietly did everything." },
  { id: "ballerina-niece", text: "my niece is 10 and obsessed with ballet. i want to get her new pointe shoes but give her a couple options to pick from, and maybe throw in something fun she wouldn't expect." },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fal(desc: string): Promise<string | null> {
  try {
    const r = await fetch("https://fal.run/fal-ai/flux-pro/v1.1", {
      method: "POST",
      headers: { Authorization: `Key ${process.env.FAL_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ prompt: desc || "a bespoke editorial illustration that fits the page", image_size: "square_hd", num_images: 1 }),
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    return j?.images?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

async function fillImages(html: string): Promise<string> {
  const tags = html.match(/<img\b[^>]*\bdata-peek-img\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const m = /data-peek-img-desc\s*=\s*"([^"]*)"/i.exec(tag) || /\balt\s*=\s*"([^"]*)"/i.exec(tag);
    const url = await fal(m ? m[1] : "");
    if (!url) continue;
    const newTag = /\bsrc\s*=/.test(tag)
      ? tag.replace(/\bsrc\s*=\s*"[^"]*"/i, `src="${url}"`)
      : tag.replace(/<img\b/i, `<img src="${url}"`);
    html = html.replace(tag, newTag);
  }
  return html;
}

async function generate(text: string): Promise<string> {
  const client = new Anthropic();
  const messages: any[] = [{ role: "user", content: text }];
  let html = "";
  for (let hop = 0; hop < 4; hop++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      system: SEAT,
      tools: TOOLS as any,
      messages,
    } as any);
    const msg: any = await stream.finalMessage();
    messages.push({ role: "assistant", content: msg.content });
    const toolUses = msg.content.filter((b: any) => b.type === "tool_use");
    if (msg.stop_reason !== "tool_use" || toolUses.length === 0) break;
    const results: any[] = [];
    for (const tu of toolUses) {
      if (tu.name === "set_page" && tu.input?.html) html = tu.input.html;
      results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify({ ok: true }) });
    }
    messages.push({ role: "user", content: results });
  }
  return html;
}

(async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const b of BRIEFS) {
    try {
      const t0 = Date.now();
      let html = await generate(b.text);
      const imgs = (html.match(/data-peek-img\b/gi) || []).length;
      html = await fillImages(html);
      writeFileSync(`${OUT}/${b.id}.html`, html);
      const page = await browser.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
      await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${OUT}/${b.id}.png`, fullPage: true });
      await page.close();
      console.log(`${b.id}: ${html.length}b, ${imgs} img-slots, ${(Date.now() - t0) / 1000}s -> ${OUT}/${b.id}.png`);
    } catch (e) {
      console.error(`${b.id} FAILED:`, (e as Error).message);
    }
  }
  await browser.close();
})();
