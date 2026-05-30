import { genomeSchema, type Genome } from "@peek/vibe-genome";
import { peekSchema, type Peek } from "@peek/site-ir";

/**
 * Three deliberately-divergent hand-authored genomes + peeks. Same renderer, wildly different
 * tokens -> the proof that diversity is carried by the genome, not by bespoke per-site code.
 * (Genomes are hand-authored here; the Brief -> Genome synthesis is P3.) Parsed at module load,
 * so a malformed fixture throws loudly rather than rendering garbage.
 */

const princessGenome: Genome = genomeSchema.parse({
  version: 1,
  seed: 7,
  meta: { energy: 0.55, refinement: 0.5, formality: 0.3, warmth: 0.8, playfulness: 0.85, opulence: 0.5, boldness: 0.45, naturalism: 0.6, density: 0.4, era: "contemporary", eraStrength: 0.2 },
  knobs: {
    layout: { archetype: "centered-invite", heroLayout: "split-lr", contentRhythm: "single-column-cards", containerWidth: 1180, focal: "single-hero", layering: 0.3 },
    type: { displayClass: "script-led", pairing: "expressive-neutral", useScript: true, useMono: false, case: "title", tracking: 0.4, scaleRatio: 1.4, weightContrast: 0.5, headingScaleMax: 92, bodyWeight: 500, animacy: 0.6 },
    color: { base: "light", application: "gradient", hueAnchors: [330], harmony: "analogous", accentCount: 3, saturation: 0.68, lightnessMood: 0.85, temperature: 0.68, contrast: 0.6 },
    motif: { vocabulary: ["celestial", "heraldic"], density: "high", generation: "curated" },
    texture: { kind: "none", surfaceShadow: "soft-tint", glassBlur: 14 },
    shape: { edgeTreatment: "round", radiusButton: 999, radiusCard: 26, radiusSheet: 30, borderWeight: 1.5, borderStyle: "dotted" },
    motion: { intensity: "ambient", easingProfile: "springy", loopSpeed: 0.5 },
    density: { whitespace: "medium" },
    imagery: { strategy: "glyph-filled", photoFrame: "arched", photoFilter: "none" },
    voice: { tone: "whimsical", verbosity: 0.5, wit: 0.6 },
    capability: { primary: "rsvp", giftModel: "claim" },
  },
});

const cyberGenome: Genome = genomeSchema.parse({
  version: 1,
  seed: 2087,
  meta: { energy: 0.95, refinement: 0.3, formality: 0.35, warmth: 0.35, playfulness: 0.6, opulence: 0.4, boldness: 0.9, naturalism: 0.15, density: 0.85, era: "y2k", eraStrength: 0.8 },
  knobs: {
    layout: { archetype: "dashboard-hud", heroLayout: "split-lr", contentRhythm: "multi-section-grid", containerWidth: 1180, focal: "single-hero", layering: 0.6 },
    type: { displayClass: "techno-mono", pairing: "contrast", useScript: false, useMono: true, case: "upper", tracking: 0.8, scaleRatio: 1.6, weightContrast: 0.7, headingScaleMax: 110, bodyWeight: 400, animacy: 0.9 },
    color: { base: "dark", application: "holographic", hueAnchors: [330, 190], harmony: "clash", accentCount: 4, saturation: 0.95, lightnessMood: 0.3, temperature: 0.4, contrast: 0.9 },
    motif: { vocabulary: ["chrome", "geometric"], density: "maximal", generation: "curated" },
    texture: { kind: "scanlines", surfaceShadow: "neon-glow", glassBlur: 18 },
    shape: { edgeTreatment: "chamfer", radiusButton: 4, radiusCard: 6, radiusSheet: 14, borderWeight: 1, borderStyle: "solid" },
    motion: { intensity: "live", easingProfile: "standard", loopSpeed: 0.9 },
    density: { whitespace: "dense" },
    imagery: { strategy: "glyph-filled", photoFrame: "none", photoFilter: "none" },
    voice: { tone: "hype", verbosity: 0.4, wit: 0.7 },
    capability: { primary: "ticketing", giftModel: "buy" },
  },
});

const hemlockGenome: Genome = genomeSchema.parse({
  version: 1,
  seed: 1846,
  meta: { energy: 0.35, refinement: 0.7, formality: 0.55, warmth: 0.7, playfulness: 0.15, opulence: 0.45, boldness: 0.4, naturalism: 0.6, density: 0.35, era: "timeless", eraStrength: 0.2 },
  knobs: {
    layout: { archetype: "editorial-commerce", heroLayout: "split-lr", contentRhythm: "multi-section-grid", containerWidth: 1240, focal: "single-hero", layering: 0.2 },
    type: { displayClass: "humanist-serif", pairing: "harmonious", useScript: false, useMono: false, case: "sentence", tracking: 0.3, scaleRatio: 1.35, weightContrast: 0.4, headingScaleMax: 104, bodyWeight: 400, animacy: 0.1 },
    color: { base: "light", application: "flat", hueAnchors: [40], harmony: "analogous", accentCount: 2, saturation: 0.45, lightnessMood: 0.7, temperature: 0.78, contrast: 0.85 },
    motif: { vocabulary: [], density: "low", generation: "curated" },
    texture: { kind: "grain", surfaceShadow: "soft-tint", glassBlur: 16 },
    shape: { edgeTreatment: "square", radiusButton: 0, radiusCard: 8, radiusSheet: 22, borderWeight: 0.5, borderStyle: "solid" },
    motion: { intensity: "hover", easingProfile: "premium", loopSpeed: 0.2 },
    density: { whitespace: "generous" },
    imagery: { strategy: "glyph-filled", photoFrame: "none", photoFilter: "none" },
    voice: { tone: "craft", verbosity: 0.5, wit: 0.2 },
    capability: { primary: "commerce", giftModel: "buy" },
  },
});

const gift = (id: string, name: string, price: string, glyph: string, desc: string, verb: string) => ({
  id, name, price, description: desc, media: { kind: "glyph", glyph, frame: "none" },
  claim: { model: "claim", label: verb },
});

const princessPeek: Peek = peekSchema.parse({
  version: 1,
  meta: { id: "pk_lily", curatorId: "cur_demo", slug: "princess-lily", title: "Princess Lily turns Six" },
  theme: { genomeRef: "princess" },
  capabilities: ["rsvp", "gift-claim"],
  sections: [
    { kind: "nav", id: "n", brand: { text: "Lily", style: "script" }, links: [{ label: "Details" }, { label: "Wishlist" }, { label: "RSVP" }], trailingAction: { label: "RSVP" } },
    { kind: "hero", id: "h", eyebrow: "You're invited", greeting: "Once upon a time…", title: { lines: ["Princess Lily", "turns Six"], emphasis: [1] }, lede: "Join us for an afternoon of crowns, cupcakes, and happily-ever-afters in the rose garden.", meta: [{ key: "When", value: "Sat · May 30" }, { key: "Where", value: "The Rose Garden" }], media: { kind: "glyph", glyph: "👑", frame: "arched" }, ctas: [{ label: "Say you'll come ✦" }], backgroundEffect: "sunburst" },
    { kind: "marquee", id: "m", items: ["Crowns", "Cupcakes", "Unicorns", "Confetti", "Fairy dust"], separator: "✦" },
    { kind: "collection", id: "c", variant: "gifts", head: { eyebrow: "Her Wishlist", title: "Treasures fit for a princess" }, items: [
      gift("g1", "Jewelled Tiara", "$28", "👑", "Every queen needs her crown — this one actually sparkles.", "I'll bring this ♡"),
      gift("g2", "Enchanted Unicorn", "$42", "🦄", "An impossibly-soft companion for royal afternoon naps.", "I'll bring this ♡"),
      gift("g3", "Storybook Castle", "$76", "🏰", "Three floors of happily-ever-after, towers included.", "I'll bring this ♡"),
    ] },
    { kind: "form", id: "f", capability: "rsvp", eyebrow: "Kindly RSVP", title: { lines: ["Say you'll", "be there"], emphasis: [1] }, body: "We can't wait to celebrate with you.", field: { type: "email", placeholder: "your email" }, submit: { label: "Send my RSVP", successLabel: "See you there!" }, finePrint: "Kindly répondez by May 20", backgroundEffect: "radial-glow" },
    { kind: "footer", id: "ft", brand: "Princess Lily", tagline: "with all our love", centeredLines: ["The Rose Garden · 2pm", "Saturday, May 30"], legal: "made with love on peek.gift" },
  ],
});

const cyberPeek: Peek = peekSchema.parse({
  version: 1,
  meta: { id: "pk_glow", curatorId: "cur_demo", slug: "afterglow", title: "AFTERGLOW" },
  theme: { genomeRef: "cyber" },
  capabilities: ["ticketing"],
  sections: [
    { kind: "nav", id: "n", brand: { text: "AFTERGLOW", style: "wordmark" }, links: [{ label: "Lineup" }, { label: "Gear" }, { label: "Access" }], trailingAction: { label: "Get Access" } },
    { kind: "hero", id: "h", eyebrow: "▓▒░ one night only", title: { lines: ["AFTER", "GLOW"], emphasis: [1] }, lede: "A night that doesn't stop. Neon, bass, and the city after dark.", meta: [{ key: "GATES", value: "22:00" }, { key: "ZONE", value: "District 9" }], media: { kind: "glyph", glyph: "◆", frame: "none" }, ctas: [{ label: "Get Wristband" }, { label: "View Lineup" }], backgroundEffect: "grid-floor" },
    { kind: "marquee", id: "m", items: ["INITIATE_RAVE.EXE", "HYDRATE OR DIE-DRATE", "NO SLEEP", "SECTOR 2087"], separator: "//" },
    { kind: "collection", id: "c", variant: "gifts", head: { eyebrow: "The Gear", title: "Loadout" }, items: [
      gift("g1", "Pulse Wristband", "$35", "⬡", "Sound-reactive, glows with the bass. Standard issue.", "Add to loadout"),
      gift("g2", "Holo Visor", "$120", "▣", "See the set in full spectrum. Limited drop.", "Add to loadout"),
      gift("g3", "Signal Jacket", "$240", "◆", "Reflective shell, built for the after-hours.", "Add to loadout"),
    ] },
    { kind: "form", id: "f", capability: "ticket-list", eyebrow: "ACCESS", title: { lines: ["Get on", "the list"], emphasis: [1] }, body: "Drop your handle. We'll ping the ones who make the cut.", field: { type: "text", placeholder: "@handle" }, submit: { label: "Request access", successLabel: "You're in." }, backgroundEffect: "radial-glow" },
    { kind: "footer", id: "ft", brand: "AFTERGLOW", centeredLines: ["District 9 · 22:00 till late", "21+ · bring ID"], legal: "peek.gift" },
  ],
});

const hemlockPeek: Peek = peekSchema.parse({
  version: 1,
  meta: { id: "pk_hemlock", curatorId: "cur_demo", slug: "hemlock", title: "HEMLOCK — The Field Collection" },
  theme: { genomeRef: "hemlock" },
  capabilities: ["commerce"],
  sections: [
    { kind: "nav", id: "n", brand: { text: "HEMLOCK", style: "wordmark" }, links: [{ label: "Shop" }, { label: "Field Notes" }, { label: "About" }], trailingAction: { label: "Shop" } },
    { kind: "hero", id: "h", eyebrow: "The Field Collection · MMXXVI", title: { lines: ["Built for", "early miles."], emphasis: [1] }, lede: "Quietly engineered gear for the long way home — tested in the Cascades, finished by hand in Oregon.", meta: [{ key: "Made in", value: "Oregon" }], media: { kind: "glyph", glyph: "🏔", frame: "none" }, ctas: [{ label: "Shop the collection" }], backgroundEffect: "image-gradient" },
    { kind: "marquee", id: "m", items: ["Made slowly", "Built to last", "Field tested"], separator: "✦" },
    { kind: "collection", id: "c", variant: "products", head: { eyebrow: "The Drop", title: "Four pieces, one season" }, items: [
      { id: "p1", name: "Cascade Anorak", subtitle: "Cordura · slate", price: "$248", description: "A weatherproof shell that packs to a fist.", media: { kind: "glyph", glyph: "🧥", frame: "none" }, badge: "NEW" },
      { id: "p2", name: "Trail Flask", subtitle: "Steel · 24oz", price: "$48", description: "Brushed steel, keeps coffee hot to the summit.", media: { kind: "glyph", glyph: "🍶", frame: "none" } },
      { id: "p3", name: "Field Kit", subtitle: "Numbered · waxed", price: "$96", description: "The small essentials, numbered and waxed.", media: { kind: "glyph", glyph: "🎒", frame: "none" } },
    ] },
    { kind: "form", id: "f", capability: "newsletter", eyebrow: "Field Notes", title: { lines: ["Notes from", "the field"], emphasis: [1] }, body: "Occasional dispatches. New drops, trail reports, nothing else.", field: { type: "email", placeholder: "you@email.com" }, submit: { label: "Subscribe", successLabel: "Welcome aboard." } },
    { kind: "footer", id: "ft", brand: "HEMLOCK", tagline: "Made slowly, so it lasts a lifetime.", centeredLines: ["Portland, Oregon"], legal: "© MMXXVI HEMLOCK" },
  ],
});

export const proofs: { name: string; genome: Genome; peek: Peek }[] = [
  { name: "princess", genome: princessGenome, peek: princessPeek },
  { name: "cyber", genome: cyberGenome, peek: cyberPeek },
  { name: "hemlock", genome: hemlockGenome, peek: hemlockPeek },
];
