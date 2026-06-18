#!/usr/bin/env node
/* Stitch stills/preset_*.png into a labeled gallery grid: stills/gallery.png
   Reads the PNGs back (tiny inflate) and composes with a built-in 5x7 font. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { encodePNG } from "./sim-core.mjs";

/* --- minimal PNG *decoder* for our own 8-bit RGB, filter-0 files --- */
function decodePNG(buf){
  let p = 8, w=0, h=0; const idats=[];
  while (p < buf.length){
    const len = buf.readUInt32BE(p); const type = buf.toString("ascii", p+4, p+8);
    const data = buf.subarray(p+8, p+8+len);
    if (type==="IHDR"){ w=data.readUInt32BE(0); h=data.readUInt32BE(4); }
    else if (type==="IDAT") idats.push(data);
    else if (type==="IEND") break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const rgb = Buffer.alloc(w*h*3);
  for (let y=0;y<h;y++) raw.copy(rgb, y*w*3, y*(w*3+1)+1, (y+1)*(w*3+1));
  return { w, h, rgb };
}

/* --- 5x7 uppercase font (only glyphs we need) --- */
const F = {
  " ":["00000","00000","00000","00000","00000","00000","00000"],
  A:["01110","10001","10001","11111","10001","10001","10001"],
  C:["01110","10001","10000","10000","10000","10001","01110"],
  E:["11111","10000","10000","11110","10000","10000","11111"],
  H:["10001","10001","10001","11111","10001","10001","10001"],
  I:["11111","00100","00100","00100","00100","00100","11111"],
  L:["10000","10000","10000","10000","10000","10000","11111"],
  M:["10001","11011","10101","10101","10001","10001","10001"],
  N:["10001","11001","10101","10011","10001","10001","10001"],
  O:["01110","10001","10001","10001","10001","10001","01110"],
  R:["11110","10001","10001","11110","10100","10010","10001"],
  S:["01111","10000","10000","01110","00001","00001","11110"],
  T:["11111","00100","00100","00100","00100","00100","00100"],
  V:["10001","10001","10001","10001","10001","01010","00100"],
  W:["10001","10001","10001","10101","10101","11011","10001"],
  Y:["10001","10001","01010","00100","00100","00100","00100"],
};
function drawText(buf, W, x, y, text, scale, rgb){
  for (let ci=0; ci<text.length; ci++){
    const g = F[text[ci]] || F[" "];
    for (let r=0;r<7;r++) for (let c=0;c<5;c++) if (g[r][c]==="1")
      for (let sy=0;sy<scale;sy++) for (let sx=0;sx<scale;sx++){
        const px=x+(ci*6+c)*scale+sx, py=y+r*scale+sy;
        const o=(py*W+px)*3; if(o>=0&&o+2<buf.length){ buf[o]=rgb[0]; buf[o+1]=rgb[1]; buf[o+2]=rgb[2]; }
      }
  }
}

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
