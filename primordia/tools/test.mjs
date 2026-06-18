#!/usr/bin/env node
/* Invariant tests for the Primordia CPU core + PNG/APNG codecs.
   Run: node tools/test.mjs   (exit code 1 on any failure) */
import {
  makeWorld, makeRandomWorld, makeWorldFromDNA, step, falloff, dispersion,
  gridCounts, meanSpeed, evaluate, renderFrame, encodePNG, PRESETS,
} from "./sim-core.mjs";
import { decodePNG, encodeAPNG } from "./png-util.mjs";

let pass = 0, fail = 0;
const ok  = (name, cond, extra="") => { if (cond) { pass++; console.log("  ✅", name); }
  else { fail++; console.log("  ❌", name, extra); } };
const approx = (a, b, eps=1e-6) => Math.abs(a-b) <= eps;

console.log("\nfalloff() shape");
{
  const beta = 0.3;
  ok("repulsive below beta", falloff(0.1, 1, beta) < 0 && falloff(0.0001, 1, beta) < 0);
  ok("zero at exactly beta", approx(falloff(beta, 1, beta), 0, 1e-9));
  ok("attractive mid-range with a>0", falloff(0.65, 1, beta) > 0);
  ok("repulsive mid-range with a<0", falloff(0.65, -1, beta) < 0);
  ok("zero at/after rMax", falloff(1.0, 1, beta) === 0 && falloff(1.5, 1, beta) === 0);
  ok("peak attraction near band center", falloff(0.65, 1, beta) >= falloff(0.95, 1, beta));
}

console.log("\nsimulation invariants");
{
  const W = makeWorld({ preset:"Cells", seed:123, N:1024 });
  for (let i=0;i<200;i++) step(W);
  let inside = true;
  for (let i=0;i<W.N;i++) if (W.px[i]<0||W.px[i]>=1||W.py[i]<0||W.py[i]>=1) inside=false;
  ok("positions stay toroidally in [0,1)", inside);
  let finite = true;
  for (let i=0;i<W.N;i++) if (!Number.isFinite(W.px[i])||!Number.isFinite(W.vx[i])) finite=false;
  ok("no NaN/Inf in stable preset", finite);

  // determinism: same seed -> identical trajectory
  const A = makeWorld({ preset:"Chase", seed:42, N:512 });
  const B = makeWorld({ preset:"Chase", seed:42, N:512 });
  for (let i=0;i<120;i++){ step(A); step(B); }
  let same = true; for (let i=0;i<A.N;i++) if (A.px[i]!==B.px[i]||A.py[i]!==B.py[i]) same=false;
  ok("deterministic for a fixed seed", same);

  // different seeds -> different worlds
  const C = makeWorld({ preset:"Chase", seed:43, N:512 });
  for (let i=0;i<120;i++) step(C);
  let diff = false; for (let i=0;i<A.N;i++) if (Math.abs(A.px[i]-C.px[i])>1e-9){ diff=true; break; }
  ok("different seeds diverge", diff);
}

console.log("\nstructure metric (dispersion)");
{
  // a uniform random cloud should have dispersion near 1 (Poisson)
  const N = 4000, counts = gridCounts({ N, px:Float32Array.from({length:N},()=>Math.random()),
    py:Float32Array.from({length:N},()=>Math.random()) }, 20);
  const dUniform = dispersion(counts, N);
  ok("uniform cloud disperses ~1 (got "+dUniform.toFixed(2)+")", dUniform < 2.0);

  // all particles jammed into one cell -> very high dispersion
  const px=new Float32Array(N).fill(0.5), py=new Float32Array(N).fill(0.5);
  const dClump = dispersion(gridCounts({N,px,py},20), N);
  ok("single clump disperses >> uniform (got "+dClump.toFixed(0)+")", dClump > 50*dUniform);
}

console.log("\nevaluate() interestingness");
{
  // exploded world: crank force way past the stable regime -> should score 0
  const X = makeWorldFromDNA({ k:3, phys:{reach:0.1,force:40,friction:0.7,beta:0.3,dt:0.05},
    m:[1,-1,1,-1,1,-1,1,-1,1], seed:1, N:1200 });
  const exX = evaluate(X, { settle:120, gap:40 });
  ok("exploded world scores 0", exX.score === 0, "(score "+exX.score+", speed "+exX.speed.toFixed(3)+")");

  // a structured preset should settle to positive structure
  const Y = makeWorld({ preset:"Crystal", seed:9, N:1600 });
  const evY = evaluate(Y, { settle:500, gap:60 });
  ok("structured preset scores > 0", evY.score > 0, "(score "+evY.score.toFixed(2)+", disp "+evY.dispersion.toFixed(1)+")");
  ok("structured preset is structured (disp>1.6)", evY.dispersion > 1.6);
}

console.log("\nPNG codec roundtrip");
{
  const w=17, h=9; const rgb=Buffer.alloc(w*h*3);
  for (let i=0;i<rgb.length;i++) rgb[i]=(i*37+11)&255;
  const dec = decodePNG(encodePNG(w,h,rgb));
  ok("dimensions preserved", dec.w===w && dec.h===h);
  ok("pixels preserved exactly", Buffer.compare(dec.rgb, rgb)===0);
}

console.log("\nAPNG structure");
{
  const w=8,h=8, frames=[];
  for (let f=0;f<5;f++){ const b=Buffer.alloc(w*h*3); b.fill(f*40); frames.push(b); }
  const apng = encodeAPNG(w,h,frames,20);
  let p=8, fctl=0, fdat=0, idat=0, declared=null;
  while (p<apng.length){ const len=apng.readUInt32BE(p); const t=apng.toString("ascii",p+4,p+8);
    if(t==="acTL") declared=apng.readUInt32BE(p+8);
    if(t==="fcTL") fctl++; if(t==="fdAT") fdat++; if(t==="IDAT") idat++;
    p+=12+len; if(t==="IEND") break; }
  ok("acTL frame count matches fcTL", declared===frames.length && fctl===frames.length);
  ok("exactly one IDAT, rest are fdAT", idat===1 && fdat===frames.length-1);
  ok("first frame decodes", decodePNG(apng).w===w);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
