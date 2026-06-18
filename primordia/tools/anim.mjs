#!/usr/bin/env node
/* Render a looping animated PNG of a living world (with motion trails) so the
   README can show the simulation actually breathing — not just stills.
   Usage: node tools/anim.mjs [Preset] [seed] [N] [S] [frames] [stepsPerFrame] */
import fs from "node:fs";
import path from "node:path";
import { makeWorld, step, PALETTE } from "./sim-core.mjs";
import { encodeAPNG } from "./png-util.mjs";

const preset = process.argv[2] || "Veins";
const seed   = process.argv[3] ? parseInt(process.argv[3]) : 0xBEEF;
const N      = +(process.argv[4] || 3000);
const S      = +(process.argv[5] || 300);
const FRAMES = +(process.argv[6] || 44);
const SPF    = +(process.argv[7] || 4);
const SETTLE = +(process.env.SETTLE || 520);
const TRAIL  = +(process.env.TRAIL || 0.84);

const W = makeWorld({ preset, seed, N });
for (let i = 0; i < SETTLE; i++) step(W);

const acc = new Float32Array(S * S * 3);   // persistent → trails
const aces = x => { const v = (x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14); return Math.max(0, Math.min(1, v)); };

function splat() {
  for (let i = 0; i < S*S*3; i++) acc[i] *= TRAIL;      // fade previous
  const R = 3;
  for (let i = 0; i < W.N; i++) {
    const cx = (W.px[i]*S)|0, cy = ((1-W.py[i])*S)|0; const col = PALETTE[W.sp[i]];
    for (let dy=-R; dy<=R; dy++) for (let dx=-R; dx<=R; dx++) {
      const x=cx+dx, y=cy+dy; if (x<0||y<0||x>=S||y>=S) continue;
      const g = Math.exp(-(dx*dx+dy*dy)/3.0)*0.9; const o=(y*S+x)*3;
      acc[o]+=col[0]*g; acc[o+1]+=col[1]*g; acc[o+2]+=col[2]*g;
    }
  }
}
function frameRGB() {
  const out = Buffer.alloc(S*S*3);
  for (let i = 0; i < S*S; i++) {
    out[i*3]   = Math.round(aces(acc[i*3]  *1.2)*255);
    out[i*3+1] = Math.round(aces(acc[i*3+1]*1.2)*255);
    out[i*3+2] = Math.round(aces(acc[i*3+2]*1.2)*255);
  }
  return out;
}

const frames = [];
const t0 = Date.now();
for (let f = 0; f < FRAMES; f++) {
  for (let s = 0; s < SPF; s++) step(W);
  splat();
  frames.push(frameRGB());
  process.stderr.write(".");
}
process.stderr.write("\n");

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "stills");
fs.mkdirSync(dir, { recursive: true });
const apng = encodeAPNG(S, S, frames, 18);
fs.writeFileSync(path.join(dir, "anim.png"), apng);
console.log(`anim.png  ${S}×${S}  ${FRAMES} frames  ${(apng.length/1024/1024).toFixed(2)}MB  (${preset}, ${((Date.now()-t0)/1000).toFixed(1)}s)`);
