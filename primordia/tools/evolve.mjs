#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   PRIMORDIA — evolutionary world search.

   Generates many fully-random worlds, lets each settle, scores them by the
   "alive + structured" metric (sim-core.evaluate), and renders a HALL OF FAME
   of the highest-scoring universes — proving the interestingness metric that
   the live app's Genesis autopilot uses actually finds cool life.

   Master:  node tools/evolve.mjs [total] [N]
   (spawns workers across cores; writes stills/hall_of_fame.png + prints DNA)
--------------------------------------------------------------------------- */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { makeRandomWorld, evaluate, renderFrame, encodePNG } from "./sim-core.mjs";
import { decodePNG, drawText } from "./png-util.mjs";

const __file = fileURLToPath(import.meta.url);
const root = path.join(path.dirname(__file), "..");
const evoDir = path.join(root, "stills", "evo");

/* ----------------------------- worker mode -------------------------------- */
if (process.argv[2] === "--worker") {
  const start = +process.argv[3], count = +process.argv[4], N = +process.argv[5], S = +process.argv[6];
  const out = [];
  for (let k = 0; k < count; k++) {
    const seed = start + k;
    const W = makeRandomWorld({ seed, N });
    const ev = evaluate(W);                       // settles + scores (mutates W)
    const png = renderFrame(W, S, 1.2);
    fs.writeFileSync(path.join(evoDir, `s_${seed}.png`), encodePNG(S, S, png));
    out.push({ seed, K: W.K, score: ev.score, D: ev.dispersion, tc: ev.temporal,
      dna: { k: W.K, phys: W.P, m: Array.from(W.M).map(x => +x.toFixed(3)) } });
    process.stderr.write(".");
  }
  fs.writeFileSync(path.join(evoDir, `scores_${start}.json`), JSON.stringify(out));
  process.exit(0);
}

/* ----------------------------- master mode -------------------------------- */
const TOTAL = +(process.argv[2] || 48);
const N = +(process.argv[3] || 1600);
const S = 220, WORKERS = 4, S_BIG = 300;
fs.rmSync(evoDir, { recursive: true, force: true });
fs.mkdirSync(evoDir, { recursive: true });

const per = Math.ceil(TOTAL / WORKERS);
console.log(`Evolving ${TOTAL} random worlds (N=${N}) across ${WORKERS} workers…`);
const t0 = Date.now();

const procs = [];
for (let w = 0; w < WORKERS; w++) {
  const start = 1000 + w * per;
  const p = spawn(process.execPath, [__file, "--worker", start, per, N, S], { stdio: ["ignore", "inherit", "inherit"] });
  procs.push(new Promise(res => p.on("exit", res)));
}
await Promise.all(procs);
process.stderr.write("\n");

/* gather + rank */
let all = [];
for (const f of fs.readdirSync(evoDir)) if (f.startsWith("scores_"))
  all = all.concat(JSON.parse(fs.readFileSync(path.join(evoDir, f))));
all.sort((a, b) => b.score - a.score);
const SHOW = +(process.env.SHOW || 12);
const top = all.slice(0, SHOW);

console.log(`\nScored ${all.length} worlds in ${((Date.now()-t0)/1000).toFixed(1)}s. Top ${SHOW}:`);
for (const t of top) console.log(`  seed ${t.seed}  K${t.K}  score ${t.score.toFixed(2)}  disp ${t.D.toFixed(1)}  churn ${t.tc.toFixed(3)}`);

/* render hall-of-fame grid (re-render winners bigger) */
const tiles = [];
for (const t of top) {
  const W = makeRandomWorld({ seed: t.seed, N: N }); evaluate(W);
  tiles.push({ t, img: { w: S_BIG, h: S_BIG, rgb: renderFrame(W, S_BIG, 1.25) } });
}
const cols = 4, rows = Math.ceil(tiles.length / cols), gut = 14, lab = 26;
const GW = cols*S_BIG + (cols+1)*gut, GH = rows*(S_BIG+lab) + (rows+1)*gut + 34;
const buf = Buffer.alloc(GW*GH*3);
for (let i=0;i<GW*GH;i++){ buf[i*3]=6; buf[i*3+1]=7; buf[i*3+2]=12; }
drawText(buf, GW, gut, 12, "PRIMORDIA  HALL OF FAME", 2, [150,230,255]);
tiles.forEach((tile, idx) => {
  const cx = idx%cols, cy = (idx/cols)|0;
  const x0 = gut + cx*(S_BIG+gut), y0 = 34 + gut + cy*(S_BIG+lab+gut) + lab;
  for (let y=0;y<S_BIG;y++) tile.img.rgb.copy(buf, ((y0+y)*GW + x0)*3, y*S_BIG*3, (y+1)*S_BIG*3);
  drawText(buf, GW, x0+2, y0-20, `SEED ${tile.t.seed} K${tile.t.K} ${tile.t.score.toFixed(1)}`, 2, [170,225,255]);
});
fs.writeFileSync(path.join(root, "stills", "hall_of_fame.png"), encodePNG(GW, GH, buf));
console.log(`\nhall_of_fame.png  ${GW}×${GH}`);

/* dump the winners' DNA so they can be curated into the app's Bestiary */
fs.writeFileSync(path.join(evoDir, "winners.json"), JSON.stringify(top.map(t => ({ seed:t.seed, score:+t.score.toFixed(2), ...t.dna })), null, 0));
console.log("winners DNA → stills/evo/winners.json");
