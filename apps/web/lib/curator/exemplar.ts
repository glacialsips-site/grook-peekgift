// ============================================================================
// peek.gift — THE FEW-SHOT EXEMPLAR (one finished, interaction-tagged page)
// ----------------------------------------------------------------------------
// A frozen, byte-stable cached few-shot: the founder's own "For the Old Man"
// mockup (dad's 60th, always out on the mower) — a hand-built kraft work-order
// page — UPGRADED so every claimable/interactive bit carries the data-peek-*
// contract the host runtime (peek-runtime.js) turns into selection, the sheet,
// and checkout. Its design is untouched (Oswald + Roboto Mono, kraft palette,
// "The Haul" supply list with retailer chips + prices, the perforated steak-
// dinner ticket, the personal note, the running total, the "Send it to Dad" CTA).
//
// This is the BAR and the SHAPE — what a finished, screenshot-worthy, fully
// tagged page looks like — NEVER a template to copy. Each gift earns its own
// type, color, layout, and copy; the only thing portable here is the *caliber*
// and the *tagging discipline*: real markup, decoration in CSS/SVG, behavior
// declared via data-peek-* and left to the host. No <script>, no <form>, no
// <input> — every affordance is a tag.
//
// FROZEN STRING — no interpolation, byte-stable (a cacheable suffix).
// ============================================================================

export const PEEK_FEWSHOT = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>For the Old Man — 60th</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;700&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  :root{
    --kraft:#C9B795; --kraft2:#BFAA83; --card:#F3ECDB; --olive:#39411F; --ink:#26240E;
    --rust:#B0532A; --muted:#6E6443; --line:#A8946C;
  }
  *{box-sizing:border-box} html,body{margin:0}
  body{background:#171407;display:flex;justify-content:center;min-height:100vh;font-family:"Work Sans",system-ui,sans-serif}
  .phone{width:100%;max-width:430px;background:var(--kraft);color:var(--ink);position:relative;overflow:hidden}
  .phone::before{content:"";position:fixed;inset:0;max-width:430px;margin:0 auto;pointer-events:none;z-index:0;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.0' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='.07'/></svg>")}
  .wrap{position:relative;z-index:1}

  .bar{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:2px solid var(--ink)}
  .stamp{font-family:"Oswald";font-weight:700;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink)}
  .stamp b{color:var(--rust)}
  .ord{font-family:"Roboto Mono";font-size:11px;color:var(--muted)}

  /* work-order header */
  .head{padding:22px 20px 18px}
  .tag{display:inline-block;font-family:"Roboto Mono";font-size:11px;letter-spacing:.04em;color:var(--card);background:var(--olive);padding:5px 10px;border-radius:3px;margin-bottom:16px}
  h1{font-family:"Oswald";font-weight:700;font-size:58px;line-height:.9;text-transform:uppercase;color:var(--olive);margin:0;letter-spacing:.005em}
  h1 em{font-style:normal;color:var(--rust)}
  .sub{font-family:"Roboto Mono";font-size:13px;color:var(--muted);margin-top:14px;line-height:1.5}
  .meta{display:flex;gap:0;margin-top:18px;border:2px solid var(--ink);border-radius:6px;overflow:hidden}
  .meta div{flex:1;padding:10px 12px;border-right:2px solid var(--ink)}
  .meta div:last-child{border-right:none}
  .meta .l{font-family:"Roboto Mono";font-size:9px;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}
  .meta .v{font-family:"Oswald";font-weight:600;font-size:16px;color:var(--ink);margin-top:3px}

  /* photo */
  .photo{margin:18px 20px;height:200px;border-radius:8px;border:2px solid var(--ink);overflow:hidden;position:relative;
    background:linear-gradient(135deg,#5a5a32,#9a6b3e);filter:saturate(.7)}
  .photo .ph{position:absolute;inset:0;display:grid;place-items:center;color:rgba(255,255,255,.7);font-family:"Roboto Mono";font-size:12px;letter-spacing:.1em}
  .photo .cap{position:absolute;left:0;right:0;bottom:0;padding:8px 12px;background:rgba(38,36,14,.7);color:var(--card);font-family:"Roboto Mono";font-size:11px}

  /* supply list */
  .sec{padding:8px 20px 22px}
  .sectitle{display:flex;align-items:center;gap:12px;margin:14px 0 14px}
  .sectitle h2{font-family:"Oswald";font-weight:600;font-size:20px;text-transform:uppercase;color:var(--olive);margin:0;letter-spacing:.04em}
  .sectitle .rule{flex:1;height:2px;background:var(--line)}
  .sectitle .n{font-family:"Roboto Mono";font-size:11px;color:var(--muted)}

  .line{display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:13px;padding:14px 0;border-bottom:1px dashed var(--line);cursor:pointer}
  .chk{width:22px;height:22px;border:2px solid var(--ink);border-radius:4px;display:grid;place-items:center;color:var(--rust)}
  /* the host stamps data-peek-picked on a chosen card — light the checkbox up */
  .line .chk svg{opacity:0;transition:opacity .15s}
  .line[data-peek-picked] .chk{background:var(--rust);border-color:var(--rust);color:var(--card)}
  .line[data-peek-picked] .chk svg{opacity:1}
  .line .nm{font-family:"Oswald";font-weight:500;font-size:17px;text-transform:uppercase;color:var(--ink);letter-spacing:.01em}
  .line .d{font-family:"Roboto Mono";font-size:11px;color:var(--muted);margin-top:2px}
  .line .pr{font-family:"Oswald";font-weight:600;font-size:16px;color:var(--olive)}
  .src{font-family:"Roboto Mono";font-size:9px;letter-spacing:.04em;text-transform:uppercase;color:var(--olive);background:rgba(57,65,31,.12);padding:2px 6px;border-radius:3px}
  .src.h{color:var(--rust);background:rgba(176,83,42,.12)}

  /* the dinner ticket — centerpiece */
  .ticket{margin:20px;background:var(--olive);color:var(--card);border-radius:10px;padding:20px;position:relative;overflow:hidden;cursor:pointer}
  .ticket::before,.ticket::after{content:"";position:absolute;width:22px;height:22px;background:var(--kraft);border-radius:50%;top:50%;transform:translateY(-50%)}
  .ticket::before{left:-11px} .ticket::after{right:-11px}
  .ticket .tl{font-family:"Roboto Mono";font-size:10px;letter-spacing:.18em;opacity:.8}
  .ticket .tt{font-family:"Oswald";font-weight:700;font-size:28px;text-transform:uppercase;margin:6px 0 4px;letter-spacing:.01em}
  .ticket .tm{font-family:"Roboto Mono";font-size:12px;opacity:.85;line-height:1.5}
  .ticket .perf{border-top:2px dashed rgba(243,236,219,.4);margin:14px -20px 0;padding:12px 20px 0;display:flex;justify-content:space-between;align-items:center}
  .ticket .seat{font-family:"Oswald";font-weight:600;font-size:14px}
  /* chosen state for the centerpiece — a stamped, claimed edge */
  .ticket[data-peek-picked]{box-shadow:0 0 0 3px var(--rust)}

  /* note */
  .note{margin:0 20px 18px;font-family:"Roboto Mono";font-size:13px;line-height:1.65;color:var(--ink);background:var(--card);border:2px solid var(--ink);border-radius:8px;padding:18px}
  .note b{color:var(--rust)}

  .cta{position:sticky;bottom:0;z-index:5;background:linear-gradient(180deg,rgba(201,183,149,0),var(--kraft) 30%);padding:16px 20px 22px;display:flex;gap:12px;align-items:center}
  .cta .tot{flex:1;font-family:"Oswald";font-weight:600;font-size:18px;color:var(--olive);text-transform:uppercase}
  .cta .tot small{display:block;font-family:"Roboto Mono";font-size:10px;color:var(--muted);letter-spacing:.08em;text-transform:none}
  .send{border:none;background:var(--rust);color:var(--card);font-family:"Oswald";font-weight:600;font-size:15px;text-transform:uppercase;letter-spacing:.04em;padding:15px 22px;border-radius:6px;cursor:pointer}

  .foot{text-align:center;padding:20px;border-top:2px solid var(--ink);font-family:"Roboto Mono";font-size:11px;color:var(--muted)}
</style>
</head>
<body>
<div class="phone"><div class="wrap">
  <div class="bar"><div class="stamp">PEEK<b>.</b>GIFT — WORK ORDER</div><div class="ord">№ 0060</div></div>

  <div class="head">
    <span class="tag">JOB: DAD'S 60TH BIRTHDAY</span>
    <h1>FOR THE<br><em>OLD MAN</em></h1>
    <p class="sub">// 60 years. Still out there every Saturday with the mower.<br>// Time we did something for him.</p>
    <div class="meta">
      <div><div class="l">For</div><div class="v">Big Ray</div></div>
      <div><div class="l">Occasion</div><div class="v">The Big 6-0</div></div>
      <div><div class="l">From</div><div class="v">The Kids</div></div>
    </div>
  </div>

  <div class="photo"><div class="ph">[ YOUR PHOTO ]</div><div class="cap">Dad + me, opening day at the lake · 2024</div></div>

  <div class="sec">
    <div class="sectitle"><h2>The Haul</h2><div class="rule"></div><span class="n">3 ITEMS</span></div>

    <div class="line" data-peek-card data-kind="product" data-peek-id="leather-work-gloves"
      data-name="Leather Work Gloves" data-price="44" data-src="Duluth"
      data-desc="The good ones, finally — full-grain leather, the pair he'd never buy himself. Built for the Saturday he's already planning.">
      <div class="chk"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" fill="none"><path d="M5 12l5 5L20 6"/></svg></div>
      <div><div class="nm">Leather Work Gloves</div><div class="d"><span class="src">duluth</span> &nbsp;the good ones, finally</div></div><div class="pr">$44</div></div>

    <div class="line" data-peek-card data-kind="product" data-peek-id="heirloom-tomato-seeds"
      data-name="Heirloom Tomato Seeds" data-price="16" data-src="Amazon"
      data-desc="For the garden he won't stop talking about. Brandywine, Cherokee Purple, Green Zebra — the ones you actually can't find at the store.">
      <div class="chk"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" fill="none"><path d="M5 12l5 5L20 6"/></svg></div>
      <div><div class="nm">Heirloom Tomato Seeds</div><div class="d"><span class="src">amazon</span> &nbsp;for the garden he won't stop talking about</div></div><div class="pr">$16</div></div>

    <div class="line" data-peek-card data-kind="product" data-peek-id="six-pack-of-his-lager"
      data-name="A Six-Pack of His Lager" data-price="14" data-src="Local"
      data-desc="You know the one — the amber lager from the brewery two towns over he swears is the best in the state. We'll have it cold and waiting.">
      <div class="chk"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" fill="none"><path d="M5 12l5 5L20 6"/></svg></div>
      <div><div class="nm">A Six-Pack of His Lager</div><div class="d"><span class="src h">local</span> &nbsp;you know the one</div></div><div class="pr">$14</div></div>
  </div>

  <div class="ticket" data-peek-card data-kind="experience" data-peek-id="steak-dinner-on-us"
    data-name="Steak Dinner, On Us" data-src="The Main Event"
    data-desc="Admit two. Friday · 7:30 PM at that chophouse downtown he's been eyeing for a decade. Table for two, on us — no lawn allowed.">
    <div class="tl">ADMIT TWO · THE MAIN EVENT</div>
    <div class="tt">Steak Dinner,<br>On Us</div>
    <div class="tm">Friday · 7:30 PM · that chophouse downtown<br>he's been eyeing for a decade.</div>
    <div class="perf"><span class="seat">TABLE FOR 2</span><span class="tl">NO LAWN ALLOWED</span></div>
  </div>

  <div class="note">// He'll say you <b>shouldn't have</b>.<br>// He'll mean <b>thank you</b>.<br>// 60 looks good on you, Dad.</div>

  <div class="foot">FOR BIG RAY · peek.gift/old-man-60</div>

  <div class="cta">
    <div class="tot">$74 + dinner<small>The whole job</small></div>
    <button type="button" class="send" data-peek-action="claim">Send it to Dad →</button>
  </div>
</div></div>
</body>
</html>`;
