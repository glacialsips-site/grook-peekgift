import { describe, it, expect } from "vitest";
import {
  makeCardResolver,
  DEFAULT_RESOLVER_ORDER,
  type Ports,
  type ProductSourcePort,
  type ResearchPort,
} from "../src/index";

// Minimal test-doubles that satisfy the port interfaces. If this compiles, core's port
// contracts are implementable without any network code (the Ch1.6 gate).
const fakeProductSource: ProductSourcePort = {
  async fromUrl(url) {
    return { ok: true, card: { title: `scraped ${url}`, source_url: url } };
  },
  async search(q) {
    return { ok: false, error: `no retailer match for ${q}` };
  },
};

const fakeResearch: ResearchPort = {
  async resolveFromDescription({ query }) {
    return { ok: true, cards: [{ title: `researched ${query}` }] };
  },
};

const fakePorts: Ports = {
  llm: { async chat() { return { ok: true, text: "ok" }; } },
  productSource: fakeProductSource,
  research: fakeResearch,
  cardResolver: makeCardResolver({ productSource: fakeProductSource, research: fakeResearch }),
  image: {
    async fulfill() { return { ok: true, url: "x", provider: "test" }; },
    async generate() { return { ok: true, url: "x", provider: "test" }; },
  },
  persistence: {
    async load() { return { ok: false, error: "none" }; },
    async save() { return { ok: true, version: 1 }; },
    async appendVersion() { return { ok: true, version: 1 }; },
    async bySlug() { return { ok: false, error: "none" }; },
  },
  payment: {
    async createCheckout() { return { ok: true, url: "/c", session_id: "cs_test" }; },
    async verifyWebhook() { return { ok: true, event: "noop" }; },
  },
  auth: { async currentUserId() { return null; } },
  email: { async send() { return { ok: true, id: "e1" }; } },
  analytics: { capture() {} },
  moderation: {
    async checkImage() { return { ok: true, verdict: "pass" }; },
    async checkText() { return { ok: true, verdict: "pass" }; },
  },
  storage: { async putUpload() { return { ok: true, url: "u" }; } },
  botGate: { async verify() { return { ok: true, human: true }; } },
};

describe("ports", () => {
  it("a test-double satisfies the full Ports registry (no network code in core)", () => {
    expect(typeof fakePorts.llm.chat).toBe("function");
    expect(DEFAULT_RESOLVER_ORDER).toEqual(["retailer_api", "url_scrape", "research"]);
  });

  it("the cascade routes a URL to url_scrape", async () => {
    const r = await fakePorts.cardResolver.resolve({ text: "https://example.com/p" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.via).toBe("url_scrape");
  });

  it("the cascade falls through to research for a fuzzy description", async () => {
    const r = await fakePorts.cardResolver.resolve({ text: "a barrel cactus under $40" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.via).toBe("research");
      expect(r.card.title).toContain("researched");
    }
  });

  it("a custom strategy order is honored", async () => {
    const r = await fakePorts.cardResolver.resolve({ text: "anything", strategy: ["research"] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.via).toBe("research");
  });
});
