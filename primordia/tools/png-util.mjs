/* Shared: minimal PNG decoder (our own 8-bit RGB, filter-0 files) + 5x7 font
   + a hand-rolled APNG (animated PNG) encoder. */
import zlib from "node:zlib";

const CRC_T = (() => { const t=new Uint32Array(256);
  for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xedb88320^(c>>>1):c>>>1; t[n]=c>>>0; }
  return t; })();
function crc32(b){ let c=0xffffffff; for(let i=0;i<b.length;i++) c=CRC_T[(c^b[i])&0xff]^(c>>>8); return (c^0xffffffff)>>>0; }
function mkChunk(type, data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const t=Buffer.from(type,"ascii"); const crc=Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0); return Buffer.concat([len,t,data,crc]); }
function filtered(w,h,rgb){ const raw=Buffer.alloc(h*(w*3+1));
  for(let y=0;y<h;y++){ raw[y*(w*3+1)]=0; rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3); } return raw; }

/* frames: array of RGB Buffers (w*h*3). Infinite loop, fps frame rate. */
export function encodeAPNG(w, h, frames, fps=20){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=2;
  const actl=Buffer.alloc(8); actl.writeUInt32BE(frames.length,0); actl.writeUInt32BE(0,4); // 0 = loop forever
  const out=[sig, mkChunk("IHDR",ihdr), mkChunk("acTL",actl)];
  let seq=0;
  const fcTL=(idx)=>{ const b=Buffer.alloc(26);
    b.writeUInt32BE(seq++,0); b.writeUInt32BE(w,4); b.writeUInt32BE(h,8);
    b.writeUInt32BE(0,12); b.writeUInt32BE(0,16);
    b.writeUInt16BE(1,20); b.writeUInt16BE(fps,22);   // delay = 1/fps seconds
    b[24]=0; b[25]=0; return mkChunk("fcTL",b); };
  frames.forEach((rgb, idx)=>{
    out.push(fcTL(idx));
    const comp=zlib.deflateSync(filtered(w,h,rgb),{level:9});
    if(idx===0){ out.push(mkChunk("IDAT",comp)); }
    else { const sn=Buffer.alloc(4); sn.writeUInt32BE(seq++,0);
      out.push(mkChunk("fdAT", Buffer.concat([sn,comp]))); }
  });
  out.push(mkChunk("IEND",Buffer.alloc(0)));
  return Buffer.concat(out);
}

export function decodePNG(buf){
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

export const FONT = {
  " ":["00000","00000","00000","00000","00000","00000","00000"],
  ".":["00000","00000","00000","00000","00000","00110","00110"],
  "x":["00000","00000","10001","01010","00100","01010","10001"],
  A:["01110","10001","10001","11111","10001","10001","10001"],
  B:["11110","10001","10001","11110","10001","10001","11110"],
  C:["01110","10001","10000","10000","10000","10001","01110"],
  D:["11110","10001","10001","10001","10001","10001","11110"],
  E:["11111","10000","10000","11110","10000","10000","11111"],
  F:["11111","10000","10000","11110","10000","10000","10000"],
  G:["01110","10001","10000","10111","10001","10001","01111"],
  H:["10001","10001","10001","11111","10001","10001","10001"],
  I:["11111","00100","00100","00100","00100","00100","11111"],
  K:["10001","10010","10100","11000","10100","10010","10001"],
  L:["10000","10000","10000","10000","10000","10000","11111"],
  M:["10001","11011","10101","10101","10001","10001","10001"],
  N:["10001","11001","10101","10011","10001","10001","10001"],
  O:["01110","10001","10001","10001","10001","10001","01110"],
  P:["11110","10001","10001","11110","10000","10000","10000"],
  R:["11110","10001","10001","11110","10100","10010","10001"],
  S:["01111","10000","10000","01110","00001","00001","11110"],
  T:["11111","00100","00100","00100","00100","00100","00100"],
  U:["10001","10001","10001","10001","10001","10001","01110"],
  V:["10001","10001","10001","10001","10001","01010","00100"],
  W:["10001","10001","10001","10101","10101","11011","10001"],
  Y:["10001","10001","01010","00100","00100","00100","00100"],
  "0":["01110","10001","10011","10101","11001","10001","01110"],
  "1":["00100","01100","00100","00100","00100","00100","01110"],
  "2":["01110","10001","00001","00010","00100","01000","11111"],
  "3":["11110","00001","00001","01110","00001","00001","11110"],
  "4":["00010","00110","01010","10010","11111","00010","00010"],
  "5":["11111","10000","11110","00001","00001","10001","01110"],
  "6":["00110","01000","10000","11110","10001","10001","01110"],
  "7":["11111","00001","00010","00100","01000","01000","01000"],
  "8":["01110","10001","10001","01110","10001","10001","01110"],
  "9":["01110","10001","10001","01111","00001","00010","01100"],
};

export function drawText(buf, W, x, y, text, scale, rgb){
  text = String(text).toUpperCase();
  for (let ci=0; ci<text.length; ci++){
    const g = FONT[text[ci]] || FONT[" "];
    for (let r=0;r<7;r++) for (let c=0;c<5;c++) if (g[r][c]==="1")
      for (let sy=0;sy<scale;sy++) for (let sx=0;sx<scale;sx++){
        const px=x+(ci*6+c)*scale+sx, py=y+r*scale+sy;
        if(px<0||py<0||px>=W) continue;
        const o=(py*W+px)*3; if(o>=0&&o+2<buf.length){ buf[o]=rgb[0]; buf[o+1]=rgb[1]; buf[o+2]=rgb[2]; }
      }
  }
}
