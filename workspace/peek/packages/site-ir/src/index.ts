import { z } from "zod";

/**
 * site-ir — the Site Intermediate Representation: a generated peek as a structured, versioned
 * document tree. NEVER HTML. HTML/native/email/pdf are render targets compiled FROM this.
 *
 * Blocks carry STRUCTURE + CONTENT + variant enums only — never raw style. All look/feel comes
 * from the theme (a vibe-genome, resolved to design-tokens) referenced by `theme.genomeRef`.
 * Blocks are a discriminated union on `kind` — an open registry: add a kind here + a renderer +
 * an AI tool descriptor, and it lights up across the system with no consumer rewrite.
 *
 * Grounded in docs/design-dna-catalog.md: the 10 reference sites reduce to ~7 logical blocks +
 * 3 universal mobile-system behaviors (menu / sheet / sticky-bar) which the renderer derives
 * automatically and are NOT authored as blocks.
 */

export const SITE_IR_SCHEMA_VERSION = 1 as const;

/* ----------------------------- shared ----------------------------- */

export const ctaSchema = z.object({
  label: z.string(),
  href: z.string().optional(),
  variant: z.enum(["primary", "ghost", "link"]).default("primary"),
});
export type Cta = z.infer<typeof ctaSchema>;

export const mediaFrameSchema = z.enum([
  "none",
  "arched",
  "polaroid",
  "circular",
  "porthole",
  "id-card",
  "vertical-label",
]);
export type MediaFrame = z.infer<typeof mediaFrameSchema>;

export const mediaSchema = z.object({
  kind: z.enum(["photo", "gradient", "glyph", "none"]),
  src: z.string().optional(), // photo URL / asset ref
  glyph: z.string().optional(), // glyph/icon id
  alt: z.string().optional(),
  frame: mediaFrameSchema.default("none"),
});
export type Media = z.infer<typeof mediaSchema>;

/** The polymorphic item — products, gifts, lots, cargo all reduce to this. */
export const claimStateSchema = z.object({
  model: z.enum(["buy", "claim", "none"]),
  claimed: z.boolean().default(false),
  label: z.string(), // action verb, e.g. "I'll bring this"
  claimedLabel: z.string().optional(),
  claimedBadge: z.string().optional(),
});
export type ClaimState = z.infer<typeof claimStateSchema>;

export const cardSchema = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string().optional(),
  price: z.string().optional(),
  estimateRange: z.tuple([z.string(), z.string()]).optional(),
  description: z.string().optional(),
  source: z.string().optional(), // retailer / donor / maker / supplier
  media: mediaSchema,
  swatches: z.array(z.string()).optional(),
  badge: z.string().optional(), // e.g. "NEW"
  claim: claimStateSchema.optional(),
});
export type Card = z.infer<typeof cardSchema>;

/* ----------------------------- blocks ----------------------------- */

export const navBlockSchema = z.object({
  kind: z.literal("nav"),
  id: z.string(),
  brand: z.object({
    text: z.string(),
    style: z.enum(["wordmark", "glyph", "script"]).default("wordmark"),
  }),
  links: z.array(
    z.object({ label: z.string(), href: z.string().optional(), index: z.string().optional() }),
  ),
  trailingAction: ctaSchema.optional(),
  liveWidget: z.enum(["none", "clock"]).default("none"),
});

export const titleSchema = z.object({
  lines: z.array(z.string()),
  emphasis: z.array(z.number().int()).default([]), // indices of lines rendered with emphasis
});

export const heroBlockSchema = z.object({
  kind: z.literal("hero"),
  id: z.string(),
  eyebrow: z.string().optional(),
  greeting: z.string().optional(), // script line
  title: titleSchema,
  subtitle: z.string().optional(),
  lede: z.string().optional(),
  meta: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
  media: mediaSchema.optional(),
  ctas: z.array(ctaSchema).default([]),
  countdownTo: z.string().optional(), // ISO date
  backgroundEffect: z
    .enum([
      "image-gradient",
      "grid-floor",
      "starfield",
      "conic-rays",
      "sunburst",
      "radial-glow",
      "botanicals",
      "memphis",
      "none",
    ])
    .default("none"),
});

export const marqueeBlockSchema = z.object({
  kind: z.literal("marquee"),
  id: z.string(),
  items: z.array(z.string()),
  separator: z.string().default("✦"),
});

export const dividerBlockSchema = z.object({
  kind: z.literal("divider"),
  id: z.string(),
  style: z.enum(["rule", "scallop", "sprig", "proverb"]).default("rule"),
  text: z.string().optional(),
});

export const scheduleBlockSchema = z.object({
  kind: z.literal("schedule"),
  id: z.string(),
  intro: z
    .object({ eyebrow: z.string().optional(), title: z.string(), note: z.string().optional() })
    .optional(),
  skin: z.enum(["dots", "nodes", "tickets", "tracklist", "tilted-gigs", "step-cards", "courses"]),
  items: z.array(
    z.object({
      time: z.string().optional(),
      label: z.string(),
      sublabel: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      group: z.string().optional(), // day-label divider (Bachelor)
      side: z.string().optional(), // A/B side (Disco)
    }),
  ),
});

export const collectionBlockSchema = z.object({
  kind: z.literal("collection"),
  id: z.string(),
  variant: z.enum(["products", "gifts", "lots"]),
  head: z
    .object({ eyebrow: z.string().optional(), title: z.string(), meta: z.string().optional() })
    .optional(),
  feature: cardSchema.optional(), // headline item
  items: z.array(cardSchema),
  carouselOnMobile: z.boolean().default(true),
});

export const editorialSplitBlockSchema = z.object({
  kind: z.literal("editorial-split"),
  id: z.string(),
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string(),
  media: mediaSchema.optional(),
  stats: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
  cta: ctaSchema.optional(),
});

export const triptychBlockSchema = z.object({
  kind: z.literal("triptych"),
  id: z.string(),
  items: z
    .array(z.object({ icon: z.string().optional(), heading: z.string(), body: z.string() }))
    .length(3),
});

export const statBandBlockSchema = z.object({
  kind: z.literal("stat-band"),
  id: z.string(),
  items: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      prefix: z.string().optional(),
      countUp: z.boolean().default(false),
    }),
  ),
});

export const detailRowsBlockSchema = z.object({
  kind: z.literal("detail-rows"),
  id: z.string(),
  title: z.string().optional(),
  items: z.array(z.object({ icon: z.string().optional(), label: z.string(), value: z.string() })),
});

export const pricingTiersBlockSchema = z.object({
  kind: z.literal("pricing-tiers"),
  id: z.string(),
  tiers: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
      qualifier: z.string().optional(),
      features: z.array(z.string()),
    }),
  ),
});

export const formBlockSchema = z.object({
  kind: z.literal("form"),
  id: z.string(),
  capability: z.enum(["newsletter", "rsvp", "reserve", "auction-register", "ticket-list"]),
  eyebrow: z.string().optional(),
  title: titleSchema,
  body: z.string().optional(),
  field: z.object({ type: z.enum(["email", "text"]), placeholder: z.string() }),
  submit: z.object({ label: z.string(), successLabel: z.string() }),
  finePrint: z.string().optional(),
  backgroundEffect: z.enum(["none", "radial-glow", "sunburst", "conic-rays"]).default("none"),
});

export const footerBlockSchema = z.object({
  kind: z.literal("footer"),
  id: z.string(),
  brand: z.string(),
  tagline: z.string().optional(),
  columns: z.array(z.object({ heading: z.string(), links: z.array(z.string()) })).default([]),
  centeredLines: z.array(z.string()).default([]),
  legal: z.string().optional(),
});

export const blockSchema = z.discriminatedUnion("kind", [
  navBlockSchema,
  heroBlockSchema,
  marqueeBlockSchema,
  dividerBlockSchema,
  scheduleBlockSchema,
  collectionBlockSchema,
  editorialSplitBlockSchema,
  triptychBlockSchema,
  statBandBlockSchema,
  detailRowsBlockSchema,
  pricingTiersBlockSchema,
  formBlockSchema,
  footerBlockSchema,
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockKind = Block["kind"];

/* ------------------------------ peek ------------------------------ */

export const capabilitySchema = z.enum([
  "commerce",
  "rsvp",
  "reserve",
  "auction",
  "ticketing",
  "gift-claim",
]);
export type Capability = z.infer<typeof capabilitySchema>;

export const peekSchema = z.object({
  version: z.literal(SITE_IR_SCHEMA_VERSION),
  meta: z.object({
    id: z.string(),
    curatorId: z.string(), // tenancy seam — present from day 1, single-curator for now
    slug: z.string(),
    locale: z.string().default("en"),
    status: z.enum(["draft", "published"]).default("draft"),
    title: z.string(),
    seo: z
      .object({ description: z.string().optional(), ogImage: z.string().optional() })
      .optional(),
  }),
  theme: z.object({ genomeRef: z.string() }), // -> a vibe-genome
  capabilities: z.array(capabilitySchema).default([]),
  sections: z.array(blockSchema),
});
export type Peek = z.infer<typeof peekSchema>;
