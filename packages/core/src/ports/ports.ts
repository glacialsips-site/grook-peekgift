import type { MediaSlot, PeekIR } from "../document/contract";

export type PortOk<T> = { ok: true } & T;
export type PortErr = { ok: false; error: string; retryable?: boolean };
export type PortResult<T> = PortOk<T> | PortErr;

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

export interface PersistencePort {
  load(peekId: string): Promise<PortResult<{ ir: PeekIR }>>;
  save(ir: PeekIR): Promise<PortResult<{ version: number }>>;
  appendVersion(peekId: string, ir: PeekIR, note?: string): Promise<PortResult<{ version: number }>>;
  bySlug(slug: string): Promise<PortResult<{ ir: PeekIR }>>;
}

export interface PaymentPort {
  createCheckout(args: {
    peekId: string;
    amount_cents: number;
    kind: "publish" | "contribution";
  }): Promise<PortResult<{ url: string; session_id: string; clientSecret?: string }>>;
  verifyWebhook(rawBody: string, sig: string): Promise<PortResult<{ event: string; peekId?: string }>>;
}

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
