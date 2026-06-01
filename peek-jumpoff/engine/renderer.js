/* ============================================================================
   SITE STAMPER · renderer.js  —  ThemeSpec + IR  ->  a real themed site
   Builds scene, hero archetype, section archetypes, and the live mobile
   interaction system (slide-in menu, tap detail-sheet, sticky action bar).
   ============================================================================ */
(function (G) {
  'use strict';
  const { MOTIFS, FONT_SPECS, fontStack } = G.STAMP;

  /* ---- tiny DOM helper ---------------------------------------------------- */
  function el(tag, props, kids){
    const n = document.createElement(tag);
    if (props) for (const k in props){
      if (k==='style') n.setAttribute('style', props[k]);
      else if (k==='html') n.innerHTML = props[k];
      else if (k==='class') n.className = props[k];
      else if (k.startsWith('on') && typeof props[k]==='function') n.addEventListener(k.slice(2), props[k]);
      else if (k.startsWith('data')) n.setAttribute(k.replace(/([A-Z])/g,'-$1').toLowerCase(), props[k]);
      else n.setAttribute(k, props[k]);
    }
    (kids||[]).forEach(c=>{ if(c==null) return; n.appendChild(typeof c==='string'?document.createTextNode(c):c); });
    return n;
  }
  const rgba = (hex,a)=>{ hex=hex.replace('#',''); if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');
    return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${a})`; };

  /* ---- font loading ------------------------------------------------------- */
  let loadedFonts = new Set();
  function ensureFonts(spec){
    const fam = [spec.tokens.font.display, spec.tokens.font.body, spec.tokens.font.accent];
    const need = [...new Set(fam)].filter(f=>FONT_SPECS[f] && !loadedFonts.has(f));
    if (!need.length) return;
    need.forEach(f=>loadedFonts.add(f));
    const q = [...loadedFonts].filter(f=>FONT_SPECS[f]).map(f=>'family='+FONT_SPECS[f]).join('&');
    let link = document.getElementById('stamp-fonts');
    if (!link){ link = el('link',{id:'stamp-fonts',rel:'stylesheet'}); document.head.appendChild(link); }
    link.href = 'https://fonts.googleapis.com/css2?'+q+'&display=swap';
  }

  /* ---- global keyframes (once) ------------------------------------------- */
  function injectGlobal(){
    if (document.getElementById('stamp-kf')) return;
    const s = el('style',{id:'stamp-kf'}); s.textContent = `
    @keyframes st-spin{to{transform:rotate(360deg)}}
    @keyframes st-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
    @keyframes st-drift{0%{transform:translate(0,0)}50%{transform:translate(12px,-8px)}100%{transform:translate(0,0)}}
    @keyframes st-tw{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
    @keyframes st-grid{to{background-position:0 40px}}
    @keyframes st-rise{to{transform:translateY(-120%);opacity:0}}
    @keyframes st-conf{to{transform:translateY(125%) rotate(540deg);opacity:.15}}
    @keyframes st-marq{to{transform:translateX(-50%)}}
    .st-reveal{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
    .st-reveal.in{opacity:1;transform:none}
    @media (prefers-reduced-motion:reduce){.st-reveal{transition:none}*{animation-duration:.001ms!important}}`;
    document.head.appendChild(s);
  }

  /* ---- placeholder media -------------------------------------------------- */
  function media(t, ar, src){
    const box = el('div',{class:'st-media', style:`position:relative;width:100%;aspect-ratio:${ar||'4/3'};border-radius:10px;overflow:hidden;
      background:linear-gradient(150deg, ${t.color.accent}, ${t.color.accent2});`},[
      el('div',{style:`position:absolute;inset:0;opacity:.18;mix-blend-mode:overlay;
        background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`}),
      el('div',{style:`position:absolute;inset:0;background:radial-gradient(120% 80% at 30% 0,${rgba('#ffffff',.28)},transparent 60%)`})
    ]);
    // fal-ready: drop a real generated/uploaded image into the slot; gradient is the fallback
    if (src){ const img = el('img',{src:src, loading:'lazy', style:'position:absolute;inset:0;width:100%;height:100%;object-fit:cover'}); box.insertBefore(img, box.firstChild); }
    return box;
  }
  /* ---- frame wrappers ----------------------------------------------------- */
  function frameMedia(name, t, img){
    if (name==='vinyl') return el('div',{style:'display:flex;justify-content:center;padding:6px 0'},[
      el('div',{style:`width:230px;height:230px;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 2px,#1c1c1c 2px 4px);position:relative;animation:st-spin 14s linear infinite;box-shadow:0 18px 44px ${rgba('#000',.5)}`},[
        el('div',{style:`position:absolute;inset:34%;border-radius:50%;overflow:hidden;background:linear-gradient(150deg,${t.color.accent},${t.color.accent2});box-shadow:0 0 0 4px ${rgba('#000',.5)}`},[ img?el('img',{src:img,style:'width:100%;height:100%;object-fit:cover'}):null ])])]);
    if (name==='porthole') return el('div',{style:'display:flex;justify-content:center;padding:4px 0'},[
      el('div',{style:`width:210px;height:210px;border-radius:50%;position:relative;overflow:hidden;
        box-shadow:inset 0 0 0 9px #1a222c,inset 0 0 36px #000,0 0 0 13px #11181f,0 0 50px ${rgba(t.color.accent2,.4)}`},[media(t,'1/1',img)])]);
    if (name==='polaroid') return el('div',{style:'display:flex;justify-content:center;padding:8px 0'},[
      el('div',{style:`background:#fff;padding:9px 9px 34px;box-shadow:0 14px 30px ${rgba('#000',.22)};transform:rotate(-3deg);max-width:230px`},[media(t,'1/1',img)])]);
    if (name==='arch'){ const m=media(t,'3/4',img); m.style.borderRadius='50% 50% 8px 8px/60% 60% 8px 8px'; return el('div',{style:'padding:2px 6px'},[m]); }
    if (name==='locket') { const m=media(t,'3/4',img); m.style.borderRadius='48%'; return el('div',{style:'display:flex;justify-content:center'},[
      el('div',{style:`padding:5px;border-radius:48%;box-shadow:0 0 0 5px ${t.color.accent},0 0 0 8px ${t.color.surface},0 12px 26px ${rgba('#000',.25)};max-width:200px`},[m])]); }
    if (name==='idcard') return el('div',{style:`display:grid;grid-template-columns:80px 1fr;gap:10px;background:${t.color.surface};border:1px solid ${t.color.line};border-radius:10px;padding:10px;font-family:${fontStack(t.font.accent)}`},[
      media(t,'1/1',img), el('div',{html:`<div style="font-size:10px;letter-spacing:.16em;color:var(--muted)">BACKSTAGE</div><div style="font-size:18px;color:var(--ink);margin-top:4px">ALL ACCESS</div><div style="font-size:11px;color:var(--muted);margin-top:6px">NO. 0042 · ZONE A</div>`})]);
    return media(t,'4/3',img);
  }

  /* ---- SCENES ------------------------------------------------------------- */
  function scene(name, t){
    const wrap = el('div',{class:'st-scene', style:'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0'});
    const A=t.color.accent, A2=t.color.accent2, INK=t.color.ink;
    if (name==='starfield'){
      wrap.innerHTML = `<div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 70% 0,${rgba(A2,.18)},transparent 55%)"></div>`;
      const s1=el('div',{style:`position:absolute;inset:-50%;background-image:radial-gradient(1.5px 1.5px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 60%,#cfe0ff,transparent),radial-gradient(1.5px 1.5px at 40% 80%,#fff,transparent),radial-gradient(1px 1px at 85% 20%,#fff,transparent);background-size:300px 300px;animation:st-drift 30s linear infinite`});
      wrap.appendChild(s1);
    } else if (name==='gridfloor'){
      wrap.appendChild(el('div',{style:`position:absolute;left:-40%;right:-40%;bottom:-20%;height:62%;transform:rotateX(72deg);transform-origin:bottom;
        background:repeating-linear-gradient(0deg,transparent 0 38px,${rgba(A2,.5)} 38px 40px),repeating-linear-gradient(90deg,transparent 0 38px,${rgba(A,.5)} 38px 40px);
        animation:st-grid 1.6s linear infinite;-webkit-mask-image:linear-gradient(#000,transparent);mask-image:linear-gradient(#000,transparent)`}));
    } else if (name==='rayfan'){
      wrap.appendChild(el('div',{style:`position:absolute;inset:-20%;background:repeating-conic-gradient(from 0deg at 50% 35%,${rgba(A,.16)} 0 6deg,transparent 6deg 13deg)`}));
    } else if (name==='sunburst'){
      wrap.appendChild(el('div',{style:`position:absolute;top:-30%;left:50%;width:320px;height:320px;transform:translateX(-50%);background:repeating-conic-gradient(from 0deg,${rgba(A,.22)} 0 9deg,${rgba(A2,.1)} 9deg 18deg);-webkit-mask-image:radial-gradient(circle,#000 58%,transparent 72%);mask-image:radial-gradient(circle,#000 58%,transparent 72%)`}));
    } else if (name==='scanlines'){
      wrap.appendChild(el('div',{style:`position:absolute;inset:0;background:repeating-linear-gradient(transparent 0 2px,${rgba('#000',.16)} 2px 3px);mix-blend-mode:${t.color.mode==='dark'?'screen':'multiply'};opacity:.5`}));
    } else if (name==='mirrorball'){
      wrap.appendChild(el('div',{style:`position:absolute;top:14px;left:50%;width:96px;height:96px;margin-left:-48px;border-radius:50%;
        background-image:repeating-conic-gradient(from 0deg,#aab4c4 0 9deg,#eef3fa 9deg 18deg),repeating-linear-gradient(${rgba('#000',.2)} 0 6px,transparent 6px 12px);
        box-shadow:0 0 36px ${rgba(A2,.5)};animation:st-spin 8s linear infinite`}));
    } else if (name==='mesh'){
      wrap.appendChild(el('div',{style:`position:absolute;inset:0;background:radial-gradient(40% 50% at 18% 16%,${rgba(A,.35)},transparent),radial-gradient(40% 50% at 82% 8%,${rgba(A2,.35)},transparent),radial-gradient(50% 60% at 60% 86%,${rgba(A,.22)},transparent);animation:st-drift 20s ease-in-out infinite`}));
    } else if (name==='halftone'){
      wrap.appendChild(el('div',{style:`position:absolute;inset:0;opacity:.5;background-image:radial-gradient(circle,${rgba(INK,.5)} 1.4px,transparent 1.6px);background-size:12px 12px`}));
    } else if (name==='blueprint'){
      wrap.appendChild(el('div',{style:`position:absolute;inset:0;background-image:linear-gradient(${rgba('#fff',.08)} 1px,transparent 1px),linear-gradient(90deg,${rgba('#fff',.08)} 1px,transparent 1px);background-size:28px 28px`}));
    } else if (name==='topo'){
      wrap.appendChild(el('div',{style:`position:absolute;inset:0;opacity:.6;background-image:repeating-radial-gradient(circle at 30% 30%,transparent 0 18px,${rgba(INK,.05)} 18px 19px)`}));
    } else if (name==='confetti'){
      for (let i=0;i<14;i++){ const c=[A,A2,INK][i%3];
        wrap.appendChild(el('div',{style:`position:absolute;top:${-10-Math.random()*30}%;left:${Math.random()*100}%;width:7px;height:12px;border-radius:2px;background:${c};animation:st-conf ${3+Math.random()*3}s linear ${Math.random()*3}s infinite`})); }
    } else if (name==='bubbles'){
      for (let i=0;i<10;i++){ const d=10+Math.random()*22;
        wrap.appendChild(el('div',{style:`position:absolute;bottom:-10%;left:${Math.random()*100}%;width:${d}px;height:${d}px;border-radius:50%;border:1px solid ${rgba('#fff',.5)};background:${rgba('#fff',.08)};animation:st-rise ${6+Math.random()*5}s linear ${Math.random()*4}s infinite`})); }
    }
    // grain everywhere on textured palettes
    if (name==='grain' || t.color.texture){
      wrap.appendChild(el('div',{style:`position:absolute;inset:0;opacity:.06;mix-blend-mode:${t.color.mode==='dark'?'screen':'multiply'};background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`}));
    }
    return wrap;
  }

  function motifRow(spec, t, color){
    const m = spec.motifs.slice(0,3).map(k=>MOTIFS[k]?MOTIFS[k](16):'').join('');
    return el('div',{style:`display:flex;gap:10px;justify-content:center;color:${color||t.color.accent};${spec.tokens.color.glow?`filter:drop-shadow(0 0 6px ${t.color.accent})`:''}`, html:m});
  }

  G.STAMP.renderer = { renderSite, ensureFonts };

  /* ---- HERO --------------------------------------------------------------- */
  function hero(spec, ir, t){
    const big = Math.round(46*t.font.scaleRatio/1.25);
    const scriptish = /Dancing Script|Pinyon|Monoton|Shrikhand|Cinzel Decorative|Cormorant/.test(t.font.display);
    const lh = scriptish ? 1.16 : 1.06;
    const head = el('h1',{style:`margin:0;font-family:${fontStack(t.font.display)};font-weight:700;line-height:${lh};
      font-size:${big}px;letter-spacing:${t.font.displayTracking};color:${t.color.ink};${spec.tokens.color.glow?`text-shadow:0 0 18px ${rgba(t.color.accent,.55)}`:''}`,
      html: (ir.headline||'').replace(/\n/g,'<br>')});
    const eyebrow = el('div',{style:`font-family:${fontStack(t.font.body)};font-size:11px;font-weight:700;letter-spacing:${t.font.eyebrowTracking};color:${t.color.accent};margin-bottom:14px`,html:ir.eyebrow});
    const dek = el('p',{style:`font-family:${fontStack(t.font.body)};font-size:15px;line-height:1.55;color:${t.color.muted};margin:18px 0 0;max-width:30em`,html:ir.dek});

    if (spec.hero==='framed-media'){
      return el('section',{class:'st-hero st-reveal', style:pad(t)+'position:relative;z-index:1'},[
        eyebrow, head, dek, el('div',{style:'margin-top:24px'},[frameMedia(spec.frame,t,ir.heroImg)]), el('div',{style:'margin-top:20px'},[motifRow(spec,t)])]);
    }
    if (spec.hero==='centered'){
      const dekC = dek; dekC.style.cssText += ';margin-left:auto;margin-right:auto';
      return el('section',{class:'st-hero st-reveal', style:pad(t)+'position:relative;z-index:1;text-align:center'},[
        el('div',{style:'margin-bottom:16px'},[motifRow(spec,t)]),
        eyebrow, head, dekC,
        el('div',{style:'margin-top:26px;display:flex;justify-content:center'},[frameMedia(spec.frame==='idcard'?'locket':spec.frame,t,ir.heroImg)])]);
    }
    // type-mega
    const mega = el('h1',{style:`margin:0;font-family:${fontStack(t.font.display)};font-weight:800;line-height:${scriptish?1.08:.96};
      font-size:${Math.round(big*1.16)}px;letter-spacing:${t.font.displayTracking};color:${t.color.ink};text-transform:${/Cinzel|Marcellus|Saira|Orbitron|Bebas|Anton/.test(t.font.display)?'uppercase':'none'};${spec.tokens.color.glow?`text-shadow:0 0 22px ${rgba(t.color.accent,.6)}`:''}`,
      html:(ir.headline||'').replace(/\n/g,'<br>')});
    const megaContent = [eyebrow, mega, dek, el('div',{style:'margin-top:24px'},[motifRow(spec,t)])];
    // uploaded/generated photo → full-bleed hero with type over a scrim (so a gallery pic always features)
    if (ir.heroImg){
      return el('section',{class:'st-hero st-reveal', style:`position:relative;z-index:1;min-height:74vh;display:flex;flex-direction:column;justify-content:flex-end;padding:30px 22px ${Math.round(t.space.sectionY*0.6)}px`},[
        el('div',{style:'position:absolute;inset:0;z-index:0;overflow:hidden'},[
          el('img',{src:ir.heroImg, style:'width:100%;height:100%;object-fit:cover'}),
          el('div',{style:`position:absolute;inset:0;background:linear-gradient(180deg, ${rgba(t.color.bg,.22)} 0%, ${rgba(t.color.bg,.5)} 52%, ${t.color.bg} 100%)`})
        ]),
        el('div',{style:'position:relative;z-index:1'}, megaContent)
      ]);
    }
    return el('section',{class:'st-hero st-reveal', style:pad(t)+'position:relative;z-index:1;padding-top:40px'}, megaContent);
  }
  function pad(t){ return `padding:30px 22px ${Math.round(t.space.sectionY*0.6)}px;`; }

  /* ---- SECTIONS ----------------------------------------------------------- */
  function sectionHead(title, t){ return el('div',{style:`display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px`},[
    el('h2',{style:`margin:0;font-family:${fontStack(t.font.display)};font-size:24px;font-weight:700;color:${t.color.ink};letter-spacing:-.01em`,html:title}),
    el('span',{style:`font-family:${fontStack(t.font.body)};font-size:11px;letter-spacing:.14em;color:${t.color.muted}`,html:'—'})]); }

  function card(item, t, onTap){
    const c = el('article',{class:'st-tap', style:`background:${t.color.surface};border:1px solid ${t.color.line};border-radius:${t.radius.card}px;overflow:hidden;cursor:pointer;${item.hero?`box-shadow:0 0 0 2px ${t.color.accent}`:''}`,
      onclick:()=>onTap(item)},[
      media(t,'4/3',item.img),
      el('div',{style:'padding:12px 13px'},[
        el('div',{style:`font-family:${fontStack(t.font.display)};font-size:16px;color:${t.color.ink}`,html:item.title}),
        el('div',{style:`display:flex;justify-content:space-between;margin-top:3px;font-family:${fontStack(t.font.body)};font-size:12.5px;color:${t.color.muted}`},[
          el('span',{html:item.sub||''}), el('span',{html:item.price||''})])])]);
    return c;
  }

  function buildSection(kind, items, t, onTap){
    const sec = el('section',{class:'st-reveal', style:`padding:${t.space.sectionY*0.5}px 22px`});
    if (kind==='rail'){
      sec.appendChild(sectionHead('The Collection', t));
      const track = el('div',{style:'display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -22px;padding:4px 22px 6px'});
      items.forEach(it=>{ const cc=card(it,t,onTap); cc.style.cssText+=';flex:0 0 74%;scroll-snap-align:start'; track.appendChild(cc); });
      sec.appendChild(track);
    } else if (kind==='lookbook'){
      sec.appendChild(sectionHead('Lookbook', t));
      items.forEach((it,i)=>{ const fig=el('figure',{class:'st-tap',style:`margin:0 0 16px;cursor:pointer`,onclick:()=>onTap(it)},[
        media(t,'16/10',it.img),
        el('figcaption',{style:`display:flex;gap:10px;align-items:baseline;margin-top:8px`},[
          el('span',{style:`font-family:${fontStack(t.font.accent)};font-size:12px;color:${t.color.accent}`,html:String(i+1).padStart(2,'0')}),
          el('span',{style:`font-family:${fontStack(t.font.display)};font-size:20px;color:${t.color.ink}`,html:it.title}),
          el('span',{style:`margin-left:auto;font-family:${fontStack(t.font.body)};font-size:12px;color:${t.color.muted}`,html:it.sub||''})])]);
        sec.appendChild(fig); });
    } else if (kind==='stubs'){
      sec.appendChild(sectionHead('The Line-Up', t));
      items.forEach(it=>{ const row=el('article',{class:'st-tap',style:`display:grid;grid-template-columns:1fr auto;background:${t.color.surface};border:1px solid ${t.color.line};border-radius:${t.radius.card}px;overflow:hidden;margin-bottom:10px;cursor:pointer;${it.hero?`box-shadow:0 0 0 2px ${t.color.accent}`:''}`,onclick:()=>onTap(it)},[
        el('div',{style:'padding:13px 15px'},[
          el('div',{style:`font-family:${fontStack(t.font.display)};font-size:17px;color:${t.color.ink}`,html:it.title}),
          el('div',{style:`font-family:${fontStack(t.font.body)};font-size:12.5px;color:${t.color.muted};margin-top:2px`,html:it.sub||''})]),
        el('div',{style:`border-left:2px dashed ${t.color.line};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 16px;position:relative`},[
          el('span',{style:`font-family:${fontStack(t.font.display)};font-size:15px;color:${t.color.accent}`,html:it.price||'—'}),
          el('span',{style:`font-family:${fontStack(t.font.body)};font-size:10px;letter-spacing:.1em;color:${t.color.muted};margin-top:3px`,html:'CLAIM'})])]);
        sec.appendChild(row); });
    } else if (kind==='tiers'){
      sec.appendChild(sectionHead('Levels', t));
      const grid=el('div',{style:'display:flex;flex-direction:column;gap:10px'});
      items.forEach(it=>grid.appendChild(el('div',{class:'st-tap',style:`background:${t.color.surface};border:1px solid ${it.hero||it.sub==='featured'?t.color.accent:t.color.line};border-radius:${t.radius.card}px;padding:15px;display:flex;align-items:center;justify-content:space-between;cursor:pointer`,onclick:()=>onTap(it)},[
        el('div',{},[el('div',{style:`font-family:${fontStack(t.font.display)};font-size:18px;color:${t.color.ink}`,html:it.title}),
          el('div',{style:`font-family:${fontStack(t.font.body)};font-size:11px;letter-spacing:.12em;color:${t.color.muted};text-transform:uppercase`,html:it.sub||''})]),
        el('div',{style:`font-family:${fontStack(t.font.display)};font-size:22px;color:${t.color.accent}`,html:it.price||''})])));
      sec.appendChild(grid);
    } else if (kind==='tracklist'){
      sec.appendChild(sectionHead('Side A / Side B', t));
      const ol=el('ol',{style:`list-style:none;margin:0;padding:0`});
      items.forEach(it=>ol.appendChild(el('li',{class:'st-tap',style:`display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid ${t.color.line};cursor:pointer`,onclick:()=>onTap(it)},[
        el('span',{style:`font-family:${fontStack(t.font.accent)};font-size:13px;color:${t.color.accent};min-width:30px`,html:(it.title.split(' ')[0]||'•')}),
        el('span',{style:`flex:1;font-family:${fontStack(t.font.body)};font-size:15px;color:${t.color.ink}`,html:it.title.replace(/^\S+\s*·?\s*/,'')}),
        el('span',{style:`font-family:${fontStack(t.font.accent)};font-size:13px;color:${t.color.muted}`,html:it.sub||it.price||''})])));
      sec.appendChild(ol);
    } else if (kind==='courses'){
      sec.appendChild(sectionHead('The Menu', t));
      items.forEach(it=>sec.appendChild(el('div',{class:'st-tap',style:`display:flex;gap:16px;align-items:baseline;padding:16px 0;border-bottom:1px solid ${t.color.line};cursor:pointer`,onclick:()=>onTap(it)},[
        el('span',{style:`font-family:${fontStack(t.font.display)};font-size:22px;color:${t.color.accent}`,html:it.title.split(' ')[0]}),
        el('div',{},[el('div',{style:`font-family:${fontStack(t.font.display)};font-size:17px;color:${t.color.ink}`,html:it.title.replace(/^\S+\s*·?\s*/,'')}),
          el('div',{style:`font-family:${fontStack(t.font.body)};font-size:12.5px;color:${t.color.muted};margin-top:2px`,html:it.sub||''})])])));
    } else if (kind==='flightplan'){
      sec.appendChild(sectionHead('Flight Plan', t));
      const ol=el('ol',{style:`list-style:none;margin:0;padding:0 0 0 22px;border-left:2px dashed ${t.color.accent}`});
      items.forEach(it=>ol.appendChild(el('li',{style:`position:relative;padding:0 0 18px`},[
        el('i',{style:`position:absolute;left:-29px;top:3px;width:12px;height:12px;border-radius:50%;background:${t.color.accent};box-shadow:0 0 0 4px ${t.color.bg}`}),
        el('div',{style:`font-family:${fontStack(t.font.display)};font-size:16px;color:${t.color.ink}`,html:it.title}),
        el('div',{style:`font-family:${fontStack(t.font.accent)};font-size:12px;color:${t.color.muted}`,html:(it.price?it.price+' · ':'')+(it.sub||'')})])));
      sec.appendChild(ol);
    } else if (kind==='giftgrid'){
      sec.appendChild(sectionHead('The gifts', t));
      const grid=el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:12px'});
      const srcLabel={product:'',homemade:'HANDMADE',experience:'EXPERIENCE',idea:'',gift:''};
      items.forEach(it=>{
        const kind2 = it.kind||'product';
        const host = it.source && /\./.test(it.source) ? it.source : null;
        // visual face per kind: product=photo+host badge, homemade=warm tile+heart, experience=gradient+icon, idea=dashed open slot
        let face;
        if (kind2==='homemade'){
          face = el('div',{style:`position:relative;aspect-ratio:1/1;background:${rgba(t.color.accent,.12)};display:grid;place-items:center;overflow:hidden`},[
            el('div',{style:`color:${t.color.accent}`,html:MOTIFS.sparkle(34)}),
            el('span',{style:`position:absolute;top:8px;left:8px;font-size:9px;font-weight:700;letter-spacing:.08em;color:${t.color.accent};background:${rgba(t.color.surface,.85)};padding:3px 7px;border-radius:99px`,html:'HANDMADE'})]);
        } else if (kind2==='experience'){
          face = el('div',{style:`position:relative;aspect-ratio:1/1;background:linear-gradient(150deg,${t.color.accent},${t.color.accent2});display:grid;place-items:center;overflow:hidden`},[
            el('div',{style:'color:#fff;opacity:.9',html:MOTIFS.star(34)}),
            el('span',{style:`position:absolute;top:8px;left:8px;font-size:9px;font-weight:700;letter-spacing:.08em;color:#fff;background:${rgba('#000',.28)};padding:3px 7px;border-radius:99px`,html:'EXPERIENCE'})]);
        } else if (kind2==='idea'){
          face = el('div',{style:`aspect-ratio:1/1;border:2px dashed ${t.color.line};border-radius:8px;display:grid;place-items:center;color:${t.color.muted};font-size:30px`,html:'+'});
        } else {
          face = el('div',{style:'position:relative'},[ media(t,'1/1',it.img),
            host? el('span',{style:`position:absolute;top:8px;left:8px;font-size:9px;font-weight:600;letter-spacing:.04em;padding:3px 7px;border-radius:99px;background:${rgba(t.color.bg,.74)};color:${t.color.ink};backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)`,html:host}) : null ]);
        }
        grid.appendChild(el('article',{class:'st-tap',style:`background:${t.color.surface};border:1px solid ${t.color.line};border-radius:${t.radius.card}px;overflow:hidden;cursor:pointer`,onclick:()=>onTap(it)},[
          face,
          el('div',{style:'padding:10px 11px'},[
            el('div',{style:`font-family:${fontStack(t.font.display)};font-size:14.5px;color:${t.color.ink};line-height:1.16`,html:it.title}),
            el('div',{style:`display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:8px`},[
              el('span',{style:`font-family:${fontStack(t.font.body)};font-size:11.5px;color:${t.color.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,html:it.sub||''}),
              el('span',{style:`font-family:${fontStack(t.font.display)};font-size:14px;color:${t.color.accent};white-space:nowrap`,html:(it.price&&it.price!=='$0'&&it.price!=='$—')?it.price:''})])])]));
      });
      sec.appendChild(grid);
      // running total + the money button live in the sticky bar; here, a gentle subtotal line
      sec.appendChild(el('div',{style:`display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid ${t.color.line}`},[
        el('span',{style:`font-family:${fontStack(t.font.body)};font-size:13px;color:${t.color.muted}`,html:items.length+' things, picked with love'}),
        el('button',{style:btn(t),html:'Send the bundle'})]));
    } else if (kind==='gallery'){
      sec.appendChild(sectionHead('Moments', t));
      const imgs = (items && items.length) ? items : [{},{},{}];
      const strip = el('div',{style:'display:flex;gap:10px;overflow-x:auto;margin:0 -22px;padding:2px 22px 6px;scroll-snap-type:x mandatory'});
      imgs.forEach((it,i)=>{ const m=media(t, i%3===0?'3/4':'1/1', it.img); m.style.cssText+=';flex:0 0 '+(i%3===0?'62%':'44%')+';scroll-snap-align:start'; if(i%2) m.style.transform='rotate(-1.5deg)'; strip.appendChild(m); });
      sec.appendChild(strip);
    } else if (kind==='note'){
      const it=items[0]||{};
      sec.appendChild(el('div',{style:`position:relative;background:${rgba(t.color.accent,.07)};border:1px solid ${t.color.line};border-radius:${t.radius.card}px;padding:22px 22px 20px`},[
        el('div',{style:`color:${t.color.accent};margin-bottom:10px`,html:MOTIFS.sparkle(18)}),
        el('div',{style:`font-family:${fontStack(t.font.accent==='Baloo 2'||/Script|Pinyon|Dancing/.test(t.font.accent)?t.font.accent:t.font.display)};font-size:20px;line-height:1.45;color:${t.color.ink};text-wrap:pretty`,html:it.title||'Thinking of you — hope this makes your day.'}),
        el('div',{style:`font-family:${fontStack(t.font.body)};font-size:13px;color:${t.color.muted};margin-top:12px`,html:it.sub||''})]));
    } else if (kind==='custom'){
      // ESCAPE HATCH — model-authored themed markup. theme tokens are live CSS vars
      // (--accent, --ink, --surface, --font-display …). No ceiling: if the blocks
      // can't express the idea, the model writes its own HTML/CSS here. Sanitize server-side.
      const it=items[0]||{};
      const box=el('div',{class:'st-custom'}); box.innerHTML = it.html||'';
      sec.appendChild(box);
    } else { // steps
      sec.appendChild(sectionHead('How It Goes', t));
      items.forEach((it,i)=>sec.appendChild(el('div',{style:`display:flex;gap:14px;align-items:flex-start;padding:12px 0`},[
        el('span',{style:`flex:0 0 34px;height:34px;border-radius:${t.radius.card}px;display:grid;place-items:center;background:${rgba(t.color.accent,.14)};color:${t.color.accent};font-family:${fontStack(t.font.display)};font-size:16px`,html:String(i+1)}),
        el('div',{},[el('div',{style:`font-family:${fontStack(t.font.display)};font-size:16px;color:${t.color.ink}`,html:it.title.replace(/^\d+\s*·?\s*/,'')}),
          el('div',{style:`font-family:${fontStack(t.font.body)};font-size:13px;color:${t.color.muted};margin-top:1px`,html:it.sub||''})])])));
    }
    return sec;
  }

  /* ---- OVERLAYS: menu, sheet, bar ---------------------------------------- */
  function buildOverlays(root, ir, spec, t){
    // scrim
    const scrim = el('div',{class:'st-scrim',style:`position:absolute;inset:0;z-index:60;background:${rgba('#100b08',.5)};opacity:0;visibility:hidden;transition:opacity .35s, visibility .35s`});
    scrim.addEventListener('click',()=>{ closeAll(); });
    // menu
    const menu = el('nav',{class:'st-menu',style:`position:absolute;top:0;right:0;bottom:0;z-index:61;width:80%;max-width:300px;background:${t.color.surface};
      transform:translateX(100%);transition:transform .4s ${t.motion.easePanel};display:flex;flex-direction:column;padding:54px 24px 28px;box-shadow:-24px 0 60px ${rgba('#000',.3)}`},[
      el('div',{style:`font-family:${fontStack(t.font.display)};font-size:18px;color:${t.color.ink};margin-bottom:22px`,html:ir.title})]);
    ir.nav.forEach((lnk,i)=>{ const a=el('a',{class:'st-mlink',style:`font-family:${fontStack(t.font.display)};font-size:26px;color:${t.color.ink};padding:12px 0;border-bottom:1px solid ${t.color.line};text-decoration:none;opacity:0;transform:translateX(14px);transition:.4s ${i*.06+.05}s`,html:lnk}); menu.appendChild(a); });
    // sheet
    const sheetBody = el('div',{class:'st-sheetbody'});
    const sheet = el('div',{class:'st-sheet',style:`position:absolute;left:0;right:0;bottom:0;z-index:71;background:${t.color.surface};border-radius:22px 22px 0 0;
      transform:translateY(101%);transition:transform .45s ${t.motion.easeSheet};padding:10px 20px 26px;max-height:88%;overflow-y:auto;box-shadow:0 -24px 60px ${rgba('#000',.35)}`},[
      el('div',{style:`width:42px;height:5px;border-radius:99px;background:${t.color.line};margin:6px auto 16px`}), sheetBody]);
    // sticky bar
    const bar = el('div',{class:'st-bar',style:`position:absolute;left:0;right:0;bottom:0;z-index:45;display:flex;align-items:center;gap:12px;padding:12px 18px 16px;
      background:${rgba(t.color.surface,.92)};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid ${t.color.line};
      transform:translateY(140%);transition:transform .45s ${t.motion.easePanel}`},[
      el('div',{style:'flex:1;min-width:0'},[
        el('div',{style:`font-family:${fontStack(t.font.body)};font-size:10px;letter-spacing:.16em;color:${t.color.muted};text-transform:uppercase`,html:ir.eyebrow}),
        el('div',{style:`font-family:${fontStack(t.font.display)};font-size:15px;color:${t.color.ink}`,html:ir.title})]),
      el('button',{style:btn(t),html:ir.cta})]);

    function openMenu(){ scrim.style.opacity=1;scrim.style.visibility='visible';menu.style.transform='none';
      menu.querySelectorAll('.st-mlink').forEach(a=>{a.style.opacity=1;a.style.transform='none';}); }
    function openSheet(item){ scrim.style.opacity=1;scrim.style.visibility='visible';
      sheetBody.innerHTML='';
      sheetBody.appendChild(media(t,'4/3',item.img));
      sheetBody.appendChild(el('div',{style:`display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-top:16px`},[
        el('div',{style:`font-family:${fontStack(t.font.display)};font-size:24px;color:${t.color.ink};line-height:1.05`,html:item.title}),
        el('div',{style:`font-family:${fontStack(t.font.display)};font-size:20px;color:${t.color.accent};white-space:nowrap`,html:item.price||''})]));
      sheetBody.appendChild(el('div',{style:`font-family:${fontStack(t.font.body)};font-size:13.5px;color:${t.color.muted};margin-top:8px;line-height:1.5`,html:item.sub||'A featured part of the celebration. Tap below to lock it in.'}));
      sheetBody.appendChild(el('button',{style:btn(t)+'width:100%;margin-top:20px;padding:14px',html:ir.cta}));
      sheet.style.transform='none'; }
    function closeAll(){ scrim.style.opacity=0;scrim.style.visibility='hidden';menu.style.transform='translateX(100%)';sheet.style.transform='translateY(101%)';
      menu.querySelectorAll('.st-mlink').forEach(a=>{a.style.opacity=0;a.style.transform='translateX(14px)';}); }

    root.appendChild(scrim); root.appendChild(menu); root.appendChild(sheet); root.appendChild(bar);
    return { openMenu, openSheet, closeAll, bar };
  }
  function btn(t){ return `font-family:${fontStack(t.font.body)};font-weight:600;font-size:14px;border:none;cursor:pointer;border-radius:${t.radius.pill}px;
    padding:11px 18px;background:${t.color.accent};color:${t.color.mode==='dark'?'#0c0c0c':'#fff'};${t.color.glow?`box-shadow:0 0 18px ${rgba(t.color.accent,.6)}`:''}`; }

  /* ---- MAIN --------------------------------------------------------------- */
  function setThemeVars(root, t){
    const c=t.color, v=root.style;
    v.setProperty('--bg',c.bg); v.setProperty('--surface',c.surface); v.setProperty('--ink',c.ink);
    v.setProperty('--muted',c.muted); v.setProperty('--line',c.line); v.setProperty('--accent',c.accent);
    v.setProperty('--accent2',c.accent2); v.setProperty('--radius',t.radius.card+'px');
    v.setProperty('--font-display',fontStack(t.font.display)); v.setProperty('--font-body',fontStack(t.font.body)); v.setProperty('--font-accent',fontStack(t.font.accent));
  }
  function renderSite(spec, ir, mount){
    injectGlobal(); ensureFonts(spec);
    const t = spec.tokens;
    mount.innerHTML='';
    const root = el('div',{class:'st-root',style:`position:absolute;inset:0;background:${t.color.bg};color:${t.color.ink};font-family:${fontStack(t.font.body)};overflow:hidden`});
    setThemeVars(root, t);
    root.appendChild(scene(spec.scene, t));
    // scroll container
    const scroll = el('div',{class:'st-scroll',style:'position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;z-index:1'});
    // top bar
    scroll.appendChild(el('div',{style:`position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:${rgba(t.color.bg,.6)};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)`},[
      el('div',{style:`font-family:${fontStack(t.font.display)};font-size:16px;letter-spacing:.04em;color:${t.color.ink}`,html:ir.brand}),
      el('button',{class:'st-burger',style:`width:40px;height:40px;border:none;background:transparent;cursor:pointer;display:grid;place-items:center`,
        html:`<svg width="22" height="22" viewBox="0 0 24 24" stroke="${t.color.ink}" stroke-width="1.8"><path d="M4 8h16M4 16h16"/></svg>`})]));
    // hero
    const heroEl = hero(spec, ir, t); scroll.appendChild(heroEl); heroEl.classList.add('in');
    // sections
    const onTap = (item)=>ov.openSheet(item);
    ir.sections.forEach(s=>scroll.appendChild(buildSection(s.kind, s.items, t, onTap)));
    // footer
    scroll.appendChild(el('footer',{style:`padding:30px 22px 90px;text-align:center;border-top:1px solid ${t.color.line};margin-top:20px`},[
      el('div',{style:`margin-bottom:12px`},[motifRow(spec,t)]),
      el('div',{style:`font-family:${fontStack(t.font.body)};font-size:12px;color:${t.color.muted}`,html:ir.footer})]));
    root.appendChild(scroll);

    const ov = buildOverlays(root, ir, spec, t);
    root.querySelector('.st-burger').addEventListener('click', ov.openMenu);

    mount.appendChild(root);
    // auto-fit hero headline so long words never overflow AND never wrap past intended lines
    function fitHead(){
      const h = root.querySelector('.st-hero h1'); if(!h) return;
      const intended = (h.innerHTML.match(/<br>/g)||[]).length + 1;
      const lh = ()=> parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize);
      const lines = ()=> Math.round(h.scrollHeight / lh());
      let fs = parseFloat(getComputedStyle(h).fontSize), g=0;
      while ((h.scrollWidth > h.clientWidth+1 || lines() > intended) && fs > 20 && g < 90){ fs -= 1.5; h.style.fontSize = fs+'px'; g++; }
    }
    requestAnimationFrame(fitHead);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(()=>setTimeout(fitHead, 40));
    setTimeout(fitHead, 600);
    // reveals + sticky bar via IntersectionObserver on the scroll container
    requestAnimationFrame(()=>{
      const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('in')),{root:scroll,rootMargin:'-8% 0px'});
      scroll.querySelectorAll('.st-reveal').forEach(n=>io.observe(n));
      const bio=new IntersectionObserver(es=>es.forEach(e=>{ ov.bar.style.transform = e.isIntersecting ? 'translateY(140%)' : 'none'; }),{root:scroll,rootMargin:'-30% 0px 0px 0px'});
      bio.observe(heroEl);
      setTimeout(()=>scroll.querySelectorAll('.st-reveal:not(.in)').forEach(n=>n.classList.add('in')), 1100);
    });
    return root;
  }
})(window);
