#!/usr/bin/env node
/* Render the app's curated Bestiary into stills/bestiary.png — reading the DNA
   straight out of index.html so the showcase always matches what ships.
   Usage: node tools/bestiary.mjs */
import fs from "node:fs";
import path from "node:path";
import { makeWorldFromDNA, step, renderFrame, encodePNG } from "./sim-core.mjs";
import { drawText } from "./png-util.mjs";

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

/* extract the `const BESTIARY = [ ... ];` literal and eval it (object literal, not JSON) */
const m = html.match(/const BESTIARY\s*=\s*(\[[\s\S]*?\]);/);
if (!m) { console.error("BESTIARY not found in index.html"); process.exit(1); }
const BESTIARY = new Function("return " + m[1])();
console.log(`Rendering ${BESTIARY.length} curated worlds…`);

const S = 300, STEPS = +(process.env.STEPS || 800), N = +(process.env.N || 3000);
const tiles = BESTIARY.map((b, i) => {
  const W = makeWorldFromDNA({ k:b.k, phys:b.phys, m:b.m, seed: 7+i, N });
  for (let s=0;s<STEPS;s++) step(W);
  process.stderr.write(".");
  return { name:b.name, k:b.k, rgb: renderFrame(W, S, 1.2) };
});
process.stderr.write("\n");

const cols = 4, rows = Math.ceil(tiles.length/cols), gut = 14, lab = 24, head = 34;
const GW = cols*S + (cols+1)*gut, GH = rows*(S+lab) + (rows+1)*gut + head;
const buf = Buffer.alloc(GW*GH*3);
for (let i=0;i<GW*GH;i++){ buf[i*3]=6; buf[i*3+1]=7; buf[i*3+2]=12; }
drawText(buf, GW, gut, 11, "PRIMORDIA  BESTIARY  DISCOVERED WORLDS", 2, [150,230,255]);
tiles.forEach((t, idx) => {
  const cx = idx%cols, cy = (idx/cols)|0;
  const x0 = gut + cx*(S+gut), y0 = head + gut + cy*(S+lab+gut) + lab;
  for (let y=0;y<S;y++) t.rgb.copy(buf, ((y0+y)*GW + x0)*3, y*S*3, (y+1)*S*3);
  drawText(buf, GW, x0+2, y0-19, `${t.name}  K${t.k}`, 2, [170,225,255]);
});
fs.writeFileSync(path.join(root, "stills", "bestiary.png"), encodePNG(GW, GH, buf));
console.log(`bestiary.png  ${GW}×${GH}  (${tiles.length} worlds)`);
