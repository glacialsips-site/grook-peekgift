// THE PORT SURFACE — the typed contracts for every external capability the product
// touches. Lifted from lib/ir/ports.ts into framework-agnostic core: the INTERFACES and
// the pure makeCardResolver orchestration only. The stub adapters, the env-based registry,
// and any vendor SDK wiring live in the web/adapters layer, NOT here — core depends on
// contracts, never on a process.env read or a concrete network client.
//
// Ports never throw across the boundary; they return PortResult (named to avoid colliding
// with neverthrow's Result, which the command layer uses). Adding the 14th or 50th backend
// is one adapter that satisfies an existing interface — zero changes to core.

import type { MediaSlot, PeekIR } from "../document/contract";

// ── Shared result shape ────────────────────────────────────────────────────────
export type PortOk<T> = { ok: true } & T;
export type PortErr = { ok: false; error: string; retryable?: boolean };
export type PortResult<T> = PortOk<T> | PortErr;

// ── 1. LLM — the brain behind a port, so the model is swappable/versionable. ─────
export interface LLMMessage {
  role: "user" | "assistant";
  content: unknown;
}
export interface LLMTool {
  name: string;
  description: string;
  input_schema: object;
}
export interface LLMPort {
  chat(args: {
    system: string;
    messages: LLMMessage[];
    tools?: LLMTool[];
    model?: string;
    onToolCall?: (name: string, input: unknown) => Promise<unknown>;
    onText?: (delta: string) => void;
  }): Promise<PortResult<{ text: string }>>;
}

// ── 2. PRODUCT SOURCE — retailer APIs + URL/screenshot scrape behind one port. ───
export interface CardData {
  title: string;
  description?: string;
  image_url?: string;
  value_cents?: number;
  value_display?: string;
  retailer?: string;
  source_url?: string;
}
export interface ProductSourcePort {
  fromUrl(url: string, opts?: { screenshot?: string }): Promise<PortResult<{ card: CardData }>>;
  search?(query: string, opts?: { limit?: number }): Promise<PortResult<{ cards: CardData[] }>>;
}

// ── 2b. RESEARCH — the agentic last-resort: web search + vision. ─────────────────
export interface ResolveConstraints {
  maxPriceCents?: number;
  shipTo?: string;
  sizeHint?: string;
}
export interface ResearchPort {
  resolveFromDescription(args: {
    query: string;
    constraints?: ResolveConstraints;
    images?: string[];
  }): Promise<PortResult<{ cards: CardData[] }>>;
}

// ── 2c. CARD RESOLVER — the configurable cascade. The tier ORDER is DATA. ────────
export type ResolutionTier = "retailer_api" | "url_scrape" | "research" | (string & {});
export interface CardResolverPort {
  resolve(args: {
    text: string;
    constraints?: ResolveConstraints;
    images?: string[];
    screenshot?: string;
    strategy?: ResolutionTier[];
  }): Promise<PortResult<{ card: CardData; via: ResolutionTier }>>;
}

export const DEFAULT_RESOLVER_ORDER: ResolutionTier[] = ["retailer_api", "url_scrape", "research"];

const looksLikeUrl = (s: string): boolean => /^https?:\/\//i.test(s.trim());

/**
 * The default CardResolver: iterate the tier order, dispatch per tier, return the FIRST
 * tier that yields a card (tagged with `via`). Pure orchestration over the source ports —
 * no vendor knowledge; swap any underlying port or reorder the tiers and it keeps working.
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
          if (tier === "retailer_api") {
            if (!deps.productSource.search) continue;
            const r = await deps.productSource.search(args.text, { limit: 1 });
            if (r.ok && r.cards[0]) return { ok: true, card: r.cards[0], via: tier };
            if (!r.ok) errors.push(`retailer_api: ${r.error}`);
          } else if (tier === "url_scrape") {
            if (!looksLikeUrl(args.text) && !args.screenshot) continue;
            const r = await deps.productSource.fromUrl(args.text, { screenshot: args.screenshot });
            if (r.ok) return { ok: true, card: r.card, via: tier };
            errors.push(`url_scrape: ${r.error}`);
          } else if (tier === "research") {
            const r = await deps.research.resolveFromDescription({
              query: args.text,
              constraints: args.constraints,
              images: args.images,
            });
            if (r.ok && r.cards[0]) return { ok: true, card: r.cards[0], via: tier };
            if (!r.ok) errors.push(`research: ${r.error}`);
          } else {
            continue;
          }
        } catch (e) {
          errors.push(`${tier}: ${(e as Error).message}`);
        }
      }
      return { ok: false, error: `no tier resolved a card. ${errors.join(" | ")}`, retryable: true };
    },
  };
}

// ── 3. IMAGE — generate / fetch-stock / edit / upscale / removeBg / relight. ─────
export interface ImageRequest {
  op: "generate" | "search" | "edit" | "upscale" | "removeBg" | "relight";
  prompt?: string;
  from?: string;
  aspect?: "16:9" | "4:3" | "1:1" | "9:16" | "3:4";
}
export interface ImagePort {
  fulfill(req: ImageRequest): Promise<PortResult<{ url: string; provider: string }>>;
  generate(req: {
    prompt: string;
    aspect?: ImageRequest["aspect"];
  }): Promise<PortResult<{ url: string; provider: string }>>;
}

// ── 4. PERSISTENCE — load/save the document + version history. ───────────────────
export interface PersistencePort {
  load(peekId: string): Promise<PortResult<{ ir: PeekIR }>>;
  save(ir: PeekIR): Promise<PortResult<{ version: number }>>;
  appendVersion(peekId: string, ir: PeekIR, note?: string): Promise<PortResult<{ version: number }>>;
  bySlug(slug: string): Promise<PortResult<{ ir: PeekIR }>>;
}

// ── 5. PAYMENT — the $12 publish (a Stripe Checkout Session) + contributions. ────
export interface PaymentPort {
  createCheckout(args: {
    peekId: string;
    amount_cents: number;
    kind: "publish" | "contribution";
  }): Promise<PortResult<{ url: string; session_id: string; clientSecret?: string }>>;
  verifyWebhook(rawBody: string, sig: string): Promise<PortResult<{ event: string; peekId?: string }>>;
}

// ── 6. The supporting cast — same pattern, smaller surfaces. ─────────────────────
export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}
export interface AuthPort {
  currentUserId(req: unknown): Promise<string | null>;
  currentUser?(req: unknown): Promise<AuthUser | null>;
}
export interface EmailPort {
  send(args: { to: string; template: string; data: Record<string, unknown> }): Promise<PortResult<{ id: string }>>;
}
export interface AnalyticsPort {
  capture(event: string, props?: Record<string, unknown>): void;
}
export interface ModerationPort {
  checkImage(url: string): Promise<PortResult<{ verdict: "pass" | "flag"; reason?: string }>>;
  checkText(text: string): Promise<PortResult<{ verdict: "pass" | "flag"; reason?: string }>>;
}
export interface StoragePort {
  putUpload(file: Blob | ArrayBuffer, key: string): Promise<PortResult<{ url: string }>>;
}
export interface BotGatePort {
  verify(token: string): Promise<PortResult<{ human: boolean }>>;
}

// ── 7. THE REGISTRY shape — one object the app assembles and the surfaces consume.
export interface Ports {
  llm: LLMPort;
  productSource: ProductSourcePort;
  research: ResearchPort;
  cardResolver: CardResolverPort;
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
