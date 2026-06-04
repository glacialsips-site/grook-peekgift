import { describe, expect, it } from "vitest";
import { validatePeekDocument } from "@peek/core";
import { applyPageOp, frameDoc } from "@/lib/curator/page-html";
import { buildDraftDocument, mintSlug } from "@/lib/curator/draft";
import { PEEK_FEWSHOT } from "@/lib/curator/exemplar";
import type { StreamEvent } from "@/lib/curator/turn";

describe("applyPageOp — server-side authoritative page state", () => {
  const base = `<!doctype html><html><head><title>t</title></head><body><div id="a">old</div><img id="hero"></body></html>`;

  it("page op replaces the whole document verbatim", () => {
    const out = applyPageOp("anything-before", { type: "page", html: "<!doctype html><body>new</body>" });
    expect(out).toBe("<!doctype html><body>new</body>");
  });

  it("patch op replaces one matched node and keeps the doctype", () => {
    const out = applyPageOp(base, { type: "patch", selector: "#a", html: `<div id="a">fresh</div>` });
    expect(out).toContain("fresh");
    expect(out).not.toContain("old");
    expect(out.toLowerCase()).toContain("<!doctype");
  });

  it("style op appends a style block to the head", () => {
    const out = applyPageOp(base, { type: "style", css: "body{color:red}" });
    expect(out).toContain("<style>body{color:red}</style>");
  });

  it("media op sets an image src", () => {
    const out = applyPageOp(base, { type: "media", selector: "#hero", url: "https://x/y.png" });
    expect(out).toContain('src="https://x/y.png"');
  });

  it("ignores non-page events", () => {
    const ev: StreamEvent = { type: "text", delta: "hi" };
    expect(applyPageOp(base, ev)).toBe(base);
  });
});

describe("buildDraftDocument — the autosave envelope", () => {
  const now = "2026-01-01T00:00:00.000Z";

  it("builds a valid v2 envelope from authored HTML, spine extracted from the tags", () => {
    const doc = buildDraftDocument({ peekId: "abc-123", curatorId: null, html: PEEK_FEWSHOT, now });
    expect(validatePeekDocument(doc).ok).toBe(true);
    expect(doc.schema_version).toBe(2);
    expect(doc.presentation?.html).toBe(PEEK_FEWSHOT);
    expect(doc.presentation?.html_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.spine.cards.length).toBe(4); // 3 haul items + the dinner
    expect(doc.spine.peek.curator_id).toBe("anon"); // anonymous draft sentinel
    expect(doc.spine.peek.updated_at).toBe(now);
  });

  it("is deterministic given `now` (same html → same hash)", () => {
    const a = buildDraftDocument({ peekId: "p", html: PEEK_FEWSHOT, now });
    const b = buildDraftDocument({ peekId: "p", html: PEEK_FEWSHOT, now });
    expect(a.presentation?.html_hash).toBe(b.presentation?.html_hash);
  });

  it("keeps the base document's slug when re-saving, and swaps in the new html", () => {
    const first = buildDraftDocument({ peekId: "p", html: PEEK_FEWSHOT, now });
    const second = buildDraftDocument({ peekId: "p", html: "<body>edited</body>", base: first, now });
    expect(second.spine.peek.slug).toBe(first.spine.peek.slug);
    expect(second.presentation?.html).toBe("<body>edited</body>");
  });

  it("mintSlug is a stable, alnum, ≤12-char derivation of the id", () => {
    expect(mintSlug("ABC-123-def")).toBe("abc123def");
    expect(mintSlug("x")).toBe(mintSlug("x"));
  });
});

describe("frameDoc — host runtime injection for the iframe surfaces", () => {
  it("injects the runtime + mode before </body>", () => {
    const out = frameDoc("<html><body><h1>hi</h1></body></html>", "recipient");
    expect(out).toContain('window.__PEEK__={mode:"recipient"}');
    expect(out).toContain('<script src="/peek-runtime.js"></script>');
    expect(out.indexOf("/peek-runtime.js")).toBeLessThan(out.indexOf("</body>"));
  });

  it("appends the runtime when there is no </body>", () => {
    const out = frameDoc("<div>bare</div>", "preview");
    expect(out).toContain('mode:"preview"');
    expect(out).toContain("/peek-runtime.js");
  });
});
