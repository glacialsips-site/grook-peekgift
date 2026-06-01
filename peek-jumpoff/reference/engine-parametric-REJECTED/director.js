/* ============================================================================
   SITE STAMPER · director.js  —  THE TASTE LAYER (chat -> brief)
   Heuristic inference ALWAYS works offline. If window.claude is present we ask
   it to upgrade the read (concept + knobs + copy) and merge over the heuristic.
   ============================================================================ */
(function (G) {
  'use strict';

  /* ---- vibe lexicon -> {world?, knobs{}, concept} (§2.2) ------------------ */
  const LEX = [
    [/neon|glow|glitch|cyber|y2\s?k|rave|techno|edm/, {world:'Cyber', knobs:{saturation:.4,energy:.3}, luminosity:'dark', era:'y2k', concept:'a neon after-dark warehouse'}],
    [/disco|funk|70s|seventies|groov|vinyl|boogie|studio 54/, {world:'Disco', knobs:{energy:.3,whimsy:.2}, luminosity:'dark', era:'70s', concept:'a 1974 record sleeve come to life'}],
    [/princess|fairy|mermaid|unicorn|magic|sparkl|cute|sweet/, {world:'Princess', knobs:{whimsy:.4}, concept:'a storybook kingdom'}],
    [/gala|black.?tie|fundrais|charit|benefit|prestig|old money|legacy|elegant|formal/, {world:'Gala', knobs:{formality:.3,contrast:.2}, luminosity:'dark', era:'deco', concept:'an engraved members-club invitation'}],
    [/casino|vegas|poker|high.?roller|bachelor|stag|loot|atlantic city/, {world:'Casino', knobs:{energy:.2}, luminosity:'dark', era:'deco', concept:'a high-roller casino floor'}],
    [/space|mission|cosmo|astronaut|launch|galaxy|rocket|nasa/, {world:'MissionCtrl', knobs:{}, luminosity:'dark', era:'retrofuture', concept:'a retro mission-control dossier'}],
    [/memphis|80s|eighties|arcade|rad|maximal|bold|loud|wild/, {world:'Memphis', knobs:{energy:.3,whimsy:.3}, concept:'an 80s Memphis pop blowout'}],
    [/zen|omakase|japanese|minimal|calm|quiet|sushi|tea|mindful|kaiseki/, {world:'Zen', knobs:{energy:-.4,ornament:-.4,density:-.3}, concept:'a quiet seasonal counter'}],
    [/garden|botanical|floral|brunch|nature|outdoor|spring|bloom/, {world:'Garden', knobs:{warmth:.2}, concept:'long tables under the trees'}],
    [/heritage|rustic|outdoor|field|craft|workshop|trail|hike|woodsy|outfitter|shop|store|collection|drop/, {world:'Heritage', knobs:{texture:.3,warmth:.2}, concept:'a hand-made field collection'}],
    [/wedding|engaged|marry|bride|groom/, {world:'Gala', knobs:{formality:.2,whimsy:.1}, concept:'a timeless wedding invitation'}]
  ];

  const OCC = [
    [/wedding|marry|bride/, 'wedding'], [/gala|fundrais|charit|benefit/, 'gala'],
    [/rave|club night|warehouse|edm/, 'rave'], [/bachelor|stag/, 'bachelor'],
    [/bachelorette|hen /, 'bachelorette'], [/shop|store|collection|drop|brand|product/, 'shop'],
    [/omakase|tasting|dinner|supper|menu/, 'dinner'], [/garden|brunch/, 'garden'],
    [/baby shower|baby|newborn/, 'baby'], [/corporate|company|offsite|conference|all.?hands/, 'corporate'],
    [/launch|drop/, 'launch'], [/birthday|turns|bday|\bb-?day\b/, 'birthday']
  ];

  function heuristic(text){
    const t = ' ' + text.toLowerCase() + ' ';
    const brief = { raw:text, knobs:{} };
    // occasion
    for (const [re,o] of OCC){ if (re.test(t)){ brief.occasion=o; break; } }
    if (!brief.occasion) brief.occasion = 'birthday';
    // vibe / world / concept
    let conceptSeed=null;
    for (const [re,m] of LEX){
      if (re.test(t)){
        if (!brief.world) brief.world = m.world;
        if (m.luminosity) brief.luminosity = m.luminosity;
        if (m.era) brief.era = m.era;
        if (!conceptSeed) conceptSeed = m.concept;
        for (const k in (m.knobs||{})) brief.knobs[k] = (brief.knobs[k]||0) + m.knobs[k];
      }
    }
    // age
    let am = t.match(/(\d{1,3})\s*(?:st|nd|rd|th)?\s*(?:birthday)/) || t.match(/turns?\s*(\d{1,3})/) || t.match(/(\d{1,2})\s*year/);
    if (am) brief.age = parseInt(am[1],10);
    // recipient name: "X's", or "for X", or "named X"
    let nm = text.match(/([A-Z][a-z]+)(?:'s|’s)\b/) || text.match(/\bfor (?:my )?([A-Z][a-z]+)\b/) || text.match(/\b(?:named|called) ([A-Z][a-z]+)/);
    if (nm && !/^(I|My|The|A|He|She|They|His|Her)$/.test(nm[1])) brief.recipient = nm[1];
    // relationship → label even with adjectives between ("my teenage nephew", "my little sister")
    let rel = t.match(/\bmy (?:\w+\s+){0,2}(dad|father|mom|mother|son|daughter|nephew|niece|brother|sister|wife|husband|grandpa|grandma|grandson|granddaughter|friend|boss|teacher|partner|boyfriend|girlfriend)\b/);
    if (rel){ brief.relationship = rel[1]; if (!brief.recipient) brief.recipient = 'your '+rel[1]; }
    if (/\bgrandma|grandmother\b/.test(t)) brief.fromName = brief.fromName || 'Grandma';
    if (/\bgrandpa|grandfather\b/.test(t)) brief.fromName = brief.fromName || 'Grandpa';

    /* ---- GIFT-BUNDLE detection + STUB connectors (placeholder data; code wires real scrapers) ---- */
    brief.items = [];
    const giftish = /\b(gift|send him|send her|send them|care package|bundle|get him|get her|buy him|buy her|surprise|present|order him|order her)\b/.test(t) || /https?:\/\//.test(text);
    if (giftish){
      brief.gift = true;
      brief.pageType = 'giftbundle';
      // (a) pasted links → STUB scraped product cards (real scrape is NMFP/backend)
      const links = (text.match(/https?:\/\/[^\s)]+/g) || []);
      links.forEach(url=>{
        let host = 'link'; try { host = new URL(url).hostname.replace(/^www\./,''); } catch(e){}
        brief.items.push({ link:url, source:host, kind:'product',
          title:'['+host.split('.')[0]+' item]', sub:'scraped at publish', price:'$—', img:null, _stub:true });
      });
      // (b) homemade mention
      if (/\b(homemade|home-made|matzo|soup|baked|knit|hand-?made|cookies|jam)\b/.test(t))
        brief.items.push({ source:'homemade', kind:'homemade', title:'Something homemade', sub:'made by you', price:'$0', _stub:true });
      // (c) experience / dinner
      if (/\b(dinner|lunch|take (him|her|them) (out|to)|experience|tickets to|a night out|spa|massage)\b/.test(t))
        brief.items.push({ source:'experience', kind:'experience', title:'An experience together', sub:'a night out', price:'$—', _stub:true });
      // (d) "something else idk" → an open slot the chat can fill
      if (/\b(something else|idk|not sure|more stuff|a few things|and stuff)\b/.test(t))
        brief.items.push({ source:'idea', kind:'idea', title:'+ one more idea', sub:'tell me & I\u2019ll add it', price:'', _stub:true });
    }
    // action goal
    if (/\bbid|auction\b/.test(t)) brief.ctaGoal='bid';
    else if (/\bshop|buy|store\b/.test(t)) brief.ctaGoal='shop';
    else if (/\bticket\b/.test(t)) brief.ctaGoal='tickets';
    else brief.ctaGoal='rsvp';
    // gift bundles: theme by WHO it's for — override any weak "shopping"→shop keyword
    if (brief.gift){
      const forced =
        /\byard|garden|grill|fish|hunt|woodwork|outdoors|hik|camp|truck|tools?|diy\b/.test(t) ? 'Heritage'
      : /\bteen|college|nephew|niece|son|daughter|kid|young|gamer|student|grad\b/.test(t) ? 'Memphis'
      : /\bdad|father|grandpa|grandfather|uncle\b/.test(t) ? 'Heritage'
      : /\bmom|mother|grandma|grandmother|aunt|wife|girlfriend|\bher\b/.test(t) ? 'Garden'
      : 'Heritage';
      // only keep an explicit strong vibe word (disco/cyber/etc set via LEX); else force the relationship world
      const strongVibe = /neon|cyber|disco|gala|princess|mermaid|casino|space|memphis|zen|omakase/.test(t);
      if (!strongVibe) brief.world = forced;
      brief.luminosity = brief.luminosity || 'light';
      if (brief.occasion==='shop') brief.occasion = 'birthday'; // "shopping for" ≠ storefront
    }
    brief.concept = conceptSeed || (brief.gift ? 'a care package, picked by hand' : null);
    brief._source = 'heuristic';
    return brief;
  }

  /* ---- LLM upgrade (optional) -------------------------------------------- */
  async function llmUpgrade(text, base){
    if (!(G.claude && typeof G.claude.complete === 'function')) return base;
    const worlds = Object.keys(G.STAMP.WORLDS).join(', ');
    const prompt =
`You are a Design Director for a site-builder. Read the user's request and output STRICT JSON only (no prose).
User: """${text}"""
Choose ONE world from: ${worlds}.
Return:
{"world":"<one>","occasion":"<word>","recipient":"<name or null>","age":<int or null>,
 "luminosity":"light|dark","era":"timeless|deco|70s|80s|y2k|retrofuture|contemporary",
 "concept":{"oneLiner":"<a SPECIFIC concept that excludes generic options>","boldMove":"<the one signature gesture>","voice":"<3 adjectives>"},
 "knobs":{"formality":0..1,"energy":0..1,"whimsy":0..1,"saturation":0..1,"ornament":0..1},
 "headline":"<<=5 words, may use \\n once>","dek":"<one vivid sentence>","cta":"<2-4 words>","colorHint":"<#hex or null>"}
Be bold and specific. Infer everything; do not ask questions.`;
    try {
      const out = await G.claude.complete({ messages:[{role:'user',content:prompt}] });
      const j = JSON.parse((out||'').replace(/```json|```/g,'').trim().match(/\{[\s\S]*\}/)[0]);
      const b = Object.assign({}, base);
      // heuristic keyword world is authoritative; LLM only chooses a world when heuristic is unsure
      if (j.world && G.STAMP.WORLDS[j.world] && !base.world) b.world = j.world;
      if (j.occasion) b.occasion = j.occasion;
      // never let the LLM flip a gift-bundle back into an event
      if (base.gift){ b.gift=true; b.pageType='giftbundle'; b.items=base.items; }
      if (j.recipient && j.recipient!=='null') b.recipient = j.recipient;
      if (typeof j.age==='number') b.age = j.age;
      if (j.luminosity) b.luminosity = j.luminosity;
      if (j.era) b.era = j.era;
      if (j.colorHint && /^#/.test(j.colorHint)) b.colorHint = j.colorHint;
      // knobs are absolute from the LLM
      if (j.knobs){ b.knobs = Object.assign({}, b.knobs); for (const k in j.knobs){ b.knobs[k]=j.knobs[k]; b.knobs[k+'__abs']=true; } }
      if (j.concept){ b.concept = j.concept.oneLiner; b.boldMove=j.concept.boldMove; b.voice=j.concept.voice; }
      if (j.headline) b.headline = j.headline;
      if (j.dek) b.dek = j.dek;
      if (j.cta) b.ctaLabel = j.cta;
      b._source = 'llm';
      return b;
    } catch(e){ console.warn('director llm fallback', e); return base; }
  }

  async function director(text, { useLLM=true } = {}){
    const base = heuristic(text||'');
    if (useLLM) return await llmUpgrade(text||'', base);
    return base;
  }

  G.STAMP.director = director;
  G.STAMP.heuristic = heuristic;
})(window);
