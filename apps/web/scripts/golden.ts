/**
 * Golden-brief harness: runs the real seat prompt against fixed briefs, captures
 * the authored page, and renders it headless to a PNG. Zero deploys — the
 * anti-micro-revision loop. Self-contained: only the no-import system prompt +
 * the Anthropic SDK + Playwright. Run with the env sourced from .env.local.
 */
import Anthropic from "@anthropic-ai/sdk";
import { PEEK_STUDIO_SYSTEM_PROMPT } from "../lib/curator/system-prompt";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const MODEL = "claude-opus-4-8";
const OUT = "/tmp/golden";

const TOOLS = [
  {
    name: "set_page",
    description:
      "Author the WHOLE page as one freeform HTML document and show it. Call this FIRST. Include your own Google Fonts <link>, a <style> block, bespoke CSS, and CSS/SVG motion. Tag interactive/claimable things with data-peek-*. CSS/SVG only — never a <script>, <form>, <input>, or inline data:/base64.",
    input_schema: { type: "object", properties: { html: { type: "string" } }, required: ["html"] },
  },
  { name: "edit_region", description: "Replace one matched node's markup (smallest surgical edit).", input_schema: { type: "object", properties: { selector: { type: "string" }, html: { type: "string" } }, required: ["selector", "html"] } },
  { name: "set_style", description: "Add/override a themed style block.", input_schema: { type: "object", properties: { css: { type: "string" } }, required: ["css"] } },
  { name: "set_media", description: "Drop a resolved image url into a slot.", input_schema: { type: "object", properties: { selector: { type: "string" }, url: { type: "string" } }, required: ["selector", "url"] } },
  { name: "resolve_card", description: "Resolve a URL or fuzzy ask to product data.", input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } },
  { name: "generate_hero_image", description: "Paint a hero image from a vivid prompt.", input_schema: { type: "object", properties: { prompt: { type: "string" }, aspect: { type: "string" } }, required: ["prompt"] } },
  { name: "publish", description: "Flag the page ready for checkout.", input_schema: { type: "object", properties: {} } },
];

const BRIEFS = [
  { id: "dad-70-bourbon-bmw", text: "my dad's turning 70. he's a quiet guy, never asks for anything — bourbon man, and he drove the same old BMW E30 for like 30 years and babied it. grown kids finally doing something for the guy who quietly did everything." },
  { id: "ballerina-niece", text: "my niece is 10 and obsessed with ballet. i want to get her new pointe shoes but give her a couple options to pick from, and maybe throw in something fun she wouldn't expect." },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
async function generate(text: string): Promise<string> {
  const client = new Anthropic();
  const messages: any[] = [{ role: "user", content: text }];
  let html = "";
  for (let hop = 0; hop < 6; hop++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      system: PEEK_STUDIO_SYSTEM_PROMPT,
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
      const content =
        tu.name === "generate_hero_image"
          ? "image generation is off in this harness — leave a treated image slot with a caption instead."
          : tu.name === "resolve_card"
            ? "resolver is off in this harness — author the card yourself with realistic title/price/source."
            : JSON.stringify({ ok: true });
      results.push({ type: "tool_result", tool_use_id: tu.id, content });
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
      const html = await generate(b.text);
      writeFileSync(`${OUT}/${b.id}.html`, html);
      const page = await browser.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${b.id}.png`, fullPage: true });
      await page.close();
      console.log(`${b.id}: ${html.length}b html, ${(Date.now() - t0) / 1000}s -> ${OUT}/${b.id}.png`);
    } catch (e) {
      console.error(`${b.id} FAILED:`, (e as Error).message);
    }
  }
  await browser.close();
})();
