/* ============================================================================
   SITE STAMPER · parts.js  —  THE PARTS BIN (data + builders)
   Catalogs the engine draws from: fonts, palettes, worlds, scenes, motifs,
   frames, and the global motion stylesheet. Pure data + small DOM builders.
   Everything themes off CSS custom properties set by the renderer.
   ============================================================================ */
(function (G) {
  'use strict';

  /* ---- FONT LOADER SPECS (family -> Google css2 axis query) --------------- */
  const FONT_SPECS = {
    'Fraunces': 'Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700',
    'Inter': 'Inter:wght@400;500;600;700;800',
    'Cinzel': 'Cinzel:wght@400;500;600;700;800',
    'Cinzel Decorative': 'Cinzel+Decorative:wght@400;700;900',
    'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400',
    'Cormorant': 'Cormorant:ital,wght@0,400;0,500;0,600;1,400',
    'Marcellus': 'Marcellus',
    'Mulish': 'Mulish:wght@400;500;600;700;800',
    'Shrikhand': 'Shrikhand',
    'Poppins': 'Poppins:wght@400;500;600;700;800',
    'Monoton': 'Monoton',
    'Orbitron': 'Orbitron:wght@500;700;900',
    'Rajdhani': 'Rajdhani:wght@400;500;600;700',
    'Share Tech Mono': 'Share+Tech+Mono',
    'Dancing Script': 'Dancing+Script:wght@500;600;700',
    'Quicksand': 'Quicksand:wght@400;500;600;700',
    'Baloo 2': 'Baloo+2:wght@500;600;700;800',
    'Archivo Black': 'Archivo+Black',
    'Space Grotesk': 'Space+Grotesk:wght@400;500;600;700',
    'Space Mono': 'Space+Mono:wght@400;700',
    'Saira Condensed': 'Saira+Condensed:wght@500;600;700;800',
    'Nunito Sans': 'Nunito+Sans:wght@400;500;600;700;800',
    'Jost': 'Jost:wght@400;500;600;700',
    'Bodoni Moda': 'Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,700;1,6..96,400',
    'Work Sans': 'Work+Sans:wght@400;500;600;700',
    'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400',
    'Pinyon Script': 'Pinyon+Script',
    'Source Serif 4': 'Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700',
    'Bebas Neue': 'Bebas+Neue',
    'Lora': 'Lora:ital,wght@0,400;0,500;0,600;1,400',
    'Anton': 'Anton'
  };
  function fontStack(name, kind) {
    const serifs = ['Fraunces','Cinzel','Cinzel Decorative','Cormorant Garamond','Cormorant','Marcellus','Bodoni Moda','Playfair Display','Source Serif 4','Lora'];
    const scripts = ['Dancing Script','Pinyon Script','Monoton','Shrikhand'];
    const fb = serifs.includes(name) ? 'Georgia, serif'
      : scripts.includes(name) ? 'cursive'
      : '-apple-system, system-ui, sans-serif';
    return `"${name}", ${fb}`;
  }

  /* ---- PALETTES (§3.2) ---------------------------------------------------- */
  const PALETTES = {
    'Hemlock Field': { mode:'light', bg:'#FBF6EC', surface:'#FFFFFF', ink:'#23190F', muted:'#7A6A55', line:'#E7DAC4', accent:'#9A5B33', accent2:'#5E6B4F', texture:true },
    'Forest Lodge':  { mode:'dark', bg:'#15140F', surface:'#211E16', ink:'#EDE4D2', muted:'#9C9277', line:'#34301F', accent:'#C8772E', accent2:'#7E8B5A' },
    'Ballroom Noir': { mode:'dark', bg:'#0E0D10', surface:'#16151A', ink:'#F2EEE6', muted:'#9D97A6', line:'#2A2730', accent:'#CBA14A', accent2:'#7E1E2B' },
    'Champagne':     { mode:'light', bg:'#F7F1E8', surface:'#FFFFFF', ink:'#2C2622', muted:'#8A7E70', line:'#EADDCB', accent:'#B9925A', accent2:'#7C2233' },
    'Casino Gold':   { mode:'dark', bg:'#0B0D10', surface:'#121620', ink:'#F4EFE2', muted:'#8C93A1', line:'#23303f', accent:'#E8C35A', accent2:'#E0245E' },
    'Disco Heat':    { mode:'dark', bg:'#1A0A1F', surface:'#28103a', ink:'#FFF3DA', muted:'#C79CCB', line:'#3a1b4d', accent:'#FF7A29', accent2:'#F4C04E', glow:true },
    'Cyber Afterglow':{ mode:'dark', bg:'#05060E', surface:'#0B1024', ink:'#EAFBFF', muted:'#7FA6C8', line:'#16204a', accent:'#FF2D95', accent2:'#28E0FF', glow:true },
    'Vapor Sunset':  { mode:'dark', bg:'#180A2B', surface:'#24123f', ink:'#FFE9F6', muted:'#C79AD8', line:'#3a1c5e', accent:'#FF61C6', accent2:'#7B5Cff', glow:true },
    'Mission Control':{ mode:'dark', bg:'#0A0E12', surface:'#11181F', ink:'#E6EEF2', muted:'#7E909B', line:'#1f2a33', accent:'#F2A33C', accent2:'#43C5C9' },
    'Deep Space':    { mode:'dark', bg:'#070914', surface:'#0E1226', ink:'#E8ECFF', muted:'#7C84B0', line:'#181e3c', accent:'#8AB4FF', accent2:'#C9A6FF' },
    'Princess Pastel':{ mode:'light', bg:'#FFF1F7', surface:'#FFFFFF', ink:'#5A2A55', muted:'#B07AA0', line:'#FBD9E8', accent:'#FF7FB6', accent2:'#B59CFF' },
    'Cotton Candy':  { mode:'light', bg:'#F4FBFF', surface:'#FFFFFF', ink:'#3A4A66', muted:'#8AA0BE', line:'#DCEFFB', accent:'#7CC6FF', accent2:'#FFAFD7' },
    'Memphis Pop':   { mode:'light', bg:'#FDF4E3', surface:'#FFFFFF', ink:'#1C1B22', muted:'#6c6a78', line:'#1C1B22', accent:'#FF4D6D', accent2:'#2EC4B6' },
    'Rad Bash':      { mode:'light', bg:'#10D8C9', surface:'#FFFFFF', ink:'#13123A', muted:'#5b5a86', line:'#13123A', accent:'#FF2E88', accent2:'#FFE03A' },
    'Botanical Garden':{ mode:'light', bg:'#F2F6EC', surface:'#FFFFFF', ink:'#26331F', muted:'#6E7B5F', line:'#DDE7CC', accent:'#5E8C4A', accent2:'#E59AB0' },
    'Sage Linen':    { mode:'light', bg:'#F1EFE6', surface:'#FBFAF4', ink:'#2C3128', muted:'#7E8472', line:'#E0DECF', accent:'#7A8B6F', accent2:'#A98E63', texture:true },
    'Hanami Ink':    { mode:'light', bg:'#F6F3EC', surface:'#FFFFFF', ink:'#1C1B18', muted:'#82796B', line:'#E5DECF', accent:'#B23A33', accent2:'#2E2A26', texture:true },
    'Sumi Night':    { mode:'dark', bg:'#11100E', surface:'#1A1816', ink:'#EFE9DC', muted:'#9A9079', line:'#2a2722', accent:'#C4452F', accent2:'#B89968' },
    'Coastal Citrus':{ mode:'light', bg:'#FFFBF0', surface:'#FFFFFF', ink:'#173A4A', muted:'#5e8294', line:'#DCEFF0', accent:'#FF8A3C', accent2:'#2BB1C4' },
    'Merlot Editorial':{ mode:'light', bg:'#F7F0EC', surface:'#FFFFFF', ink:'#2A1719', muted:'#8a6c66', line:'#E7D6CE', accent:'#7C2233', accent2:'#C68A3E' }
  };

  /* ---- WORLDS (§10.3 anchors + bundles) ----------------------------------- */
  const WORLDS = {
    Heritage:   { anchor:{formality:.5,energy:.3,whimsy:.2,warmth:.6,saturation:.4,ornament:.3,texture:.7,motion:.3,luminosity:'light',era:'timeless'},
      fonts:{display:'Fraunces', body:'Inter', accent:'Inter'}, palettes:['Hemlock Field','Forest Lodge','Sage Linen'],
      scenes:['topo','grain'], motifs:['star','stamp'], frames:['stamp','arch'], sections:['lookbook','rail','steps'],
      hero:'framed-media', cta:'Shop the collection', voice:'crafted, understated, earthy' },
    Gala:       { anchor:{formality:.95,energy:.4,whimsy:.1,warmth:.3,saturation:.3,ornament:.55,contrast:.8,motion:.35,luminosity:'dark',era:'deco'},
      fonts:{display:'Cinzel', body:'Cormorant Garamond', accent:'Pinyon Script'}, palettes:['Ballroom Noir','Champagne','Merlot Editorial'],
      scenes:['rayfan','starfield','grain'], motifs:['sparkle','rule'], frames:['arch','locket'], sections:['tiers','stubs','lookbook'],
      hero:'type-mega', cta:'Register to bid', voice:'gracious, restrained, certain' },
    Zen:        { anchor:{formality:.7,energy:.15,whimsy:.1,warmth:.35,saturation:.3,ornament:.1,density:.15,motion:.2,luminosity:'light',era:'timeless'},
      fonts:{display:'Marcellus', body:'Mulish', accent:'Marcellus'}, palettes:['Hanami Ink','Sumi Night','Sage Linen'],
      scenes:['grain'], motifs:['rule','hanko'], frames:['hanko','arch'], sections:['courses','steps'],
      hero:'type-mega', cta:'Reserve a seat', voice:'calm, precise, quiet' },
    Disco:      { anchor:{formality:.4,energy:.8,whimsy:.55,warmth:.5,saturation:.7,ornament:.5,motion:.7,luminosity:'dark',era:'70s'},
      fonts:{display:'Shrikhand', body:'Poppins', accent:'Monoton'}, palettes:['Disco Heat','Vapor Sunset'],
      scenes:['mirrorball','rayfan'], motifs:['star','sunburst'], frames:['vinyl','polaroid'], sections:['tracklist','rail','steps'],
      hero:'framed-media', cta:'RSVP to the floor', voice:'groovy, warm, fun' },
    Cyber:      { anchor:{formality:.1,energy:.95,whimsy:.35,warmth:.4,saturation:1,ornament:.5,contrast:.9,motion:.95,luminosity:'dark',era:'y2k'},
      fonts:{display:'Orbitron', body:'Rajdhani', accent:'Share Tech Mono'}, palettes:['Cyber Afterglow','Vapor Sunset'],
      scenes:['gridfloor','scanlines'], motifs:['chrome','zigzag'], frames:['idcard','polaroid'], sections:['stubs','tiers','steps'],
      hero:'type-mega', cta:'Get tickets', voice:'hype, loud, electric' },
    Princess:   { anchor:{formality:.2,energy:.6,whimsy:.95,warmth:.4,saturation:.6,ornament:.7,motion:.45,luminosity:'light',era:'contemporary'},
      fonts:{display:'Dancing Script', body:'Quicksand', accent:'Baloo 2'}, palettes:['Princess Pastel','Cotton Candy'],
      scenes:['sunburst','confetti'], motifs:['crown','sparkle','dots'], frames:['locket','polaroid'], sections:['steps','rail'],
      hero:'centered', cta:'RSVP', voice:'wonder-struck, sweet, magical' },
    Memphis:    { anchor:{formality:.2,energy:.85,whimsy:.8,warmth:.5,saturation:.85,ornament:.7,contrast:.9,motion:.6,luminosity:'light',era:'80s'},
      fonts:{display:'Archivo Black', body:'Space Grotesk', accent:'Space Grotesk'}, palettes:['Memphis Pop','Rad Bash'],
      scenes:['halftone','confetti'], motifs:['zigzag','dots','star'], frames:['polaroid'], sections:['steps','rail'],
      hero:'centered', cta:'Are you in?!', voice:'loud, playful, exclamatory' },
    MissionCtrl:{ anchor:{formality:.4,energy:.5,whimsy:.25,warmth:.4,saturation:.5,ornament:.3,contrast:.6,motion:.5,luminosity:'dark',era:'retrofuture'},
      fonts:{display:'Saira Condensed', body:'Space Mono', accent:'Space Mono'}, palettes:['Mission Control','Deep Space'],
      scenes:['starfield','blueprint'], motifs:['star','rule'], frames:['porthole','idcard'], sections:['flightplan','stubs'],
      hero:'type-mega', cta:'Send aboard', voice:'precise, retro-technical, mission-brief' },
    Garden:     { anchor:{formality:.4,energy:.3,whimsy:.4,warmth:.5,saturation:.5,ornament:.5,motion:.35,luminosity:'light',era:'timeless'},
      fonts:{display:'Cormorant', body:'Nunito Sans', accent:'Cormorant'}, palettes:['Botanical Garden','Sage Linen','Coastal Citrus'],
      scenes:['mesh','grain'], motifs:['leaf','sparkle'], frames:['arch','locket'], sections:['rail','steps'],
      hero:'framed-media', cta:'RSVP', voice:'fresh, soft, organic' },
    Casino:     { anchor:{formality:.5,energy:.7,whimsy:.3,warmth:.4,saturation:.6,ornament:.5,contrast:.7,motion:.6,luminosity:'dark',era:'deco'},
      fonts:{display:'Cinzel Decorative', body:'Jost', accent:'Monoton'}, palettes:['Casino Gold','Ballroom Noir'],
      scenes:['rayfan','scanlines'], motifs:['suit','sparkle'], frames:['stamp','idcard'], sections:['stubs','tiers','steps'],
      hero:'type-mega', cta:'Claim the loot', voice:'high-roller, sly, confident' }
  };

  /* ---- MOTIFS (inline SVG, recolor via currentColor) ---------------------- */
  const MOTIFS = {
    sparkle:(s=18)=>`<svg viewBox="0 0 24 24" width="${s}" fill="currentColor"><path d="M12 0c1 6 5 10 12 12-7 2-11 6-12 12-1-6-5-10-12-12 7-2 11-6 12-12z"/></svg>`,
    star:(s=18)=>`<svg viewBox="0 0 24 24" width="${s}" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z"/></svg>`,
    crown:(s=22)=>`<svg viewBox="0 0 24 24" width="${s}" fill="currentColor"><path d="M3 8l4 3 5-6 5 6 4-3-2 11H5z"/></svg>`,
    suit:(s=18)=>`<svg viewBox="0 0 24 24" width="${s}" fill="currentColor"><path d="M12 21s-7-4.5-7-9a4 4 0 017-2 4 4 0 017 2c0 4.5-7 9-7 9z"/></svg>`,
    leaf:(s=20)=>`<svg viewBox="0 0 24 24" width="${s}" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14zM7 17C11 13 13 11 17 7"/></svg>`,
    zigzag:(s=70)=>`<svg viewBox="0 0 80 20" width="${s}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M2 10q6-8 12 0t12 0 12 0 12 0 12 0"/></svg>`,
    rule:(s=70)=>`<svg viewBox="0 0 120 8" width="${s}" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M0 4h48"/><path d="M72 4h48"/><circle cx="60" cy="4" r="3" fill="currentColor" stroke="none"/></svg>`,
    dots:(s=60)=>`<svg viewBox="0 0 60 12" width="${s}" fill="currentColor"><circle cx="6" cy="6" r="4"/><circle cx="24" cy="6" r="4"/><circle cx="42" cy="6" r="4"/></svg>`,
    sunburst:(s=22)=>`<svg viewBox="0 0 24 24" width="${s}" fill="currentColor"><g>${Array.from({length:12}).map((_,i)=>`<rect x="11" y="0" width="2" height="7" transform="rotate(${i*30} 12 12)"/>`).join('')}</g></svg>`,
    hanko:(s=34)=>`<svg viewBox="0 0 40 40" width="${s}"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="3"/><path d="M14 14h12M20 13v14M14 26h12" stroke="currentColor" stroke-width="2.2" fill="none"/></svg>`,
    chrome:(s=22)=>`<svg viewBox="0 0 24 24" width="${s}"><defs><linearGradient id="cr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef4ff"/><stop offset=".5" stop-color="#5b6a82"/><stop offset="1" stop-color="#dfe8f5"/></linearGradient></defs><circle cx="12" cy="12" r="9" fill="url(#cr)"/></svg>`,
    stamp:(s=20)=>`<svg viewBox="0 0 24 24" width="${s}" fill="currentColor"><path d="M5 5h14v14H5z" opacity=".15"/><path d="M5 5h14v14H5z" fill="none" stroke="currentColor" stroke-dasharray="2 2" stroke-width="1.4"/></svg>`
  };

  G.STAMP = G.STAMP || {};
  Object.assign(G.STAMP, { FONT_SPECS, fontStack, PALETTES, WORLDS, MOTIFS });

  /* ---- ART-DIRECTION per world (drives the image-engine prompts) ---------- */
  const IMG_STYLE = {
    Heritage:   { style:'earthy editorial product photography, natural window light, fine film grain, muted warm tones, shallow depth of field', subj:'rugged field gear, waxed canvas, misty landscape' },
    Gala:       { style:'chiaroscuro fine-art photography, deep shadow, warm gold rim-light, candle glow, luxurious', subj:'black-tie details, florals, crystal, low candlelight' },
    Zen:        { style:'minimal Japanese still-life, soft overcast daylight, generous negative space, matte ceramic, wabi-sabi', subj:'seasonal cuisine, raw textures, single sprig' },
    Disco:      { style:'1970s analog film photography, warm amber & magenta gels, glitter bokeh, slight motion blur', subj:'mirror ball, spinning vinyl, packed dance floor' },
    Cyber:      { style:'Y2K neon cyber 3D render, chrome and glass, volumetric haze, hard rim light, high contrast', subj:'futuristic club interior, holographic surfaces, laser grid' },
    Princess:   { style:'dreamy pastel illustration, soft bloom glow, floating sparkles, storybook gouache', subj:'whimsical fairytale kingdom, soft clouds' },
    Memphis:    { style:'1980s Memphis-design studio photograph, bold primary colors, geometric props, hard flash, playful', subj:'confetti shapes, squiggles, terrazzo' },
    MissionCtrl:{ style:'retro-futurist space-program photography, analog control panels, starfield, cool teal & amber readouts', subj:'mission control room, capsule, cosmos' },
    Garden:     { style:'botanical natural-light photography, morning dew, gentle soft focus, organic, airy', subj:'wild florals, foliage, long linen table outdoors' },
    Casino:     { style:'high-roller noir photography, emerald felt and gold, art-deco glamour, dramatic spotlight', subj:'playing cards, stacked chips, deco interior' }
  };

  /* ---- IMAGE OPS the engine can request of ANY provider (vendor-neutral) -- */
  const IMG_OPS = {
    generate:    'text → image (hero / card / background)',
    styleRef:    'reference image + prompt → on-brand art (IP-adapter style)',
    edit:        'image + instruction → edited image (relight / restyle / add element)',
    bgRemove:    'image → clean cutout (product / person on transparent)',
    upscale:     'image → high-res restore',
    inpaint:     'mask region → replace (place product into scene)',
    outpaint:    'extend image → full-bleed hero',
    relight:     'recolor / relight to match the theme palette',
    vectorize:   'raster → crisp SVG (logos, motifs)',
    animate:     'image → short loop / parallax / the hero "comes alive"',
    paletteFrom: 'image → extracted palette that seeds the ThemeSpec'
  };

  Object.assign(G.STAMP, { IMG_STYLE, IMG_OPS });
})(window);
