import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/** Screenshot the running Builder app (next start on :3000). */
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../.proof");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 2 });

for (const [name, path] of [
  ["app-landing", "/"],
  ["app-build", "/build"],
] as const) {
  await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: resolve(out, `${name}.png`) });
  console.log("shot", name);
}

await browser.close();
console.log("done");
