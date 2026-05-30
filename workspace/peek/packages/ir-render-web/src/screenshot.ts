import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { readdirSync } from "node:fs";

/** Load each rendered .proof/*.html in headless Chromium and screenshot it (desktop + mobile). */
const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, "../../../.proof");
const files = readdirSync(dir).filter((f) => f.endsWith(".html"));

const browser = await chromium.launch();

for (const f of files) {
  const url = "file://" + join(dir, f);
  const base = f.replace(".html", "");

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await desktop.goto(url, { waitUntil: "load", timeout: 20000 }).catch(() => {});
  await desktop.waitForTimeout(1400);
  await desktop.screenshot({ path: join(dir, `${base}.png`), fullPage: true });
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  await mobile.goto(url, { waitUntil: "load", timeout: 20000 }).catch(() => {});
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: join(dir, `${base}.mobile.png`), fullPage: true });
  await mobile.close();

  console.log(`shot ${base}  (desktop + mobile)`);
}

await browser.close();
console.log("done");
