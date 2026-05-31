import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { resolveTokens } from "@peek/vibe-resolve";
import { renderPeek } from "./render";
import { proofs } from "./fixtures";

/** Render every fixture to a standalone HTML file under workspace/peek/.proof/. */
const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../../.proof");
mkdirSync(outDir, { recursive: true });

for (const p of proofs) {
  const tokens = resolveTokens(p.genome);
  const html = renderPeek(p.peek, p.genome, tokens);
  const file = join(outDir, `${p.name}.html`);
  writeFileSync(file, html, "utf8");
  console.log(`rendered ${p.name.padEnd(10)} -> ${file}  (${(html.length / 1024).toFixed(1)}kb)`);
}
console.log(`\n${proofs.length} peeks rendered to ${outDir}`);
