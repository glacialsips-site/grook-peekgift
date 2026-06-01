// ============================================================================
// peek.gift — THE PORT SURFACE  (overbuild the interfaces; stub the implementations)
// ----------------------------------------------------------------------------
// Every external capability the product will EVER touch enters through one of these
// typed ports. The core (chat loop, IR, renderer) imports ONLY these interfaces —
// never a vendor SDK directly. Adding the 14th or 50th backend = write one adapter
// that satisfies an existing interface and register it. ZERO changes to core or to
// the other two parts. That is the whole anti-scrap mechanism.
//
// Today every port ships with a STUB adapter that returns obvious placeholder data so
// the full app runs end-to-end with nothing wired. Swap a stub for a real adapter when
// you want that capability live. Nothing upstream notices.
//
//   import { ports } from './ports';
//   const card = await ports.productSource.fromUrl(url);   // stub today, ZenRows tomorrow
//   const img  = await ports.image.generate({ prompt });   // stub today, fal tomorrow
//
// Registry at the bottom picks real-vs-stub per env var. "Overbuild the contract,
// build lean behind it" — this file is the contract; the stubs are the lean.
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
//    A URL paste, a search query, or a retailer API are all just adapters here.
//    fromUrl → scrape; search → query a catalog. Output is always a CardData.
// ─────────────────────────────────────────────────────────────────────────────
export interface CardData {
  title: string;
  description?: string;
  image_url?: string;
  value_cents?: number;
  retailer?: string;
  source_url?: string;
}
export interface ProductSourcePort {
  fromUrl(url: string): Promise<Result<{ card: CardData }>>;
  search?(query: string, opts?: { limit?: number }): Promise<Result<{ cards: CardData[] }>>;
  // register many concrete sources (zenrows, browserbase, amazon-pa, etsy, manual…)
  // behind one port; the chat never knows which fired.
}

// ─────────────────────────────────────────────────────────────────────────────
// 2b. RESEARCH — the agentic LAST-RESORT resolver: Anthropic web search + vision.
//     When retailer APIs and a URL/screenshot scrape can't satisfy a fuzzy ask
//     ("a barrel cactus under $40 shipped to 90210"), this tier SEARCHES the web and
//     LOOKS at result pages / screenshots (vision) to extract a CardData. Vision also
//     reads curator-supplied reference photos.
// ─────────────────────────────────────────────────────────────────────────────
export interface ResolveConstraints { maxPriceCents?: number; shipTo?: string; sizeHint?: string }
export interface ResearchPort {
  resolveFromDescription(args: {
    query: string;
    constraints?: ResolveConstraints;
    images?: string[];                 // reference photos the curator gave (vision input)
  }): Promise<Result<{ cards: CardData[] }>>;
}

// 2c. CARD RESOLVER — the CONFIGURABLE CASCADE. Tries tiers IN ORDER until one
//     satisfies the ask. THE ORDER IS DATA — reorder / add / remove tiers by config,
//     never by editing core, because this sequence WILL change as backends appear.
//     Default today: ['retailer_api'] → ['url_scrape'] → ['research'].
export type ResolutionTier = 'retailer_api' | 'url_scrape' | 'research' | (string & {});
export interface CardResolverPort {
  resolve(args: {
    text: string;                      // the curator's fuzzy ask OR a pasted URL
    constraints?: ResolveConstraints;
    images?: string[];
    strategy?: ResolutionTier[];       // override the configured default order per-call
  }): Promise<Result<{ card: CardData; via: ResolutionTier }>>;
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
  // convenience wrappers map to .fulfill
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
  llm: LLMPort;                 // Opus: tool use, streaming, VISION, WEB SEARCH, prompt caching
  productSource: ProductSourcePort;
  research: ResearchPort;       // Anthropic web search + vision — the last-resort tier
  cardResolver: CardResolverPort; // the configurable cascade over the tiers above
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

// ── STUBS (obvious placeholders — prove the wiring, cost nothing) ──────────────
const PH = 'https://placehold.co/800x600/png';
const stub = {
  llm: {
    async chat() { return { ok: true as const, text: '[stub-llm] wire ANTHROPIC_API_KEY' }; }
  },
  productSource: {
    async fromUrl(url: string) {
      return { ok: true as const, card: { title: 'Sample Product', description: `stub scrape of ${url}`, image_url: PH, value_cents: 4200, retailer: 'StubMart', source_url: url } };
    },
    async search(q: string) { return { ok: true as const, cards: [{ title: `Result for "${q}"`, image_url: PH, value_cents: 1900 }] }; }
  },
  research: {
    async resolveFromDescription(a: { query: string; constraints?: ResolveConstraints }) {
      return { ok: true as const, cards: [{ title: `[stub-research] ${a.query}`, image_url: PH, value_cents: a.constraints?.maxPriceCents ?? 3500 }] };
    }
  },
  cardResolver: {
    async resolve(a: { text: string }) {
      return { ok: true as const, card: { title: `[stub-resolve] ${a.text}`, image_url: PH, value_cents: 2500 }, via: 'research' as const };
    }
  },
  image: {
    async fulfill(req: ImageRequest) { return { ok: true as const, url: `${PH}?op=${req.op}`, provider: 'stub' }; },
    async generate(req: { prompt: string }) { return { ok: true as const, url: `${PH}?p=${encodeURIComponent(req.prompt).slice(0,40)}`, provider: 'stub' }; }
  },
  persistence: {
    async load() { return { ok: false as const, error: 'stub: no store wired' }; },
    async save() { return { ok: true as const, version: 1 }; },
    async appendVersion() { return { ok: true as const, version: 1 }; },
    async bySlug() { return { ok: false as const, error: 'stub: no store wired' }; }
  },
  payment: {
    async createCheckout() { return { ok: true as const, url: '/checkout/mock', session_id: 'cs_stub_123' }; },
    async verifyWebhook() { return { ok: true as const, event: 'stub.noop' }; }
  },
  auth: { async currentUserId() { return 'stub-user'; } },
  email: { async send() { return { ok: true as const, id: 'email_stub' }; } },
  analytics: { capture() { /* noop */ } },
  moderation: {
    async checkImage() { return { ok: true as const, verdict: 'pass' as const }; },
    async checkText() { return { ok: true as const, verdict: 'pass' as const }; }
  },
  storage: { async putUpload(_f: unknown, key: string) { return { ok: true as const, url: `${PH}?k=${key}` }; } },
  botGate: { async verify() { return { ok: true as const, human: true }; } }
} satisfies Ports;

// Real adapters get imported and substituted here per env. Anything missing = stub.
// e.g.  llm: process.env.ANTHROPIC_API_KEY ? anthropicAdapter : stub.llm
export const ports: Ports = {
  ...stub,
  // ↑ swap individual lines for real adapters as you build them. Nothing else changes.
};

// ── HOW TO ADD A REAL BACKEND (the entire procedure) ──────────────────────────
// 1. Write `adapters/zenrows.ts` exporting an object that `satisfies ProductSourcePort`.
// 2. In the registry above: `productSource: process.env.ZENROWS_KEY ? zenrows : stub.productSource`.
// 3. Done. The chat, the IR, the renderer, checkout — none of them change. Ever.
