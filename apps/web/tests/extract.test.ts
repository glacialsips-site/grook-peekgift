import { describe, expect, it } from "vitest";
import { extractSpine, KIND_MAP, type ExtractedSpine } from "@/lib/curator/extract";
import { PEEK_FEWSHOT } from "@/lib/curator/exemplar";
import type { Card } from "@peek/core";


const byId = (s: ExtractedSpine, id: string): Card => {
  const card = s.cards.find((c) => c.id === id);
  if (!card) throw new Error(`no card "${id}" (got: ${s.cards.map((c) => c.id).join(", ")})`);
  return card;
};

const codes = (s: ExtractedSpine) => s.issues.map((i) => i.code);

describe("KIND_MAP folds the 6 authoring kinds onto the 4 core CardTypes", () => {
  it("matches the frozen CardType union", () => {
    expect(KIND_MAP).toEqual({
      product: "product",
      wrapped: "product",
      custom: "product",
      experience: "activity",
      taunt: "aspirational",
      digital: "digital",
    });
  });
});

describe("extractSpine(PEEK_FEWSHOT) — the worked 'For the Old Man' page", () => {
  const spine = extractSpine(PEEK_FEWSHOT);

  it("extracts exactly the 4 tagged cards, in document order", () => {
    expect(spine.cards).toHaveLength(4);
    expect(spine.cards.map((c) => c.id)).toEqual([
      "leather-work-gloves",
      "heirloom-tomato-seeds",
      "six-pack-of-his-lager",
      "steak-dinner-on-us",
    ]);
    expect(spine.cards.map((c) => c.position)).toEqual([0, 1, 2, 3]);
  });

  it("maps titles + value_cents (dollars→cents) for the 3 products", () => {
    const gloves = byId(spine, "leather-work-gloves");
    const seeds = byId(spine, "heirloom-tomato-seeds");
    const lager = byId(spine, "six-pack-of-his-lager");

    expect(gloves.type).toBe("product");
    expect(gloves.title).toBe("Leather Work Gloves");
    expect(gloves.value_cents).toBe(4400);

    expect(seeds.type).toBe("product");
    expect(seeds.title).toBe("Heirloom Tomato Seeds");
    expect(seeds.value_cents).toBe(1600);

    expect(lager.type).toBe("product");
    expect(lager.title).toBe("A Six-Pack of His Lager");
    expect(lager.value_cents).toBe(1400);
  });

  it("maps the experience to an activity card with no price", () => {
    const dinner = byId(spine, "steak-dinner-on-us");
    expect(dinner.type).toBe("activity");
    expect(dinner.title).toBe("Steak Dinner, On Us");
    expect(dinner.value_cents).toBeNull();
    expect(dinner.metadata.kind).toBe("experience");
  });

  it("keeps the source/retailer labels (data-src → source_retailer)", () => {
    expect(byId(spine, "leather-work-gloves").source_retailer).toBe("Duluth");
    expect(byId(spine, "heirloom-tomato-seeds").source_retailer).toBe("Amazon");
    expect(byId(spine, "six-pack-of-his-lager").source_retailer).toBe("Local");
    expect(byId(spine, "steak-dinner-on-us").source_retailer).toBe("The Main Event");
  });

  it("pulls data-desc into description (the sheet copy)", () => {
    expect(byId(spine, "leather-work-gloves").description).toContain("full-grain leather");
  });

  it("has no variant groups, no budget, and only the one free-price warn", () => {
    expect(spine.variant_groups).toEqual([]);
    expect(spine.budgetCents).toBeNull();
    expect(codes(spine)).toEqual(["missing_price"]);
    expect(spine.issues[0].cardId).toBe("steak-dinner-on-us");
  });

  it("carries the CTA's stable ids so the page ↔ spine link round-trips", () => {
    expect(PEEK_FEWSHOT).toContain('data-peek-action="claim"');
    for (const card of spine.cards) {
      expect(PEEK_FEWSHOT).toContain(`data-peek-id="${card.id}"`);
    }
  });
});

describe("data-group + data-rule='pick-one' → one VariantGroup, members linked", () => {
  const html = `
    <section data-budget="0">
      <div data-peek-card data-kind="wrapped" data-peek-id="kicks-low"  data-name="Low Tops"  data-price="90"  data-group="kicks" data-rule="pick-one"></div>
      <div data-peek-card data-kind="wrapped" data-peek-id="kicks-high" data-name="High Tops" data-price="110" data-group="kicks" data-rule="pick-one"></div>
      <div data-peek-card data-kind="wrapped" data-peek-id="kicks-slip" data-name="Slip Ons"  data-price="80"  data-group="kicks" data-rule="pick-one"></div>
    </section>`;
  const spine = extractSpine(html);

  it("creates exactly one pick_one group titled from the key", () => {
    expect(spine.variant_groups).toHaveLength(1);
    const g = spine.variant_groups[0];
    expect(g.id).toBe("kicks");
    expect(g.selection).toBe("pick_one");
    expect(g.title).toBe("Kicks");
  });

  it("links all 3 member cards to the group", () => {
    expect(spine.cards).toHaveLength(3);
    for (const c of spine.cards) expect(c.variant_group_id).toBe("kicks");
    expect(byId(spine, "kicks-high").value_cents).toBe(11000);
  });

  it("does not flag a lone-group warning (it has 3 members)", () => {
    expect(codes(spine)).not.toContain("lone_group");
  });
});

describe("data-locked + data-unlock='after:kicks' → locked card + unlock rule", () => {
  const html = `
    <div data-peek-card data-kind="product" data-peek-id="trigger" data-name="The Kicks" data-price="90" data-group="kicks" data-rule="pick-one"></div>
    <div data-peek-card data-kind="taunt" data-peek-id="grail" data-name="The Grail"
         data-locked data-unlock="after:kicks" data-desc="Unlocks when you pick the kicks."></div>`;
  const spine = extractSpine(html);

  it("marks the card locked", () => {
    const grail = byId(spine, "grail");
    expect(grail.is_locked).toBe(true);
  });

  it("maps the unlock to UnlockRule.kind='event' and keeps the trigger token", () => {
    const grail = byId(spine, "grail");
    expect(grail.unlock_rule).toEqual({ kind: "event" });
    expect(grail.metadata.unlock_after_token).toBe("kicks");
    expect(codes(spine)).toContain("unlock_token_in_metadata");
  });

  it("a taunt card folds to aspirational AND flips is_taunt", () => {
    const grail = byId(spine, "grail");
    expect(grail.type).toBe("aspirational");
    expect(grail.is_taunt).toBe(true);
    expect(grail.taunt_text).toBe("Unlocks when you pick the kicks.");
  });
});

describe("data-budget='250' → budgetCents 25000", () => {
  it("reads the tab pool off the order region (dollars→cents)", () => {
    const html = `
      <main data-budget="250">
        <div data-peek-card data-kind="product" data-peek-id="a" data-name="A" data-price="40"></div>
        <div data-peek-card data-kind="product" data-peek-id="b" data-name="B" data-price="60"></div>
      </main>`;
    const spine = extractSpine(html);
    expect(spine.budgetCents).toBe(25000);
    expect(codes(spine)).not.toContain("unpriced_in_tab");
  });

  it("warns unpriced_in_tab when a priced tab has a card without a price", () => {
    const html = `
      <main data-budget="250">
        <div data-peek-card data-kind="product" data-peek-id="a" data-name="A" data-price="40"></div>
        <div data-peek-card data-kind="product" data-peek-id="b" data-name="B"></div>
      </main>`;
    const spine = extractSpine(html);
    expect(spine.budgetCents).toBe(25000);
    const issue = spine.issues.find((i) => i.code === "unpriced_in_tab");
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('"b"');
  });
});

describe("a card missing data-peek-id → derived id + a warn issue", () => {
  it("derives a kebab id from data-name and warns", () => {
    const html = `<div data-peek-card data-kind="product" data-name="Leather Work Gloves" data-price="44"></div>`;
    const spine = extractSpine(html);
    expect(spine.cards).toHaveLength(1);
    expect(spine.cards[0].id).toBe("leather-work-gloves");

    const issue = spine.issues.find((i) => i.code === "missing_id");
    expect(issue).toBeDefined();
    expect(issue?.level).toBe("warn");
    expect(issue?.cardId).toBe("leather-work-gloves");
  });

  it("falls back to a stable position+hash id when name is also absent", () => {
    const html = `<div data-peek-card data-kind="product" data-price="10">Mystery box</div>`;
    const a = extractSpine(html).cards[0].id;
    const b = extractSpine(html).cards[0].id;
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("robustness on messy / legacy / partial HTML", () => {
  it("accepts the legacy [data-card] alias", () => {
    const html = `<div data-card data-kind="experience" data-peek-id="legacy" data-name="Old Tag"></div>`;
    const spine = extractSpine(html);
    expect(spine.cards).toHaveLength(1);
    expect(spine.cards[0].type).toBe("activity");
  });

  it("disambiguates duplicate ids and warns", () => {
    const html = `
      <div data-peek-card data-peek-id="dup" data-name="One" data-price="5"></div>
      <div data-peek-card data-peek-id="dup" data-name="Two" data-price="6"></div>`;
    const spine = extractSpine(html);
    expect(spine.cards.map((c) => c.id)).toEqual(["dup", "dup-2"]);
    expect(codes(spine)).toContain("duplicate_id");
  });

  it("defaults an unknown data-kind to product and warns", () => {
    const html = `<div data-peek-card data-kind="hologram" data-peek-id="h" data-name="H" data-price="9"></div>`;
    const spine = extractSpine(html);
    expect(spine.cards[0].type).toBe("product");
    expect(codes(spine)).toContain("unknown_kind");
  });

  it("strips currency symbols / commas from data-price (mirrors the runtime)", () => {
    const html = `<div data-peek-card data-peek-id="p" data-name="P" data-price="$1,299.99"></div>`;
    const spine = extractSpine(html);
    expect(spine.cards[0].value_cents).toBe(129999);
  });

  it("warns on a lone or rule-less group but still emits it", () => {
    const html = `<div data-peek-card data-peek-id="solo" data-name="Solo" data-price="5" data-group="only"></div>`;
    const spine = extractSpine(html);
    expect(spine.variant_groups).toHaveLength(1);
    expect(spine.variant_groups[0].selection).toBe("pick_any");
    expect(codes(spine)).toEqual(expect.arrayContaining(["group_no_rule", "lone_group"]));
  });

  it("never throws on empty / garbage input", () => {
    expect(() => extractSpine("")).not.toThrow();
    expect(extractSpine("").cards).toEqual([]);
    expect(() => extractSpine("<<<not really html data-peek-card>>>")).not.toThrow();
  });
});
