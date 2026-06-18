#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   PRIMORDIA — emergence strip. Runs the "Cells" world from primordial soup and
   captures it self-organizing over time into a left→right contact strip.

   A faithful CPU port of the GPU sim's force law (shared via sim-core) — its job
   is to PROVE emergence without a browser. If structure rises here, the WebGL
   shader (identical math) is sound. This is also what caught the original
   exploding-timestep bug and produced the proven-good defaults the app ships.

   Run:  node tools/render.mjs [seed] [N] [S]
   Env:  CAPS=0,200,600 to override capture steps.
--------------------------------------------------------------------------- */
import fs from "node:fs";
import path from "node:path";
import { makeWorld, step, renderFrame, encodePNG, dispersion, gridCounts } from "./sim-core.mjs";

const SEED = process.argv[2] ? parseInt(process.argv[2]) : 0xC0FFEE;
const N    = +(process.argv[3] || 4096);
const S    = +(process.argv[4] || 460);
const caps = (process.env.CAPS || "0,300,900,1800,3200").split(",").map(Number);

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "stills");
fs.mkdirSync(dir, { recursive: true });

/* horizontal contact strip with gutters */
function strip(frames, S, gut) {
  const cols = frames.length, W = cols*S + (cols+1)*gut, H = S + 2*gut;
  const buf = Buffer.alloc(W*H*3);
  frames.forEach((f, k) => { const x0 = gut + k*(S+gut), y0 = gut;
    for (let y=0;y<S;y++) f.copy(buf, ((y0+y)*W + x0)*3, y*S*3, (y+1)*S*3); });
  return { buf, W, H };
}

const W = makeWorld({ preset:"Cells", seed:SEED, N });
console.log(`PRIMORDIA emergence — seed ${SEED.toString(16)}, N=${W.N}, K=${W.K}`);

const frames = [];
let stepNo = 0; const t0 = Date.now();
for (const cap of caps) {
  while (stepNo < cap) { step(W); stepNo++; }
  frames.push(renderFrame(W, S, 1.1));
  const d = dispersion(gridCounts(W, 20), W.N);
  console.log(`  step ${String(cap).padStart(4)}  ·  structure ${d.toFixed(2)}`);
}
const st = strip(frames, S, 14);
fs.writeFileSync(path.join(dir, "emergence.png"), encodePNG(st.W, st.H, st.buf));
console.log(`\nDone in ${((Date.now()-t0)/1000).toFixed(1)}s → stills/emergence.png (${st.W}×${st.H})`);
console.log("Frames left→right: primordial soup → self-organized cells (structure rises).");
