/* ---------------------------------------------------------------------------
   PRIMORDIA — shared CPU reference core (sim + PNG). Imported by render.mjs,
   preset.mjs, montage.mjs. Faithful port of the GPU sim shader's force law so
   that "does it actually self-organize?" can be answered without a browser.
--------------------------------------------------------------------------- */
import zlib from "node:zlib";

/* ----------------------------- PNG encoder (RGB, 8-bit) ------------------- */
const CRC = (() => { const t = new Uint32Array(256);
  for (let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xedb88320^(c>>>1):c>>>1; t[n]=c>>>0; }
  return t; })();
function crc32(b){ let c=0xffffffff; for(let i=0;i<b.length;i++) c=CRC[(c^b[i])&0xff]^(c>>>8); return (c^0xffffffff)>>>0; }
function chunk(type,data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const t=Buffer.from(type,"ascii"); const crc=Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0); return Buffer.concat([len,t,data,crc]); }
export function encodePNG(w,h,rgb){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]); const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=2;
  const raw=Buffer.alloc(h*(w*3+1));
  for(let y=0;y<h;y++){ raw[y*(w*3+1)]=0; rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3); }
  const idat=zlib.deflateSync(raw,{level:9});
  return Buffer.concat([sig,chunk("IHDR",ihdr),chunk("IDAT",idat),chunk("IEND",Buffer.alloc(0))]);
}

export const PALETTE = [
  [0.42,0.97,1.0],[0.70,0.55,1.0],[1.0,0.48,0.85],[0.55,1.0,0.72],
  [1.0,0.82,0.42],[0.40,0.70,1.0],[1.0,0.40,0.45],[0.80,1.0,0.40]];

function mulberry(seed){ let s=seed>>>0; return ()=>{ s|=0; s=s+0x6D2B79F5|0;
  let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

/* ----------------------------- matrix builders (mirror index.html) -------- */
function clamp1(x){ return Math.max(-1,Math.min(1,+x.toFixed(3))); }
export const MATRIX = {
  sym(K,r,self=0.9,cross=-0.35,jit=0.25){ const M=new Float32Array(K*K);
    for(let i=0;i<K;i++)for(let j=0;j<K;j++) M[i*K+j]=clamp1(i===j?self:cross+(r()*2-1)*jit); return M; },
  antisym(K,r,scale=0.7){ const M=new Float32Array(K*K);
    for(let i=0;i<K;i++)for(let j=0;j<K;j++){ if(i===j)M[i*K+j]=0.1;
      else if(j>i){ const v=clamp1((r()*2-1)*scale); M[i*K+j]=v; M[j*K+i]=-v; } } return M; },
  allPositive(K,r,lo=0.5,hi=0.9){ const M=new Float32Array(K*K);
    for(let i=0;i<K;i++)for(let j=0;j<K;j++) M[i*K+j]=lo+r()*(hi-lo); return M; },
  alternating(K,r,s=0.85){ const M=new Float32Array(K*K);
    for(let i=0;i<K;i++)for(let j=0;j<K;j++) M[i*K+j]=((i+j)%2?-1:1)*s*(0.6+r()*0.4); return M; },
  chain(K,r){ const M=new Float32Array(K*K);
    for(let i=0;i<K;i++)for(let j=0;j<K;j++){ if(j===(i+1)%K)M[i*K+j]=0.9;
      else if(i===j)M[i*K+j]=-0.2; else M[i*K+j]=clamp1(-0.1+(r()*2-1)*0.2); } return M; },
  random(K,r){ const M=new Float32Array(K*K);
    for(let i=0;i<K;i++)for(let j=0;j<K;j++) M[i*K+j]=clamp1(r()*2-1); return M; },
};

/* ----------------------------- preset table (mirror index.html) ----------- */
export const PRESETS = {
  Cells:   { K:5, P:{reach:0.10, force:1.0, friction:0.70, beta:0.30, dt:0.020}, m:r=>MATRIX.sym(5,r) },
  Chase:   { K:4, P:{reach:0.12, force:1.2, friction:0.78, beta:0.22, dt:0.022}, m:r=>MATRIX.antisym(4,r) },
  Swarm:   { K:3, P:{reach:0.14, force:1.0, friction:0.86, beta:0.18, dt:0.026}, m:r=>MATRIX.allPositive(3,r) },
  Crystal: { K:6, P:{reach:0.072,force:1.7, friction:0.66, beta:0.34, dt:0.016}, m:r=>MATRIX.alternating(6,r) },
  Veins:   { K:4, P:{reach:0.10, force:1.3, friction:0.78, beta:0.28, dt:0.020}, m:r=>MATRIX.chain(4,r) },
  Chaos:   { K:5, P:{reach:0.10, force:1.3, friction:0.76, beta:0.26, dt:0.020}, m:r=>MATRIX.random(5,r) },
};

export function makeWorld({ preset="Cells", seed=0xC0FFEE, N=4096 }){
  const def = PRESETS[preset]; const r = mulberry(seed);
  const K = def.K, P = { ...def.P }, M = def.m(r);
  const px=new Float32Array(N), py=new Float32Array(N);
  const vx=new Float32Array(N), vy=new Float32Array(N), sp=new Uint8Array(N);
  for(let i=0;i<N;i++){ px[i]=r(); py[i]=r(); sp[i]=(r()*K)|0; }
  return { preset, K, N, P, M, px, py, vx, vy, sp };
}

/* a fully random world in the stable regime — the raw material of evolution */
export function makeRandomWorld({ seed=Date.now(), N=2048 }){
  const r = mulberry(seed);
  const K = 3 + ((r()*4)|0); // 3..6
  const P = {
    reach:    0.085 + r()*0.045,
    force:    0.9  + r()*0.9,
    friction: 0.68 + r()*0.16,
    beta:     0.22 + r()*0.14,
    dt:       0.017 + r()*0.008,
  };
  const M = MATRIX.random(K, r);
  const px=new Float32Array(N), py=new Float32Array(N);
  const vx=new Float32Array(N), vy=new Float32Array(N), sp=new Uint8Array(N);
  for(let i=0;i<N;i++){ px[i]=r(); py[i]=r(); sp[i]=(r()*K)|0; }
  return { preset:"Random", seed, K, N, P, M, px, py, vx, vy, sp };
}

/* coarse per-cell occupancy grid (toroidal) */
export function gridCounts(W, G=20){
  const { N, px, py } = W; const c = new Float32Array(G*G);
  for(let i=0;i<N;i++){ let gx=(px[i]*G)|0, gy=(py[i]*G)|0;
    if(gx>=G)gx=G-1; if(gy>=G)gy=G-1; c[gy*G+gx]++; }
  return c;
}
/* index of dispersion: ~1 for uniform/random or exploded; >>1 for real structure */
export function dispersion(counts, N){
  const G2=counts.length; const mean=N/G2; let v=0;
  for(let i=0;i<G2;i++){ const d=counts[i]-mean; v+=d*d; }
  return (v/G2)/Math.max(mean,1e-6);
}
export function meanSpeed(W){ const { N,vx,vy }=W; let s=0;
  for(let i=0;i<N;i++) s+=Math.hypot(vx[i],vy[i]); return s/N; }

/* Score a world by how *alive and structured* it is. Researched in tools/evolve.mjs:
   - dispersion separates real structure from gas/explosion (both score ~1)
   - temporal change rewards ongoing motion (penalizes frozen AND chaotic)        */
export function evaluate(W, { settle=460, gap=60, G=20 } = {}){
  for(let i=0;i<settle;i++) step(W);
  const A = gridCounts(W, G);
  for(let i=0;i<gap;i++) step(W);
  const B = gridCounts(W, G);
  let tc=0; for(let i=0;i<B.length;i++) tc+=Math.abs(B[i]-A[i]);
  tc /= W.N;                                  // 0=frozen, large=churning
  const D = dispersion(B, W.N);
  const spd = meanSpeed(W);
  const exploded = spd > 0.02;                // ran away
  const aliveBell = Math.exp(-Math.pow((tc-0.22)/0.30, 2));   // peak at gentle churn
  const score = exploded ? 0 : Math.log(1+D) * (0.35 + 0.65*aliveBell);
  return { score, dispersion:D, temporal:tc, speed:spd };
}

/* build a world from explicit DNA (k, physics, matrix) — used by the bestiary tool */
export function makeWorldFromDNA({ k, phys, m, seed=1, N=3000 }){
  const r = mulberry(seed); const K = k; const P = { ...phys };
  const M = new Float32Array(K*K); for (let i=0;i<m.length;i++) M[i]=m[i];
  const px=new Float32Array(N), py=new Float32Array(N);
  const vx=new Float32Array(N), vy=new Float32Array(N), sp=new Uint8Array(N);
  for (let i=0;i<N;i++){ px[i]=r(); py[i]=r(); sp[i]=(r()*K)|0; }
  return { preset:"DNA", K, N, P, M, px, py, vx, vy, sp };
}

export function falloff(r,a,beta){
  if(r<beta) return r/beta-1;
  if(r<1)    return a*(1-Math.abs(2*r-1-beta)/(1-beta));
  return 0;
}

/* spatial-hash step, toroidal */
export function step(W){
  const { N,K,M,P,px,py,vx,vy,sp }=W; const reach=P.reach;
  const dim=Math.max(3,Math.floor(1/reach)); const inv=1/dim;
  const heads=new Int32Array(dim*dim).fill(-1); const next=new Int32Array(N);
  for(let i=0;i<N;i++){ let cx=Math.floor(px[i]/inv),cy=Math.floor(py[i]/inv);
    cx=((cx%dim)+dim)%dim; cy=((cy%dim)+dim)%dim; const c=cy*dim+cx; next[i]=heads[c]; heads[c]=i; }
  const nfx=new Float32Array(N), nfy=new Float32Array(N);
  for(let i=0;i<N;i++){ const xi=px[i],yi=py[i],si=sp[i];
    let cx=Math.floor(xi/inv),cy=Math.floor(yi/inv); cx=((cx%dim)+dim)%dim; cy=((cy%dim)+dim)%dim;
    let fxs=0,fys=0;
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
      const gx=((cx+ox)%dim+dim)%dim, gy=((cy+oy)%dim+dim)%dim; let j=heads[gy*dim+gx];
      while(j!==-1){ if(j!==i){ let dx=px[j]-xi,dy=py[j]-yi;
        if(dx>0.5)dx-=1;else if(dx<-0.5)dx+=1; if(dy>0.5)dy-=1;else if(dy<-0.5)dy+=1;
        const rr=Math.hypot(dx,dy);
        if(rr>1e-5&&rr<reach){ const a=M[si*K+sp[j]]; const f=falloff(rr/reach,a,P.beta);
          fxs+=dx/rr*f; fys+=dy/rr*f; } } j=next[j]; }
    }
    nfx[i]=fxs*reach*P.force; nfy[i]=fys*reach*P.force;
  }
  for(let i=0;i<N;i++){ vx[i]=vx[i]*P.friction+nfx[i]*P.dt; vy[i]=vy[i]*P.friction+nfy[i]*P.dt;
    px[i]=(px[i]+vx[i]*P.dt)%1; if(px[i]<0)px[i]+=1; py[i]=(py[i]+vy[i]*P.dt)%1; if(py[i]<0)py[i]+=1; }
}

export function renderFrame(W,S,gain=1.1){
  const { N,px,py,sp }=W; const acc=new Float32Array(S*S*3); const R=3;
  for(let i=0;i<N;i++){ const cx=(px[i]*S)|0, cy=((1-py[i])*S)|0; const col=PALETTE[sp[i]];
    for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){ const x=cx+dx,y=cy+dy;
      if(x<0||y<0||x>=S||y>=S)continue; const g=Math.exp(-(dx*dx+dy*dy)/3.0)*0.9; const o=(y*S+x)*3;
      acc[o]+=col[0]*g; acc[o+1]+=col[1]*g; acc[o+2]+=col[2]*g; } }
  const out=Buffer.alloc(S*S*3);
  const aces=x=>{ const v=(x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14); return Math.max(0,Math.min(1,v)); };
  for(let i=0;i<S*S;i++){ out[i*3]=Math.round(aces(acc[i*3]*gain)*255);
    out[i*3+1]=Math.round(aces(acc[i*3+1]*gain)*255); out[i*3+2]=Math.round(aces(acc[i*3+2]*gain)*255); }
  return out;
}

/* mean nearest-of-sample distance — shrinks as structure forms */
export function order(W){ const { N,px,py }=W; let acc=0; const SAMP=400;
  for(let s=0;s<SAMP;s++){ const i=(Math.random()*N)|0; let best=9;
    for(let t=0;t<200;t++){ const j=(Math.random()*N)|0; if(j===i)continue;
      let dx=px[j]-px[i],dy=py[j]-py[i]; if(dx>0.5)dx-=1;else if(dx<-0.5)dx+=1;
      if(dy>0.5)dy-=1;else if(dy<-0.5)dy+=1; const r=dx*dx+dy*dy; if(r<best)best=r; }
    acc+=Math.sqrt(best); } return acc/SAMP; }
