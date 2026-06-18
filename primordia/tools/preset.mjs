#!/usr/bin/env node
/* Render a single preset to stills/preset_<name>.png after `steps` of sim.
   Usage: node tools/preset.mjs <Preset> [seed] [N] [steps] [S] */
import fs from "node:fs";
import path from "node:path";
import { makeWorld, step, renderFrame, encodePNG, order, PRESETS } from "./sim-core.mjs";

const name  = process.argv[2] || "Cells";
const seed  = process.argv[3] ? parseInt(process.argv[3]) : 0xC0FFEE;
const N     = +(process.argv[4] || 2600);
const steps = +(process.argv[5] || 1100);
const S     = +(process.argv[6] || 360);
if (!PRESETS[name]) { console.error("unknown preset", name); process.exit(1); }

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "stills");
fs.mkdirSync(dir, { recursive: true });

const W = makeWorld({ preset: name, seed, N });
const t0 = Date.now();
for (let i = 0; i < steps; i++) step(W);
const png = renderFrame(W, S, 1.15);
fs.writeFileSync(path.join(dir, `preset_${name}.png`), encodePNG(S, S, png));
console.log(`${name.padEnd(8)} seed=${seed.toString(16)} N=${N} steps=${steps} order=${order(W).toFixed(4)} ${(Date.now()-t0)/1000}s`);
