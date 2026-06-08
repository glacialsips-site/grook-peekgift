import { describe, it, expect } from "vitest";
import { validatePeekIR, validatePeekDocument, emptyDocument, emptyPeekDocument } from "../src/index";

describe("PeekIR document model", () => {
  it("emptyDocument() produces a valid draft PeekIR", () => {
    const r = validatePeekIR(emptyDocument({ id: "p1", slug: "s1", curator_id: "u1" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.peek.status).toBe("draft");
      expect(r.value.cards).toEqual([]);
    }
  });

  it("normalizes a legacy numeric radius to { card, pill }", () => {
    const doc = emptyDocument({ id: "p", slug: "s", curator_id: "u" }) as unknown as Record<string, any>;
    doc.peek.theme.radius = 6;
    const r = validatePeekIR(doc);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.peek.theme.radius).toEqual({ card: 6, pill: 6 });
  });

  describe("rejects malformed documents with typed issues", () => {
    it("schema_version != 1", () => {
      const doc = emptyDocument() as unknown as Record<string, any>;
      doc.schema_version = 2;
      expect(validatePeekIR(doc).ok).toBe(false);
    });

    it("missing the required concept", () => {
      const doc = emptyDocument() as unknown as Record<string, any>;
      delete doc.peek.concept;
      const r = validatePeekIR(doc);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.issues.some((i) => i.path.join(".").includes("concept"))).toBe(true);
      }
    });

    it("card.value_cents must be number|null, not a string", () => {
      const doc = emptyDocument() as unknown as Record<string, any>;
      doc.cards = [
        {
          id: "c1",
          variant_group_id: null,
          position: 0,
          type: "product",
          title: "A thing",
          description: null,
          media: null,
          source_url: null,
          source_retailer: null,
          value_cents: "oops",
          reveal_value: false,
          is_taunt: false,
          taunt_text: null,
          is_locked: false,
          unlock_rule: {},
          proposed_date: null,
          location_hint: null,
          metadata: {},
        },
      ];
      expect(validatePeekIR(doc).ok).toBe(false);
    });

    it("variant_group.selection outside the enum", () => {
      const doc = emptyDocument() as unknown as Record<string, any>;
      doc.variant_groups = [{ id: "g1", title: "Pick", selection: "pick_some" }];
      expect(validatePeekIR(doc).ok).toBe(false);
    });
  });
});

describe("PeekDocument envelope (dual representation)", () => {
  const seed = { id: "p", slug: "s", curator_id: "u" };

  it("emptyPeekDocument() is a valid v2 envelope: blank spine, no presentation", () => {
    const r = validatePeekDocument(emptyPeekDocument(seed));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.schema_version).toBe(2);
      expect(r.value.presentation).toBeNull();
      expect(r.value.spine.peek.status).toBe("draft");
    }
  });

  it("validates a v2 envelope carrying an authored presentation", () => {
    const withHtml = {
      ...emptyPeekDocument(seed),
      presentation: {
        html: "<!doctype html><body data-peek-card>hi</body>",
        html_hash: "deadbeef",
        runtime_version: "1",
        authored_at: "1970-01-01T00:00:00.000Z",
      },
    };
    const r = validatePeekDocument(withHtml);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.presentation?.html).toContain("hi");
  });

  it("back-compat: a bare v1 PeekIR loads as a presentation-less document", () => {
    const r = validatePeekDocument(emptyDocument(seed));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.schema_version).toBe(2);
      expect(r.value.presentation).toBeNull();
      expect(r.value.spine.peek.id).toBe("p");
    }
  });

  it("rejects an envelope whose spine is malformed", () => {
    const doc = emptyPeekDocument(seed) as unknown as Record<string, any>;
    delete doc.spine.peek.concept;
    expect(validatePeekDocument(doc).ok).toBe(false);
  });
});
