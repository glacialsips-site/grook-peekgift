#!/usr/bin/env node
/* Stitch stills/preset_*.png into a labeled gallery grid: stills/gallery.png
   Reads the PNGs back (tiny inflate) and composes with a built-in 5x7 font. */
import fs from "node:fs";
import path from "node:path";
import { encodePNG } from "./sim-core.mjs";
import { decodePNG, drawText } from "./png-util.mjs";

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "stills");
const order = ["Cells","Chase","Swarm","Crystal","Veins","Chaos"];
const tiles = order.map(n => ({ n, f: path.join(dir, `preset_${n}.png`) }))
                   .filter(t => fs.existsSync(t.f))
                   .map(t => ({ n:t.n, img: decodePNG(fs.readFileSync(t.f)) }));
if (!tiles.length){ console.error("no preset_*.png found — run preset.mjs first"); process.exit(1); }

const S = tiles[0].img.w, cols = 3, rows = Math.ceil(tiles.length/cols);
const gut = 16, lab = 30;
const GW = cols*S + (cols+1)*gut, GH = rows*(S+lab) + (rows+1)*gut;
const out = Buffer.alloc(GW*GH*3);
// faint background
for (let i=0;i<GW*GH;i++){ out[i*3]=6; out[i*3+1]=7; out[i*3+2]=12; }

tiles.forEach((t, idx) => {
  const cx = idx%cols, cy = (idx/cols)|0;
  const x0 = gut + cx*(S+gut), y0 = gut + cy*(S+lab+gut) + lab;
  for (let y=0;y<S;y++) t.img.rgb.copy(out, ((y0+y)*GW + x0)*3, y*S*3, (y+1)*S*3);
  drawText(out, GW, x0+2, y0-22, t.n.toUpperCase(), 2, [180,235,255]);
});
fs.writeFileSync(path.join(dir, "gallery.png"), encodePNG(GW, GH, out));
console.log(`gallery.png  ${GW}×${GH}  (${tiles.length} presets)`);
