#!/usr/bin/env node
/* Build a poster of the best evolved universes from a previous search run.
   Reuses the thumbnails + scores already in stills/evo/ (no re-simulation).
   Run a search first:  node tools/evolve.mjs 96
   Then:                node tools/poster.mjs [count] [cols]  →  stills/poster.png */
import fs from "node:fs";
import path from "node:path";
import { encodePNG } from "./sim-core.mjs";
import { decodePNG, drawText } from "./png-util.mjs";

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const evoDir = path.join(root, "stills", "evo");
if (!fs.existsSync(evoDir)) { console.error("no stills/evo — run tools/evolve.mjs first"); process.exit(1); }

const COUNT = +(process.argv[2] || 36);
const COLS  = +(process.argv[3] || 6);

let all = [];
for (const f of fs.readdirSync(evoDir)) if (f.startsWith("scores_"))
  all = all.concat(JSON.parse(fs.readFileSync(path.join(evoDir, f))));
all.sort((a, b) => b.score - a.score);

const picks = [];
for (const w of all) {
  const f = path.join(evoDir, `s_${w.seed}.png`);
  if (fs.existsSync(f)) picks.push({ w, img: decodePNG(fs.readFileSync(f)) });
  if (picks.length >= COUNT) break;
}
if (!picks.length) { console.error("no thumbnails found in stills/evo"); process.exit(1); }

const S = picks[0].img.w, cols = COLS, rows = Math.ceil(picks.length / cols);
const gut = 8, head = 52;
const GW = cols*S + (cols+1)*gut, GH = rows*S + (rows+1)*gut + head;
const buf = Buffer.alloc(GW*GH*3);
for (let i = 0; i < GW*GH; i++){ buf[i*3]=5; buf[i*3+1]=6; buf[i*3+2]=11; }
drawText(buf, GW, gut+4, 12, "PRIMORDIA", 4, [150,230,255]);
drawText(buf, GW, gut+4, 34, `${picks.length} EVOLVED UNIVERSES  TOP OF ${all.length} RANDOM RULE-SETS`, 2, [120,150,200]);

picks.forEach((p, idx) => {
  const cx = idx%cols, cy = (idx/cols)|0;
  const x0 = gut + cx*(S+gut), y0 = head + gut + cy*(S+gut);
  for (let y = 0; y < S; y++) p.img.rgb.copy(buf, ((y0+y)*GW + x0)*3, y*S*3, (y+1)*S*3);
});
fs.writeFileSync(path.join(root, "stills", "poster.png"), encodePNG(GW, GH, buf));
console.log(`poster.png  ${GW}×${GH}  (${picks.length} worlds, top score ${picks[0].w.score.toFixed(2)})`);
