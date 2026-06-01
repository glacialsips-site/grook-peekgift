// ============================================================================
// peek.gift — THE PORT SURFACE  (overbuild the interfaces; stub the implementations)
// ----------------------------------------------------------------------------
// Ported from peek-jumpoff/ir/ports.ts and FINISHED per DECISIONS.md DQ-10 (the
// CardResolver cascade). Every external capability the product will EVER touch enters
// through one of these typed ports. The core (chat loop, IR, renderer) imports ONLY these
// interfaces — never a vendor SDK directly. Adding the 14th or 50th backend = write one
// adapter that satisfies an existing interface and register it. ZERO changes to core or
// to the other two parts. That is the whole anti-scrap mechanism.
//
// Today every port ships with a STUB adapter that returns obvious placeholder data so the
// full app runs end-to-end with NOTHING wired (zero real keys). Swap a stub for a real
// adapter when you want that capability live. Nothing upstream notices.
//
//   import { ports } from '@/lib/ir/ports';
//   const card = await ports.cardResolver.resolve({ text: url });   // cascade; stub today
//   const img  = await ports.image.generate({ prompt });            // stub today, fal tomorrow
//
// The registry at the bottom picks real-vs-stub PER ENV VAR. "Overbuild the contract,
// build lean behind it" — this file is the contract; the stubs are the lean.
//
// ── DQ-10 (FINISHED HERE) ────────────────────────────────────────────────────
//   Card fulfillment is a CONFIGURABLE CASCADE. The tier ORDER is DATA
//   (DEFAULT_RESOLVER_ORDER = ['retailer_api','url_scrape','research']); reorder / add /
//   remove tiers by config, never by editing core. makeCardResolver() returns a default
//   impl that iterates the order and dispatches per tier:
//     retailer_api → productSource.search   (tier 1: our retailer APIs)
//     url_scrape   → productSource.fromUrl  (tier 2: URL paste / screenshot scrape)
//     research     → research.resolveFromDescription  (tier 3: web search + vision)
//   …returning the FIRST success with `via`. tier1 retailer-API and tier2 URL/screenshot
//   scrape are split (different inputs); the resolver accepts an optional `screenshot`.
//
// ── DQ-9 (LLM real-vs-stub) ──────────────────────────────────────────────────
//   The `llm` port picks real vs stub by env: process.env.ANTHROPIC_API_KEY chooses the
//   real adapter (placeholder wired by the brain agent) else the stub, which returns a
//   DETERMINISTIC demo turn so the chat is demoable with zero secrets.
// ============================================================================

import type { MediaSlot, PeekIR } from './contract';

// ─────────────────────────────────────────────────────────────────────────────
// Shared result shape — ports never throw across the boundary; they return Result.
// ─────────────────────────────────────────────────────────────────────────────
export type Ok<T> = { ok: true } & T;
export type Err = { ok: false; error: string; retryable?: boolean };
export type Result<T> = Ok<T> | Err;

// ─────────────────────────────────────────────────────────────────────────────
// 1. LLM — the brain itself behind a port, so the model is swappable/versionable.
// ─────────────────────────────────────────────────────────────────────────────
export interface LLMMessage { role: 'user' | 'assistant'; content: unknown }
export interface LLMTool { name: string; description: string; input_schema: object }
export interface LLMPort {
  // streaming chat with tool use; host wires the actual tool runner
  chat(args: {
    system: string;
    messages: LLMMessage[];
    tools?: LLMTool[];
    model?: string;
    onToolCall?: (name: string, input: unknown) => Promise<unknown>;
    onText?: (delta: string) => void;
  }): Promise<Result<{ text: string }>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PRODUCT SOURCE — the "13 APIs" all live behind THIS one port.
//    A URL paste, a screenshot, a search query, or a retailer API are all just adapters
//    here. fromUrl → scrape a URL (or a screenshot of one); search → query a catalog.
//    Output is always a CardData. (DQ-10 tier1 = search, tier2 = fromUrl.)
// ─────────────────────────────────────────────────────────────────────────────
export interface CardData {
  title: string;
  description?: string;
  image_url?: string;
  value_cents?: number;
  value_display?: string;   // mirrors Card.value_display (DQ-4) — ranges / "—"
  retailer?: string;
  source_url?: string;
}
export interface ProductSourcePort {
  // tier 2 (url_scrape): a pasted URL, optionally a screenshot of the page (base64/dataURL
  // or an image URL) for vision-assisted extraction when DOM scraping is blocked.
  fromUrl(url: string, opts?: { screenshot?: string }): Promise<Result<{ card: CardData }>>;
  // tier 1 (retailer_api): query one/many concrete retailer catalogs (zenrows, amazon-pa,
  // etsy, manual…) behind one port; the chat never knows which fired.
  search?(query: string, opts?: { limit?: number }): Promise<Result<{ cards: CardData[] }>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2b. RESEARCH — the agentic LAST-RESORT resolver: Anthropic web search + vision.
//     When retailer APIs and a URL/screenshot scrape can't satisfy a fuzzy ask
//     ("a barrel cactus under $40 shipped to 90210"), this tier SEARCHES the web and
//     LOOKS at result pages / screenshots (vision) to extract a CardData. Vision also
//     reads curator-supplied reference photos. (DQ-10 tier3.)
// ─────────────────────────────────────────────────────────────────────────────
export interface ResolveConstraints { maxPriceCents?: number; shipTo?: string; sizeHint?: string }
export interface ResearchPort {
  resolveFromDescription(args: {
    query: string;
    constraints?: ResolveConstraints;
    images?: string[];                 // reference photos the curator gave (vision input)
  }): Promise<Result<{ cards: CardData[] }>>;
}

// 2c. CARD RESOLVER — the CONFIGURABLE CASCADE. Tries tiers IN ORDER until one satisfies
//     the ask. THE ORDER IS DATA — reorder / add / remove tiers by config, never by
//     editing core, because this sequence WILL change as backends appear (DQ-10).
//     Default: ['retailer_api'] → ['url_scrape'] → ['research'].
export type ResolutionTier = 'retailer_api' | 'url_scrape' | 'research' | (string & {});
export interface CardResolverPort {
  resolve(args: {
    text: string;                      // the curator's fuzzy ask OR a pasted URL
    constraints?: ResolveConstraints;
    images?: string[];                 // reference photos → research vision
    screenshot?: string;               // DQ-10: a screenshot of a URL → url_scrape vision
    strategy?: ResolutionTier[];       // override the configured default order per-call
  }): Promise<Result<{ card: CardData; via: ResolutionTier }>>;
}

// DQ-10: the DEFAULT tier order, as DATA. Override per-call via `strategy`, or globally by
// constructing a resolver with a different order — without editing the dispatch logic.
export const DEFAULT_RESOLVER_ORDER: ResolutionTier[] = ['retailer_api', 'url_scrape', 'research'];

const looksLikeUrl = (s: string) => /^https?:\/\//i.test(s.trim());

/**
 * DQ-10: the DEFAULT CardResolver impl. Iterates the tier order and dispatches per tier,
 * returning the FIRST tier that yields a card, tagged with `via`. Pure orchestration over
 * the three source ports — no vendor knowledge. Swap any underlying port (or the order)
 * and this keeps working.
 *
 *   retailer_api → productSource.search(text)        → first card
 *   url_scrape   → productSource.fromUrl(text, {screenshot})  (only when text is a URL or a
 *                  screenshot is supplied)
 *   research     → research.resolveFromDescription(...) → first card
 */
export function makeCardResolver(deps: {
  productSource: ProductSourcePort;
  research: ResearchPort;
  order?: ResolutionTier[];
}): CardResolverPort {
  const baseOrder = deps.order ?? DEFAULT_RESOLVER_ORDER;
  return {
    async resolve(args) {
      const order = args.strategy ?? baseOrder;
      const errors: string[] = [];
      for (const tier of order) {
        try {
          if (tier === 'retailer_api') {
            if (!deps.productSource.search) continue;
            const r = await deps.productSource.search(args.text, { limit: 1 });
            if (r.ok && r.cards[0]) return { ok: true, card: r.cards[0], via: tier };
            if (!r.ok) errors.push(`retailer_api: ${r.error}`);
          } else if (tier === 'url_scrape') {
            // only meaningful for a URL paste or a supplied screenshot
            if (!looksLikeUrl(args.text) && !args.screenshot) continue;
            const r = await deps.productSource.fromUrl(args.text, { screenshot: args.screenshot });
            if (r.ok) return { ok: true, card: r.card, via: tier };
            errors.push(`url_scrape: ${r.error}`);
          } else if (tier === 'research') {
            const r = await deps.research.resolveFromDescription({
              query: args.text,
              constraints: args.constraints,
              images: args.images,
            });
            if (r.ok && r.cards[0]) return { ok: true, card: r.cards[0], via: tier };
            if (!r.ok) errors.push(`research: ${r.error}`);
          } else {
            // unknown tier name in config → skip (forward-compat for future adapters)
            continue;
          }
        } catch (e) {
          errors.push(`${tier}: ${(e as Error).message}`);
        }
      }
      return { ok: false, error: `no tier resolved a card. ${errors.join(' | ')}`, retryable: true };
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. IMAGE — generate / fetch-stock / edit / upscale / removeBg / relight.
//    fal, replicate, openai-images, unsplash, etc. are interchangeable adapters.
// ─────────────────────────────────────────────────────────────────────────────
export interface ImageRequest {
  op: 'generate' | 'search' | 'edit' | 'upscale' | 'removeBg' | 'relight';
  prompt?: string;
  from?: string;            // source image url for edit/upscale/removeBg/relight
  aspect?: '16:9' | '4:3' | '1:1' | '9:16' | '3:4';
}
export interface ImagePort {
  fulfill(req: ImageRequest): Promise<Result<{ url: string; provider: string }>>;
  // convenience wrapper maps to .fulfill
  generate(req: { prompt: string; aspect?: ImageRequest['aspect'] }): Promise<Result<{ url: string; provider: string }>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PERSISTENCE — load/save the IR + version history. Supabase or in-memory.
//    Versioning is here so "undo / rollback / history" never needs a re-architecture.
// ─────────────────────────────────────────────────────────────────────────────
export interface PersistencePort {
  load(peekId: string): Promise<Result<{ ir: PeekIR }>>;
  save(ir: PeekIR): Promise<Result<{ version: number }>>;
  appendVersion(peekId: string, ir: PeekIR, note?: string): Promise<Result<{ version: number }>>;
  bySlug(slug: string): Promise<Result<{ ir: PeekIR }>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PAYMENT — the $12 publish + group-gift contributions. Stripe live / mock.
// ─────────────────────────────────────────────────────────────────────────────
export interface PaymentPort {
  createCheckout(args: { peekId: string; amount_cents: number; kind: 'publish' | 'contribution' })
    : Promise<Result<{ url: string; session_id: string }>>;
  verifyWebhook(rawBody: string, sig: string): Promise<Result<{ event: string; peekId?: string }>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. The supporting cast — same pattern, smaller surfaces.
// ─────────────────────────────────────────────────────────────────────────────
export interface AuthPort {
  currentUserId(req: unknown): Promise<string | null>;             // Clerk / mock
}
export interface EmailPort {
  send(args: { to: string; template: string; data: Record<string, unknown> }): Promise<Result<{ id: string }>>;
}
export interface AnalyticsPort {
  capture(event: string, props?: Record<string, unknown>): void;   // PostHog / noop
}
export interface ModerationPort {
  // gate generated/uploaded media before PUBLIC publish. Stub passes everything.
  checkImage(url: string): Promise<Result<{ verdict: 'pass' | 'flag'; reason?: string }>>;
  checkText(text: string): Promise<Result<{ verdict: 'pass' | 'flag'; reason?: string }>>;
}
export interface StoragePort {
  putUpload(file: Blob | ArrayBuffer, key: string): Promise<Result<{ url: string }>>;
}
export interface BotGatePort {
  verify(token: string): Promise<Result<{ human: boolean }>>;      // Turnstile / mock
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. THE REGISTRY — one object the core imports. Env vars pick real vs stub per port.
//    A capability you haven't built yet simply stays a stub; the app still runs.
// ─────────────────────────────────────────────────────────────────────────────
export interface Ports {
  llm: LLMPort;                   // Opus: tool use, streaming, VISION, WEB SEARCH, prompt caching
  productSource: ProductSourcePort;
  research: ResearchPort;         // Anthropic web search + vision — the last-resort tier
  cardResolver: CardResolverPort; // the configurable cascade over the tiers above (DQ-10)
  image: ImagePort;
  persistence: PersistencePort;
  payment: PaymentPort;
  auth: AuthPort;
  email: EmailPort;
  analytics: AnalyticsPort;
  moderation: ModerationPort;
  storage: StoragePort;
  botGate: BotGatePort;
}

// ── STUBS (obvious placeholders — prove the wiring, cost nothing, ZERO keys) ───
const PH = 'https://placehold.co/800x600/png';

const stubProductSource: ProductSourcePort = {
  async fromUrl(url: string, opts?: { screenshot?: string }) {
    return {
      ok: true as const,
      card: {
        title: 'Sample Product',
        description: `stub scrape of ${url}${opts?.screenshot ? ' (+screenshot)' : ''}`,
        image_url: PH, value_cents: 4200, value_display: '$42', retailer: 'StubMart', source_url: url,
      },
    };
  },
  async search(q: string) {
    return { ok: true as const, cards: [{ title: `Result for "${q}"`, image_url: PH, value_cents: 1900, value_display: '$19' }] };
  },
};

const stubResearch: ResearchPort = {
  async resolveFromDescription(a) {
    return {
      ok: true as const,
      cards: [{ title: `[stub-research] ${a.query}`, image_url: PH, value_cents: a.constraints?.maxPriceCents ?? 3500 }],
    };
  },
};

// DQ-9: deterministic demo turn so the chat is demoable with zero secrets. No randomness,
// no clock — same input → same output, suitable for snapshot tests.
const stubLLM: LLMPort = {
  async chat(args) {
    const demo = '[stub-llm] wire ANTHROPIC_API_KEY for the real brain. (deterministic demo turn)';
    args.onText?.(demo);
    return { ok: true as const, text: demo };
  },
};

const stub = {
  llm: stubLLM,
  productSource: stubProductSource,
  research: stubResearch,
  // DQ-10: even the stub cardResolver is the REAL cascade impl over the stub sources, so
  // the dispatch/order logic is exercised end-to-end with zero keys.
  cardResolver: makeCardResolver({ productSource: stubProductSource, research: stubResearch }),
  image: {
    async fulfill(req: ImageRequest) { return { ok: true as const, url: `${PH}?op=${req.op}`, provider: 'stub' }; },
    async generate(req: { prompt: string }) { return { ok: true as const, url: `${PH}?p=${encodeURIComponent(req.prompt).slice(0, 40)}`, provider: 'stub' }; },
  },
  persistence: {
    async load() { return { ok: false as const, error: 'stub: no store wired' }; },
    async save() { return { ok: true as const, version: 1 }; },
    async appendVersion() { return { ok: true as const, version: 1 }; },
    async bySlug() { return { ok: false as const, error: 'stub: no store wired' }; },
  },
  payment: {
    async createCheckout() { return { ok: true as const, url: '/checkout/mock', session_id: 'cs_stub_123' }; },
    async verifyWebhook() { return { ok: true as const, event: 'stub.noop' }; },
  },
  auth: { async currentUserId() { return 'stub-user'; } },
  email: { async send() { return { ok: true as const, id: 'email_stub' }; } },
  analytics: { capture() { /* noop */ } },
  moderation: {
    async checkImage() { return { ok: true as const, verdict: 'pass' as const }; },
    async checkText() { return { ok: true as const, verdict: 'pass' as const }; },
  },
  storage: { async putUpload(_f: Blob | ArrayBuffer, key: string) { return { ok: true as const, url: `${PH}?k=${key}` }; } },
  botGate: { async verify() { return { ok: true as const, human: true }; } },
} satisfies Ports;

// ── REAL-VS-STUB SELECTION (per env var) ──────────────────────────────────────
// Real adapters get imported and substituted here as they're built. Anything missing or
// unkeyed stays a stub. DQ-9: the llm port flips on ANTHROPIC_API_KEY.
//
// `realAdapterPlaceholder` stands in for the real Anthropic LLM adapter the brain agent
// will write (adapters/anthropic.ts, satisfies LLMPort). Until then, even WITH a key, we
// fall back to the stub so the app never half-boots; the brain agent swaps this line.
const realAdapterPlaceholder: LLMPort | null = null;

export const ports: Ports = {
  ...stub,
  llm: process.env.ANTHROPIC_API_KEY && realAdapterPlaceholder ? realAdapterPlaceholder : stub.llm,
  // ↑ swap individual lines for real adapters as you build them. Nothing else changes.
  // e.g.  image: process.env.FAL_KEY ? falAdapter : stub.image,
  //       cardResolver: makeCardResolver({ productSource: realRetailer, research: realResearch }),
};

// ── HOW TO ADD A REAL BACKEND (the entire procedure) ──────────────────────────
// 1. Write `adapters/zenrows.ts` exporting an object that `satisfies ProductSourcePort`.
// 2. In the registry above: `productSource: process.env.ZENROWS_KEY ? zenrows : stub.productSource`.
//    (And the cascade picks it up automatically — re-make the resolver with the real source.)
// 3. Done. The chat, the IR, the renderer, checkout — none of them change. Ever.
