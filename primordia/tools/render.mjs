#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   PRIMORDIA — CPU reference simulator + dependency-free PNG renderer.

   This is a faithful CPU port of the GPU sim shader's force law. Its job is to
   PROVE the emergence works (and to mint promo stills) without a browser. If
   clusters/membranes appear here, the WebGL shader — identical math — is sound.
   Run:  node tools/render.mjs
--------------------------------------------------------------------------- */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

/* ----------------------------- tiny PNG encoder (RGB, 8-bit) -------------- */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(w, h, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/* ----------------------------- world / params (mirror of GPU defaults) ---- */
const PALETTE = [
  [0.42,0.97,1.0],[0.70,0.55,1.0],[1.0,0.48,0.85],[0.55,1.0,0.72],
  [1.0,0.82,0.42],[0.40,0.70,1.0],[1.0,0.40,0.45],[0.80,1.0,0.40]];

function makeWorld(seed) {
  let s = seed >>> 0;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const K = 5, N = 4096;
  const P = {
    reach:    +(process.env.REACH ?? 0.10),
    force:    +(process.env.FORCE ?? 1.0),
    friction: +(process.env.FRIC  ?? 0.70),
    beta:     +(process.env.BETA  ?? 0.30),
    dt:       +(process.env.DT    ?? 0.02),
  };
  // "Cells" preset: strong self-attraction, mild cross-repulsion
  const M = new Float32Array(K * K);
  for (let i = 0; i < K; i++) for (let j = 0; j < K; j++)
    M[i*K+j] = i === j ? 0.9 : -0.35 + (rnd()*2-1)*0.25;
  const px = new Float32Array(N), py = new Float32Array(N);
  const vx = new Float32Array(N), vy = new Float32Array(N);
  const sp = new Uint8Array(N);
  for (let i = 0; i < N; i++) { px[i]=rnd(); py[i]=rnd(); sp[i]=(rnd()*K)|0; }
  return { K, N, P, M, px, py, vx, vy, sp, rnd };
}

function falloff(r, a, beta) {
  if (r < beta) return r/beta - 1;
  if (r < 1)    return a * (1 - Math.abs(2*r - 1 - beta)/(1 - beta));
  return 0;
}

/* spatial hash grid for O(N) neighbour search (toroidal) */
function step(W) {
  const { N, K, M, P, px, py, vx, vy, sp } = W;
  const reach = P.reach, cs = reach, dim = Math.max(3, Math.floor(1/cs));
  const cell = cs >= 1/dim ? 1/dim : cs;
  const heads = new Int32Array(dim*dim).fill(-1);
  const next = new Int32Array(N);
  const ci = i => {
    let cx = Math.floor(px[i]/ (1/dim)); let cy = Math.floor(py[i]/(1/dim));
    cx = ((cx%dim)+dim)%dim; cy = ((cy%dim)+dim)%dim; return cy*dim+cx;
  };
  for (let i = 0; i < N; i++) { const c = ci(i); next[i] = heads[c]; heads[c] = i; }
  const nfx = new Float32Array(N), nfy = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const xi = px[i], yi = py[i], si = sp[i];
    let cx = Math.floor(xi/(1/dim)), cy = Math.floor(yi/(1/dim));
    cx = ((cx%dim)+dim)%dim; cy = ((cy%dim)+dim)%dim;
    let fxs = 0, fys = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const gx = ((cx+ox)%dim+dim)%dim, gy = ((cy+oy)%dim+dim)%dim;
      let j = heads[gy*dim+gx];
      while (j !== -1) {
        if (j !== i) {
          let dx = px[j]-xi, dy = py[j]-yi;
          if (dx > 0.5) dx -= 1; else if (dx < -0.5) dx += 1;
          if (dy > 0.5) dy -= 1; else if (dy < -0.5) dy += 1;
          const r = Math.hypot(dx, dy);
          if (r > 1e-5 && r < reach) {
            const a = M[si*K + sp[j]];
            const f = falloff(r/reach, a, P.beta);
            fxs += dx/r * f; fys += dy/r * f;
          }
        }
        j = next[j];
      }
    }
    nfx[i] = fxs * reach * P.force; nfy[i] = fys * reach * P.force;
  }
  for (let i = 0; i < N; i++) {
    vx[i] = vx[i]*P.friction + nfx[i]*P.dt;
    vy[i] = vy[i]*P.friction + nfy[i]*P.dt;
    px[i] = (px[i] + vx[i]*P.dt) % 1; if (px[i] < 0) px[i] += 1;
    py[i] = (py[i] + vy[i]*P.dt) % 1; if (py[i] < 0) py[i] += 1;
  }
}

/* ----------------------------- glow renderer ------------------------------ */
function renderFrame(W, S) {
  const { N, px, py, sp } = W;
  const acc = new Float32Array(S*S*3);
  const R = 3; // splat radius (px)
  for (let i = 0; i < N; i++) {
    const cxf = px[i]*S, cyf = (1-py[i])*S;
    const cx = cxf|0, cy = cyf|0;
    const col = PALETTE[sp[i]];
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = cx+dx, y = cy+dy; if (x<0||y<0||x>=S||y>=S) continue;
      const d2 = (dx)*(dx)+(dy)*(dy);
      const g = Math.exp(-d2/3.0)*0.9;
      const o = (y*S+x)*3;
      acc[o]+=col[0]*g; acc[o+1]+=col[1]*g; acc[o+2]+=col[2]*g;
    }
  }
  // ACES tonemap -> 8-bit
  const out = Buffer.alloc(S*S*3);
  const aces = x => { const v=(x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14);
    return Math.max(0,Math.min(1,v)); };
  for (let i = 0; i < S*S; i++) {
    out[i*3]   = Math.round(aces(acc[i*3]*1.1)*255);
    out[i*3+1] = Math.round(aces(acc[i*3+1]*1.1)*255);
    out[i*3+2] = Math.round(aces(acc[i*3+2]*1.1)*255);
  }
  return out;
}

/* compose a horizontal contact strip of several frames with gutters */
function strip(frames, S, gut) {
  const cols = frames.length;
  const W = cols*S + (cols+1)*gut, H = S + 2*gut;
  const buf = Buffer.alloc(W*H*3); // black
  frames.forEach((f, k) => {
    const x0 = gut + k*(S+gut), y0 = gut;
    for (let y = 0; y < S; y++)
      f.copy(buf, ((y0+y)*W + x0)*3, y*S*3, (y+1)*S*3);
  });
  return { buf, W, H };
}

/* measure clustering: mean nearest-neighbour gap shrinks as structure forms */
function order(W) {
  const { N, px, py } = W; let acc = 0; const SAMP = 400;
  for (let s = 0; s < SAMP; s++) {
    const i = (Math.random()*N)|0; let best = 9;
    for (let t = 0; t < 200; t++) { const j = (Math.random()*N)|0; if (j===i) continue;
      let dx=px[j]-px[i], dy=py[j]-py[i];
      if(dx>0.5)dx-=1;else if(dx<-0.5)dx+=1; if(dy>0.5)dy-=1;else if(dy<-0.5)dy+=1;
      const r=dx*dx+dy*dy; if(r<best)best=r; }
    acc += Math.sqrt(best);
  }
  return acc/SAMP;
}

/* ----------------------------- main --------------------------------------- */
const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "stills");
fs.mkdirSync(outDir, { recursive: true });

const SEED = Number(process.argv[2]) || 0xC0FFEE;
const S = 460;
const W = makeWorld(SEED);
console.log(`PRIMORDIA reference sim — seed ${SEED.toString(16)}, N=${W.N}, K=${W.K}`);

const captureAt = (process.env.CAPS || "0,300,900,1800,3200").split(",").map(Number);
const frames = [];
let stepNo = 0;
const t0 = Date.now();
for (let c = 0; c < captureAt.length; c++) {
  while (stepNo < captureAt[c]) { step(W); stepNo++; }
  const f = renderFrame(W, S);
  frames.push(f);
  fs.writeFileSync(path.join(outDir, `frame_${String(captureAt[c]).padStart(4,"0")}.png`), encodePNG(S, S, f));
  console.log(`  step ${String(captureAt[c]).padStart(4)}  ·  spread ${(order(W)).toFixed(4)}  ·  captured`);
}
const st = strip(frames, S, 14);
fs.writeFileSync(path.join(outDir, "emergence.png"), encodePNG(st.W, st.H, st.buf));
console.log(`\nDone in ${((Date.now()-t0)/1000).toFixed(1)}s → stills/emergence.png  (${st.W}×${st.H})`);
console.log("Frames left→right: order from primordial soup into self-organized cells.");
