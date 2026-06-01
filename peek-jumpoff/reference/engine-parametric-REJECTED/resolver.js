/* ============================================================================
   SITE STAMPER · resolver.js  —  OPTIONAL deterministic fast-path (§10)
   ────────────────────────────────────────────────────────────────────────
   NOT the brain. The in-chat model is the real resolver (see
   ARCHITECTURE_CLARITY.md). This is a cheap/instant/offline shortcut that maps
   knobs → ThemeSpec → IR via lookup tables, for: live preview while the model
   streams, a zero-cost fallback, and a worked reference of the parts bin.
   The model can bypass all of this and author ThemeSpec+IR directly — the
   renderer consumes either one. Keep as training wheels, never a gate.
   ────────────────────────────────────────────────────────────────────────
   interpret(brief) -> DNA ; placeWorld(DNA) -> world ;
   resolveTokens(world,DNA,seed) -> ThemeSpec ; coherence ; scaffold -> IR ;
   vary(spec,seed). Pure functions. Same (brief,seed) => same output.
   ============================================================================ */
(function (G) {
  'use strict';
  const { WORLDS, PALETTES } = G.STAMP;

  /* ---- seeded RNG (mulberry32) ------------------------------------------- */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

  /* ---- color helpers ------------------------------------------------------ */
  function hexToHsl(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.slice(0,2),16)/255, g = parseInt(hex.slice(2,4),16)/255, b = parseInt(hex.slice(4,6),16)/255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b); let h=0,s=0,l=(mx+mn)/2;
    if (mx!==mn){const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn);
      h = mx===r ? (g-b)/d+(g<b?6:0) : mx===g ? (b-r)/d+2 : (r-g)/d+4; h*=60;}
    return [h, s, l];
  }
  function hslToHex(h,s,l){
    h=((h%360)+360)%360; const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
    let r,g,b; if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];
    else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];
    const to=v=>('0'+Math.round((v+m)*255).toString(16)).slice(-2);
    return '#'+to(r)+to(g)+to(b);
  }
  function rotateHue(hex, deg){ const [h,s,l]=hexToHsl(hex); return hslToHex(h+deg,s,l); }
  function adjustSat(hex, mul){ const [h,s,l]=hexToHsl(hex); return hslToHex(h, Math.max(0,Math.min(1,s*mul)), l); }

  /* ---- occasion default knob profiles (§10.2) ----------------------------- */
  const OCCASION = {
    wedding:{formality:.8,energy:.3,whimsy:.2,ornament:.5,luminosity:'light',era:'timeless'},
    gala:{formality:.95,energy:.4,whimsy:.1,ornament:.6,luminosity:'dark',contrast:.8,era:'deco'},
    rave:{formality:.1,energy:.95,whimsy:.4,saturation:1,luminosity:'dark',motion:.9,era:'y2k'},
    bachelor:{formality:.5,energy:.7,whimsy:.3,luminosity:'dark',contrast:.7,era:'deco'},
    bachelorette:{formality:.4,energy:.75,whimsy:.6,saturation:.7},
    shop:{formality:.5,energy:.4,whimsy:.2,ornament:.2,texture:.4,era:'contemporary'},
    dinner:{formality:.7,energy:.2,whimsy:.1,ornament:.2,density:.2,era:'timeless'},
    garden:{formality:.4,energy:.3,whimsy:.4,warmth:.5,ornament:.5,luminosity:'light'},
    baby:{formality:.3,energy:.4,whimsy:.7,warmth:.4,saturation:.4,luminosity:'light'},
    corporate:{formality:.7,energy:.4,whimsy:.1,ornament:.15,era:'contemporary'},
    birthday:{formality:.3,energy:.6,whimsy:.6},
    launch:{formality:.5,energy:.6,whimsy:.3,era:'contemporary'}
  };
  const DNA0 = { formality:.5,energy:.5,whimsy:.4,warmth:.45,saturation:.5,contrast:.45,
    ornament:.4,density:.5,texture:.3,motion:.45,luminosity:'light',era:'contemporary' };

  /* ---- A. interpret ------------------------------------------------------- */
  function interpret(brief){
    const dna = Object.assign({}, DNA0, OCCASION[brief.occasion] || {});
    // age swing for birthdays/parties
    if (typeof brief.age === 'number'){
      if (brief.age <= 10){ dna.whimsy=Math.max(dna.whimsy,.85); dna.formality=Math.min(dna.formality,.2); dna.saturation=Math.max(dna.saturation,.55); }
      else if (brief.age >= 40){ dna.formality=Math.max(dna.formality,.45); }
    }
    // explicit knob overrides from the Director (strongest)
    if (brief.knobs) for (const k in brief.knobs){
      const v = brief.knobs[k];
      if (k==='luminosity'||k==='era'){ dna[k]=v; }
      else if (typeof v==='number'){ dna[k]=Math.max(0,Math.min(1, (brief.knobs[k+'__abs']? v : (dna[k]==null?v:dna[k]+v)) )); }
    }
    if (brief.luminosity) dna.luminosity = brief.luminosity;
    if (brief.era) dna.era = brief.era;
    return dna;
  }

  /* ---- B. placeWorld (nearest anchor) ------------------------------------- */
  const NUM = ['formality','energy','whimsy','warmth','saturation','contrast','ornament','motion'];
  function placeWorld(dna, forced){
    if (forced && WORLDS[forced]) return forced;
    let best=null, bestD=1e9;
    for (const name in WORLDS){
      const a = WORLDS[name].anchor; let d=0;
      for (const k of NUM){ const av=a[k]==null?.5:a[k]; d += Math.pow((dna[k]==null?.5:dna[k])-av,2); }
      if (a.luminosity && dna.luminosity && a.luminosity!==dna.luminosity) d += .25;
      if (a.era && dna.era && a.era!==dna.era) d += .15;
      if (d<bestD){bestD=d; best=name;}
    }
    return best;
  }

  /* ---- C. resolveTokens --------------------------------------------------- */
  function resolveTokens(worldName, dna, brief, seed){
    const w = WORLDS[worldName]; const r = rng((seed||1) ^ 0x9e37);
    // palette: prefer matching luminosity
    let palNames = w.palettes.slice();
    const lit = palNames.filter(n => PALETTES[n].mode === (dna.luminosity==='dark'?'dark':'light'));
    if (lit.length) palNames = lit;
    const palName = pick(palNames, r);
    const base = Object.assign({}, PALETTES[palName]);
    // hue rotation by warmth (toward warm hues) + saturation tuning
    const hueShift = Math.round((dna.warmth - .45) * 26 + (r()-.5)*16);
    const satMul = .7 + dna.saturation * .7;
    let accent = adjustSat(rotateHue(base.accent, hueShift), satMul);
    let accent2 = adjustSat(rotateHue(base.accent2 || base.accent, hueShift*0.6), satMul);
    if (brief.colorHint) accent = brief.colorHint;
    const color = { mode: base.mode, bg: base.bg, surface: base.surface, ink: base.ink,
      muted: base.muted, line: base.line, accent, accent2,
      glow: !!base.glow || (base.mode==='dark' && dna.saturation>.7) };
    // fonts (bias display didone on high contrast)
    const fonts = Object.assign({}, w.fonts);
    if (dna.contrast>.7 && worldName==='Heritage') fonts.display='Bodoni Moda';
    // scene by energy/motion
    let scenes = w.scenes.slice();
    const scene = (dna.motion<.25 && scenes.includes('grain')) ? 'grain' : pick(scenes, r);
    // motifs by ornament budget
    const budget = Math.max(1, Math.round(dna.ornament*4));
    const motifs = w.motifs.slice(0, budget);
    // frame by item kind
    const kinds = (brief.items||[]).map(i=>i.kind||'').join(' ');
    let frame = w.frames[0];
    if (/music|song|track/.test(kinds) && w.frames.includes('vinyl')) frame='vinyl';
    else if (/space|flight|mission/.test(kinds) && w.frames.includes('porthole')) frame='porthole';
    else frame = pick(w.frames, r);
    // sections + hero + cta
    const sections = w.sections.slice(0, 3);
    const hero = w.hero;
    const cta = (brief.ctaLabel) || w.cta;
    const scaleRatio = 1.18 + (1-dna.density)*0.18 + dna.contrast*0.12;
    const radius = dna.formality>.7 ? 8 : dna.whimsy>.6 ? 22 : 14;
    return {
      id: worldName.toLowerCase()+'-'+(seed||1), world: worldName, palName, concept: brief.concept||null,
      tokens:{
        font:{ display:fonts.display, body:fonts.body, accent:fonts.accent,
          scaleRatio:+scaleRatio.toFixed(2), displayTracking: dna.contrast>.6?'-0.02em':'-0.01em',
          eyebrowTracking:'0.2em' },
        color, radius:{card:radius, sheet:Math.max(16,radius), pill:999},
        space:{ unit:8, sectionY: Math.round(56 + (1-dna.density)*36), density: dna.density>.6?'tight':'comfortable' },
        motion:{ intensity:dna.motion, reduceOK:true, easePanel:'cubic-bezier(.3,.8,.2,1)',
          easeSheet:'cubic-bezier(.3,.85,.2,1)', easeBounce: dna.whimsy>.6?'cubic-bezier(.34,1.56,.64,1)':'cubic-bezier(.16,1,.3,1)' }
      },
      scene, motifs, frame, hero, sections, cta,
      voice: brief.voice || w.voice
    };
  }

  /* ---- D. coherence pass -------------------------------------------------- */
  function coherence(spec){
    const c = spec.tokens.color;
    // dark + glow -> ensure accent vivid; light -> drop glow
    if (c.mode!=='dark') c.glow=false;
    // ornament cap already applied; ensure at least 1 motif
    if (!spec.motifs.length) spec.motifs=['rule'];
    return spec;
  }

  /* ---- E. scaffold -> IR -------------------------------------------------- */
  function titleCase(s){ return (s||'').replace(/\b\w/g,m=>m.toUpperCase()); }

  /* ---- PAGE TYPES (structure) — orthogonal to WORLD (style) --------------- */
  // world picks fonts/colors/scene/motif; pageType picks sections + copy + cta + nav.
  const PAGE_TYPES = {
    invite: {
      sections: null,                       // null → use the world's own sections
      nav: ['Welcome','Details','Plan','RSVP'],
      cta: null                             // null → world cta
    },
    giftbundle: {
      sections: ['note','giftgrid','steps'],
      nav: ['The gift','What\'s inside','Open it'],
      cta: 'Send the bundle',
      eyebrow: (n,from)=> (from? 'FROM '+from.toUpperCase() : 'A GIFT') + (n? ' · FOR '+n.toUpperCase() : ''),
      headline: (n)=> n? `For ${n},\nwith love` : `A little\nsomething`,
      dek: (n)=> `A few things picked just for ${n||'you'} — and a note to go with them.`,
      footer: (n)=> 'A gift for '+(n||'someone special')+' · peek.gift'
    },
    shop: {
      sections: ['rail','lookbook','steps'],
      nav: ['Shop','Lookbook','About','Cart'],
      cta: 'Add to cart'
    }
  };
  function pickPageType(brief){
    if (brief.pageType && PAGE_TYPES[brief.pageType]) return brief.pageType;
    const o = brief.occasion;
    if (o==='shop' || o==='launch') return 'shop';
    if (brief.items && brief.items.some(i=>i.source||i.link) ) return 'giftbundle';
    if (brief.gift) return 'giftbundle';
    return 'invite';
  }

  function scaffold(brief, spec){
    const ptName = pickPageType(brief);
    const pt = PAGE_TYPES[ptName];
    const name = brief.recipient || brief.title || defaultTitle(brief, spec);
    const from = brief.fromName || null;
    const sectionsKinds = brief.sections || pt.sections || spec.sections;
    // multiple uploaded photos → weave in a gallery section automatically
    let kinds = sectionsKinds.slice();
    if (brief.photos && brief.photos.length>=2 && !kinds.includes('gallery')) kinds.splice(1,0,'gallery');
    const ir = {
      pageType: ptName,
      brand: brief.brandShort || initials(name),
      title: name,
      heroImg: brief.heroImg || null,
      eyebrow: (brief.eyebrow || (pt.eyebrow? pt.eyebrow(name, from) : (brief.occasionLabel || labelOccasion(brief.occasion)))).toUpperCase(),
      headline: brief.headline || (pt.headline? pt.headline(name) : defaultHeadline(brief, spec, name)),
      dek: brief.dek || (pt.dek? pt.dek(name) : defaultDek(brief, spec)),
      heroMeta: brief.heroMeta || (ptName==='giftbundle'? null : defaultMeta(brief)),
      nav: brief.nav || pt.nav,
      cta: brief.ctaLabel || pt.cta || spec.cta,
      sections: kinds.map(kind => ({ kind, items: kind==='gallery' && brief.photos ? brief.photos.map(p=>({img:p})) : itemsFor(kind, brief) })),
      footer: brief.footer || (pt.footer? pt.footer(name) : (name + ' · made with the Stamper'))
    };
    return ir;
  }
  function initials(s){ return (s||'S').split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
  function labelOccasion(o){ return ({birthday:'You\'re Invited',gala:'An Evening For Good',rave:'One Night Only',
    shop:'New Collection',dinner:'A Tasting',garden:'Afternoon Gathering',bachelor:'The Send-Off',wedding:'Save The Date'})[o]||'You\'re Invited'; }
  function defaultTitle(brief, spec){ return ({Disco:'Boogie Wonderland',Gala:'The Evening',Cyber:'Afterglow',
    Princess:'A Little Party',Memphis:'The Bash',MissionCtrl:'Mission Cosmo',Heritage:'The Collection',
    Zen:'Omakase',Garden:'Garden Party',Casino:'The Last Ride'})[spec.world]||'The Occasion'; }
  function defaultHeadline(brief, spec, name){
    const m = {Disco:`${name}\nturns it up`, Gala:`An evening\nto remember`, Cyber:`Plug\nin`,
      Princess:`${name}'s\nbig day`, Memphis:`It's\ngo time`, MissionCtrl:`Cleared\nfor launch`,
      Heritage:`Built for\nthe long way`, Zen:`Quiet,\nthen flavor`, Garden:`Come\nbloom`, Casino:`Place\nyour bets`};
    return m[spec.world] || `${name}`;
  }
  function defaultDek(brief, spec){
    const m = {Disco:'Mirror ball up, vinyl spinning — one night on the floor.',
      Gala:'Black tie, open hearts. Join us for an evening in support of the cause.',
      Cyber:'Four rooms. Neon till dawn. Don\'t miss the drop.',
      Princess:'Crowns on, sparkles ready — come celebrate with us.',
      Memphis:'Loud colors, louder fun. You won\'t want to sit this one out.',
      MissionCtrl:'T-minus and counting. Strap in for the celebration.',
      Heritage:'Made by hand, meant for miles. The new field collection.',
      Zen:'A seasonal counter dinner. A few seats, served with intention.',
      Garden:'Long tables under the trees. Bring your appetite for sunshine.',
      Casino:'High rollers only. The house always remembers a good time.'};
    return m[spec.world] || 'Join us.';
  }
  function defaultMeta(brief){ return brief.heroMeta || [['When','Sat · 7:00 PM'],['Where','The Venue'],['Dress','Come as you are']]; }
  function itemsFor(kind, brief){
    if (brief.items && brief.items.length) return brief.items.map((it,i)=>({
      title: it.title || ('Item '+(i+1)), sub: it.sub||it.kind||'', price: it.price||null, hero: !!it.hero, img: it.img||null }));
    // generated placeholders per section kind
    const stub = (t,p,s)=>({title:t, sub:s, price:p});
    const sets = {
      rail:[stub('The Drop','—','four pieces'),stub('Field Kit','—','numbered'),stub('Lookbook','—','editorial')],
      lookbook:[stub('Chapter One','','The arrival'),stub('Chapter Two','','The making')],
      stubs:[stub('VIP Table','$1,200','Sat · 8pm'),stub('The Suite','$3,500','overnight'),stub('Skybox','$5,000','bottle service')],
      tiers:[stub('Friend','$100',''),stub('Patron','$500','featured'),stub('Benefactor','$1,000','')],
      tracklist:[stub('A1 · Welcome','7:00',''),stub('A2 · First Dance','8:30',''),stub('B1 · The Toast','9:15','')],
      courses:[stub('壱 · Otsukuri','','seasonal sashimi'),stub('弐 · Wan','','clear broth'),stub('参 · Yakimono','','grilled')],
      steps:[stub('1 · RSVP','','let us know'),stub('2 · Arrive','','doors at seven'),stub('3 · Celebrate','','till late')],
      flightplan:[stub('Ignition','T+0','launch pad'),stub('Orbit','T+45','dinner service'),stub('Splashdown','T+180','after-party')],
      giftgrid:[
        Object.assign(stub('Sunset Flip-Flops','$28','from a link you paste'),{source:'zappos.com',kind:'product'}),
        Object.assign(stub('Trail Granola — 12pk','$19','from a link you paste'),{source:'amazon.com',kind:'product'}),
        Object.assign(stub('Homemade Matzo-Ball Soup','$0','a quart, made by you'),{source:'homemade',kind:'homemade'}),
        Object.assign(stub('Dinner, on me','$60','an experience'),{source:'experience',kind:'experience'})
      ],
      note:[stub('Couldn\u2019t be prouder of you — go get \u2019em. Call your grandmother.','','— with love')],
      gallery:[{img:null},{img:null},{img:null}]
    };
    return sets[kind] || sets.steps;
  }

  /* ---- F. vary ------------------------------------------------------------ */
  function vary(brief, baseSpec, seed){
    const dna = interpret(brief);
    const w = placeWorld(dna, brief.world);
    return coherence(resolveTokens(w, dna, brief, seed));
  }

  /* ---- media plan: per-slot directives any image provider can execute ----- */
  function buildMediaPlan(spec, brief){
    const st = (G.STAMP.IMG_STYLE||{})[spec.world] || { style:'editorial photography', subj:'the occasion' };
    const concept = brief.concept || spec.voice;
    const subj = brief.heroSubject || st.subj;
    const mode = spec.tokens.color.mode;
    const uploaded = !!brief.heroImg;
    const hero = {
      id:'hero', role:'hero',
      source: uploaded ? (brief.heroEdit ? 'upload-edit' : 'upload') : 'generate',
      url: brief.heroImg || null,
      prompt: `${subj}, ${concept}. ${st.style}. ${mode} key, hero composition, room for nothing — no text, no logos.`,
      // if the user uploaded: relight it to the theme + optional cutout; else generate fresh
      ops: uploaded ? ['relight','upscale'] : [],
      editInstruction: uploaded ? `restyle to: ${st.style}; harmonize colors to the ${mode} theme palette` : null,
      status: uploaded ? 'ready' : 'pending'
    };
    const cardPrompt = `{ITEM}. ${st.style}. ${mode} key, single subject on simple ground, soft shadow, no text`;
    return {
      hero, cardPrompt,
      backgroundPrompt: `${st.style}, abstract ${spec.scene} backdrop, ${mode} key, very subtle, no subject`,
      paletteFromUpload: uploaded,           // upload → extract palette → can re-seed ThemeSpec
      provider: 'image-engine (vendor-neutral: fal / replicate / openai / self-host)'
    };
  }

  /* ---- top-level resolve -------------------------------------------------- */
  function resolve(brief, seed){
    const dna = interpret(brief);
    const world = placeWorld(dna, brief.world);
    let spec = resolveTokens(world, dna, brief, seed||1);
    spec = coherence(spec);
    spec.dna = dna;
    const ir = scaffold(brief, spec);
    ir.media = buildMediaPlan(spec, brief);
    return { spec, ir, dna, world };
  }

  G.STAMP.engine = { rng, interpret, placeWorld, resolveTokens, coherence, scaffold, vary, resolve, rotateHue, adjustSat, buildMediaPlan };
})(window);
