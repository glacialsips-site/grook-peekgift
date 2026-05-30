import type { DesignTokens, FontFace } from "@peek/design-tokens";
import type { Genome } from "@peek/vibe-genome";

/** Build the Google Fonts stylesheet URL from the resolved faces. */
export function fontsUrl(faces: FontFace[]): string {
  const params = faces
    .map((f) => {
      const fam = f.family.replace(/ /g, "+");
      const weights = [...new Set(f.weights)].sort((a, b) => a - b);
      if (f.italic) {
        const axis = weights.map((w) => `0,${w}`).concat(weights.map((w) => `1,${w}`)).join(";");
        return `family=${fam}:ital,wght@${axis}`;
      }
      return `family=${fam}:wght@${weights.join(";")}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

const caseRule = (c: "none" | "upper" | "lower"): string =>
  c === "upper" ? "uppercase" : c === "lower" ? "lowercase" : "none";

/** Body background expression per color.application. */
function bodyBackground(t: DesignTokens): string {
  const c = t.color;
  const a = c.accents;
  switch (c.application) {
    case "gradient":
      return `radial-gradient(120% 90% at 85% -10%, ${(a[1] ?? a[0]) + "22"}, transparent 55%), radial-gradient(90% 70% at 0% 0%, ${a[0] + "1c"}, transparent 50%), ${c.bg}`;
    case "glow":
      return `radial-gradient(70% 50% at 50% 0%, ${a[0] + "26"}, transparent 60%), ${c.bg}`;
    case "holographic":
      return `linear-gradient(135deg, ${c.bg}, ${(a[2] ?? a[0]) + "14"}, ${c.bg}, ${(a[1] ?? a[0]) + "14"}, ${c.bg})`;
    case "flat":
    default:
      return c.bg;
  }
}

/** The full stylesheet for a peek. Everything is driven by the resolved tokens. */
export function buildCss(t: DesignTokens, genome: Genome): string {
  const c = t.color;
  const ty = t.type;
  const k = genome.knobs;
  const a0 = c.accents[0] ?? c.accentDeep;
  const a1 = c.accents[1] ?? a0;
  const a2 = c.accents[2] ?? a1;
  const holo = c.application === "holographic";

  return `
:root{
  --bg:${c.bg}; --surface:${c.surface}; --ink:${c.ink}; --muted:${c.muted}; --faint:${c.faint}; --line:${c.line};
  --accent:${a0}; --accent2:${a1}; --accent3:${a2}; --accent-deep:${c.accentDeep}; --accent-wash:${c.accentWash}; --on-accent:${c.onAccent};
  --font-display:${ty.display.family}; --font-body:${ty.body.family};
  --font-script:${ty.script?.family ?? ty.display.family}; --font-mono:${ty.mono?.family ?? "ui-monospace, monospace"};
  --size-display:${ty.display.size}; --size-heading:${ty.heading.size}; --size-sub:${ty.heading.size}; --size-body:${ty.body.size}; --size-eyebrow:${ty.eyebrow.size};
  --w-display:${ty.display.weight}; --w-body:${ty.body.weight};
  --track-display:${ty.display.tracking}; --track-eyebrow:${ty.eyebrow.tracking}; --lead-display:${ty.display.leading};
  --radius-btn:${t.radius.button}; --radius-card:${t.radius.card}; --pill:${t.radius.pill};
  --shadow-card:${t.shadow.card}; --shadow-btn:${t.shadow.button};
  --border:${t.shadow.border.weight} ${t.shadow.border.style} ${t.shadow.border.color};
  --ease:${t.motion.easing.standard}; --ease-reveal:${t.motion.easing.reveal}; --dur:${t.motion.durations.base}; --dur-marquee:${t.motion.durations.marquee};
  --section:${t.space.section}; --gap:${t.space.gridGap}; --container:${t.space.container};
  --glass-blur:${t.texture.glassBlur}px; --glass-sat:${t.texture.glassSaturate}%;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{
  background:${bodyBackground(t)}; ${holo ? "background-size:300% 300%;animation:holo 18s ease infinite;" : ""}
  color:var(--ink); font:var(--w-body) var(--size-body)/1.55 var(--font-body);
  -webkit-font-smoothing:antialiased; overflow-x:hidden;
}
.wrap{max-width:var(--container);margin:0 auto;padding:0 24px}
h1,h2,h3{font-family:var(--font-display);font-weight:var(--w-display);line-height:1.04;text-transform:${caseRule(ty.heading.case)}}
a{color:inherit;text-decoration:none}
.eyebrow{display:inline-block;font:700 var(--size-eyebrow)/1 var(--font-body);letter-spacing:var(--track-eyebrow);text-transform:uppercase;color:var(--accent)}
em{font-style:italic;color:var(--accent)}
.muted{color:var(--muted)}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:.5em;font:700 14.5px/1 var(--font-body);letter-spacing:.04em;
  padding:15px 26px;border-radius:var(--radius-btn);cursor:pointer;transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease);border:none}
.btn-primary{background:var(--accent-deep);color:var(--on-accent);box-shadow:var(--shadow-btn)}
.btn-primary:hover{transform:translateY(-2px)}
.btn-ghost{background:transparent;color:var(--ink);border:var(--border)}
.btn-link{background:none;padding:0;color:var(--accent)}

/* nav */
.nav{position:sticky;top:0;z-index:50;backdrop-filter:blur(var(--glass-blur)) saturate(var(--glass-sat));
  background:color-mix(in srgb,var(--bg) 78%,transparent);border-bottom:0.5px solid var(--line)}
.nav .wrap{display:flex;align-items:center;justify-content:space-between;padding-top:16px;padding-bottom:16px}
.brand{font-family:var(--font-display);font-weight:700;font-size:22px}
.brand.script{font-family:var(--font-script);font-size:30px;font-weight:400;color:var(--accent)}
.nav-links{display:flex;gap:26px;align-items:center}
.nav-links a{font-size:13.5px;color:var(--muted)}
.nav-links a:hover{color:var(--ink)}
@media(max-width:760px){.nav-links{display:none}}

/* hero */
.hero{position:relative;overflow:hidden;padding:var(--section) 0}
.hero .wrap{position:relative;z-index:2}
.hero.split .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
@media(max-width:820px){.hero.split .wrap{grid-template-columns:1fr;gap:32px}}
.hero.centered{text-align:center}
.hero.centered .hero-cta,.hero.centered .hero-meta{justify-content:center}
.hero-greeting{font-family:var(--font-script);font-size:clamp(28px,5vw,46px);color:var(--accent);margin-bottom:6px;display:block}
.hero h1{font-size:var(--size-display);line-height:var(--lead-display);letter-spacing:var(--track-display);margin:6px 0}
.hero-lede{font-size:clamp(16px,2.2vw,20px);color:var(--muted);max-width:34em;margin:18px 0 0;line-height:1.5}
.hero.centered .hero-lede{margin-left:auto;margin-right:auto}
.hero-meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.hero-meta .pill{font:600 12.5px/1 var(--font-body);letter-spacing:.04em;padding:9px 15px;border-radius:var(--pill);background:var(--accent-wash);color:var(--accent-deep)}
.hero-cta{display:flex;flex-wrap:wrap;gap:14px;margin-top:30px}
.hero-media{position:relative;aspect-ratio:4/5;border-radius:var(--radius-card);overflow:hidden;box-shadow:var(--shadow-card);
  background:linear-gradient(160deg,var(--accent),var(--accent-deep))}
.hero-media.arched{border-radius:300px 300px var(--radius-card) var(--radius-card)}
.hero-media.circular{border-radius:50%;aspect-ratio:1}
.hero-media .ph{position:absolute;inset:0;display:grid;place-items:center;font-size:4rem;opacity:.85}

/* marquee */
.marquee{border-top:0.5px solid var(--line);border-bottom:0.5px solid var(--line);padding:16px 0;overflow:hidden;white-space:nowrap;
  background:${holo ? "transparent" : "var(--accent-wash)"}}
.marquee .track{display:inline-block;animation:marquee var(--dur-marquee) linear infinite;font-family:var(--font-display);font-weight:600;font-size:18px}
.marquee .track span{margin:0 18px;color:var(--accent-deep)}
.marquee .track .sep{color:var(--accent);opacity:.7}

/* section heads + collection */
.section{padding:var(--section) 0}
.sec-head{margin-bottom:40px}
.hero.centered ~ .section .sec-head,.section.center .sec-head{text-align:center}
.sec-head h2{font-size:var(--size-heading);margin-top:8px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gap)}
@media(max-width:820px){.grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.grid{grid-template-columns:1fr}}
.card{background:var(--surface);border:var(--border);border-radius:var(--radius-card);overflow:hidden;
  box-shadow:var(--shadow-card);transition:transform var(--dur) var(--ease)}
.card:hover{transform:translateY(-6px)}
.card-media{aspect-ratio:4/3;display:grid;place-items:center;font-size:3rem;position:relative;
  background:linear-gradient(150deg,var(--accent),var(--accent-deep))}
.card-body{padding:18px 18px 22px}
.card .badge{position:absolute;top:10px;right:10px;font:700 10px/1 var(--font-body);letter-spacing:.5px;
  padding:5px 9px;border-radius:var(--pill);background:var(--accent);color:var(--on-accent)}
.card h3{font-size:21px;margin-bottom:4px}
.card .sub{font-size:13px;color:var(--faint);margin-bottom:8px}
.card .desc{font-size:14px;color:var(--muted);line-height:1.5}
.card .row{display:flex;align-items:center;justify-content:space-between;margin-top:14px}
.card .price{font-weight:700;color:var(--ink)}
.card .claim{font:700 12px/1 var(--font-body);color:var(--accent-deep);background:var(--accent-wash);border:none;padding:9px 13px;border-radius:var(--pill);cursor:pointer}

/* form */
.form-block{text-align:center;padding:var(--section) 0}
.form-card{max-width:560px;margin:0 auto;background:var(--surface);border:var(--border);border-radius:var(--radius-card);
  padding:48px 36px;box-shadow:var(--shadow-card);position:relative;overflow:hidden}
.form-card h2{font-size:var(--size-heading);margin:8px 0 10px}
.form-card .row{display:flex;gap:10px;margin-top:24px}
.form-card input{flex:1;font:500 15px/1 var(--font-body);padding:15px 18px;border-radius:var(--radius-btn);
  border:var(--border);background:var(--bg);color:var(--ink)}
.form-card .fine{font-size:12px;color:var(--faint);margin-top:14px}

/* footer */
.footer{padding:64px 0 56px;border-top:0.5px solid var(--line);text-align:center;margin-top:var(--section)}
.footer .brand{font-size:26px;margin-bottom:10px}
.footer .lines{color:var(--muted);font-size:14px;line-height:1.9}
.footer .legal{color:var(--faint);font-size:12px;margin-top:18px}

/* keyframes */
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes holo{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes twinkle{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1.1)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes drift{from{transform:translateY(0)}to{transform:translateY(-1400px)}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`.trim();
}
