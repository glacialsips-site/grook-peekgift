import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { chromium } from "playwright";
import { resolveTokens } from "@peek/vibe-resolve";
import { genomeSchema } from "@peek/vibe-genome";
import { peekSchema } from "@peek/site-ir";
import { renderPeek } from "./render";

/**
 * Render LIVE model-generated designs (captured to /tmp/gen*.json by the synthesis route)
 * and screenshot them at phone width — the truest representation of the Builder canvas.
 * This is the diversity proof with the real engine, not hand-authored fixtures.
 */
const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../../.proof");
mkdirSync(outDir, { recursive: true });

const set: Array<[string, string]> = [
  ["gen1", "gen-theo"],
  ["gen2", "gen-polly"],
  ["gen3", "gen-dave"],
  ["gen4", "gen-priya"],
];

const browser = await chromium.launch();
for (const [src, name] of set) {
  const raw = JSON.parse(readFileSync(`/tmp/${src}.json`, "utf8")) as { genome: unknown; peek: unknown };
  const genome = genomeSchema.parse(raw.genome);
  const peek = peekSchema.parse(raw.peek);
  const html = renderPeek(peek, genome, resolveTokens(genome));
  const file = join(outDir, `${name}.html`);
  writeFileSync(file, html, "utf8");

  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await page.goto("file://" + file, { waitUntil: "load", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  await page.close();
  console.log(`rendered + shot ${name}  (${(html.length / 1024).toFixed(1)}kb)`);
}
await browser.close();
console.log("done");
