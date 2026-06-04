// ============================================================================
// peek.gift — THE DUAL-REP EXTRACTOR (tagged HTML → the structured spine)
// ----------------------------------------------------------------------------
// The chat authors a freeform, tagged HTML gift page; the HTML stays the design
// surface. This module DERIVES the structured spine the recipient pick, the $12
// checkout, the tab cap, and a future product graph need: real core `Card[]` +
// `VariantGroup[]` + a budget cap, linked back to the HTML by `data-peek-id`.
//
// It is the read side of the same data-peek-* contract the host runtime
// (apps/web/public/peek-runtime.js) enforces at render and the model is taught in
// system-prompt.ts ("THE INTERACTION CONTRACT"). The runtime owns *behavior*;
// this owns the *spine*. The two read the same tags, so they cannot drift:
//   [data-peek-card] | [data-card]   data-kind, data-name, data-price, data-src,
//                                    data-desc, data-group, data-rule, data-locked,
//                                    data-unlock="after:<token>"
//   data-budget="250"   the shared tab pool (dollars)
//
// Pure + edge-friendly: node-html-parser, no DOM/jsdom. Never throws on messy
// real HTML — every problem becomes an ExtractionIssue the caller can surface or
// (at publish time) promote to a hard error.
// ============================================================================

import { parse, type HTMLElement } from "node-html-parser";
import type {
  Card,
  CardType,
  VariantGroup,
  VariantSelection,
  UnlockRule,
} from "@peek/core";

// ─────────────────────────────────────────────────────────────────────────────
// Public shape
// ─────────────────────────────────────────────────────────────────────────────
export interface ExtractionIssue {
  level: "warn" | "error";
  code: string;
  message: string;
  cardId?: string;
}

export interface ExtractedSpine {
  cards: Card[];                  // core Card[], faithfully typed
  variant_groups: VariantGroup[];
  budgetCents: number | null;     // from data-budget on the order region (dollars→cents), else null
  issues: ExtractionIssue[];
}

// ─────────────────────────────────────────────────────────────────────────────
// data-kind → core CardType
// ----------------------------------------------------------------------------
// The contract's authoring vocabulary (data-kind, from system-prompt.ts) is wider
// than the FROZEN core union. `CardType = 'product' | 'activity' | 'aspirational'
// | 'digital'` (contract.ts §4, DQ-5 keeps it unchanged), so the six authoring
// kinds FOLD onto four core types — and the kinds that have no distinct CardType
// are preserved on the Card instead of being lost:
//   product    → product       (a real retail item)
//   wrapped    → product       ("I'm getting you shoes, pick one" — a pick-one
//                                product; the single-select lives in the variant
//                                group, not a separate type)
//   custom     → product       (homemade/handmade — there is NO `homemade`/`custom`
//                                CardType and no homemade flag on Card, so the fact
//                                is recorded in metadata.kind = "custom" /
//                                metadata.homemade = true; type stays `product`)
//   experience → activity      (a date/place/itinerary — Card.proposed_date /
//                                location_hint are the activity fields)
//   taunt      → aspirational   (the gorgeous impossible thing; Card.is_taunt is
//                                ALSO set true so the renderer draws the "HA,
//                                DENIED" treatment — see Card.is_taunt/taunt_text)
//   digital    → digital
// The raw authored data-kind is ALWAYS preserved on Card.metadata.kind so the
// dual-rep round-trips even where the fold is lossy (wrapped/custom).
// ─────────────────────────────────────────────────────────────────────────────
export const KIND_MAP: Record<string, CardType> = {
  product: "product",
  wrapped: "product",
  custom: "product",
  experience: "activity",
  taunt: "aspirational",
  digital: "digital",
};

const DEFAULT_KIND = "product";
const DEFAULT_CARD_TYPE: CardType = "product";

// data-rule (authoring) → VariantSelection (core). The runtime only acts on
// "pick-one"; "pick-any"/"pick-all" are spine-level selection semantics.
const RULE_MAP: Record<string, VariantSelection> = {
  "pick-one": "pick_one",
  "pick-any": "pick_any",
  "pick-all": "pick_all",
};

const CARD_SELECTOR = "[data-peek-card],[data-card]";

// ─────────────────────────────────────────────────────────────────────────────
// Small, defensive helpers (mirror peek-runtime.js so the read side matches the
// behavior side: same number parsing, same id fallback intent).
// ─────────────────────────────────────────────────────────────────────────────

/** attr or null — node-html-parser returns undefined for absent attrs. */
function attr(el: HTMLElement, name: string): string | null {
  const v = el.getAttribute(name);
  return v == null ? null : v;
}

/** A trimmed non-empty string, or null. */
function str(el: HTMLElement, name: string): string | null {
  const v = attr(el, name);
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

/**
 * Parse a money-ish attribute to a non-negative dollar number, mirroring
 * peek-runtime.js's `num()` (strip everything but digits/dot). Returns null when
 * the attribute is absent OR parses to 0 (0/absent = free, per the contract).
 */
function dollars(raw: string | null): number | null {
  if (raw == null) return null;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

/** Dollars → integer cents (rounded — guards float dust like 19.99*100). */
function toCents(d: number): number {
  return Math.round(d * 100);
}

/** A stable, readable kebab id from arbitrary text. */
function kebab(input: string): string {
  return input
    .toLowerCase()
    .replace(/['"]/g, "")          // drop apostrophes/quotes so "ray's" → "rays"
    .replace(/&[a-z]+;/g, " ")     // strip leftover html entities
    .replace(/[^a-z0-9]+/g, "-")   // everything else → single dash
    .replace(/^-+|-+$/g, "")       // trim dashes
    .slice(0, 60);
}

/**
 * A tiny deterministic hash (djb2) → short base36, for the last-resort id when a
 * card has neither data-peek-id nor data-name. Stable for identical content.
 */
function shortHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Does this element (or runtime's class convention) declare a lock? */
function declaresLock(el: HTMLElement): boolean {
  return el.hasAttribute("data-locked") || el.classList.contains("locked");
}

// ─────────────────────────────────────────────────────────────────────────────
// The extractor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Turn one tagged HTML gift page into its structured spine.
 *
 * Faithful, total, and order-preserving: every `[data-peek-card]`/`[data-card]`
 * becomes exactly one core `Card` (in document order, `position` = index); every
 * distinct `data-group` becomes one `VariantGroup` with its members linked via
 * `Card.variant_group_id`; `data-budget` (dollars) becomes `budgetCents`. Problems
 * are returned in `issues`, never thrown — the page may be mid-edit or messy.
 */
export function extractSpine(html: string): ExtractedSpine {
  const issues: ExtractionIssue[] = [];
  const cards: Card[] = [];

  // node-html-parser tolerates malformed input; never let a parse blow up the
  // caller (publish/preview must degrade gracefully, not 500).
  let root: HTMLElement;
  try {
    root = parse(html ?? "", {
      lowerCaseTagName: false,
      comment: false,
    });
  } catch (err) {
    issues.push({
      level: "error",
      code: "parse_failed",
      message: `HTML parse failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { cards: [], variant_groups: [], budgetCents: null, issues };
  }

  // ── budget: data-budget on ANY element (the order region). First wins. ──
  const budgetEl = root.querySelector("[data-budget]");
  const budgetDollars = budgetEl ? dollars(attr(budgetEl, "data-budget")) : null;
  const budgetCents = budgetDollars == null ? null : toCents(budgetDollars);

  // ── card elements, in document order ──
  const cardEls = root.querySelectorAll(CARD_SELECTOR);

  // Track ids so duplicates are detected and disambiguated (the dual-rep link
  // must be 1:1; two cards sharing an id would collide a pick).
  const seenIds = new Set<string>();

  // Accumulate variant-group membership + rules as we go.
  interface GroupAcc {
    key: string;
    rules: Set<string>;     // distinct raw data-rule values seen on members
    memberIds: string[];
  }
  const groups = new Map<string, GroupAcc>();

  cardEls.forEach((el, index) => {
    const name = str(el, "data-name");

    // ── id: REQUIRED for the dual-rep link; derive + warn when missing ──
    const rawId = str(el, "data-peek-id");
    let id: string;
    if (rawId) {
      id = rawId;
    } else {
      // derive a stable id: kebab(name) → kebab(text)+hash → position+hash
      const text = el.text.replace(/\s+/g, " ").trim();
      const basis = name ?? text;
      const kebabbed = basis ? kebab(basis) : "";
      id = kebabbed || `card-${index + 1}-${shortHash(text || String(index))}`;
      issues.push({
        level: "warn",
        code: "missing_id",
        message: `Card at position ${index} has no data-peek-id; derived "${id}". Assign a stable kebab id so edits and picks track this card.`,
        cardId: id,
      });
    }

    // ── duplicate ids: keep both cards but suffix the later ones + warn ──
    if (seenIds.has(id)) {
      let n = 2;
      let candidate = `${id}-${n}`;
      while (seenIds.has(candidate)) candidate = `${id}-${++n}`;
      issues.push({
        level: "warn",
        code: "duplicate_id",
        message: `Duplicate data-peek-id "${id}" at position ${index}; renamed to "${candidate}". Ids must be unique to link HTML ↔ spine.`,
        cardId: candidate,
      });
      id = candidate;
    }
    seenIds.add(id);

    // ── kind → CardType (+ preserve the raw authored kind) ──
    const rawKind = (str(el, "data-kind") ?? DEFAULT_KIND).toLowerCase();
    const type = KIND_MAP[rawKind] ?? DEFAULT_CARD_TYPE;
    if (!(rawKind in KIND_MAP)) {
      issues.push({
        level: "warn",
        code: "unknown_kind",
        message: `Card "${id}" has unknown data-kind="${rawKind}"; defaulting type to "${DEFAULT_CARD_TYPE}".`,
        cardId: id,
      });
    }

    // ── price (dollars) → value_cents; warn on a missing/free price ──
    const priceDollars = dollars(attr(el, "data-price"));
    const value_cents = priceDollars == null ? null : toCents(priceDollars);
    if (value_cents == null) {
      issues.push({
        level: "warn",
        code: "missing_price",
        message: `Card "${id}" has no positive data-price (treated as free / value unset).`,
        cardId: id,
      });
    }

    // ── group membership (linked below once every member is known) ──
    const groupKey = str(el, "data-group");
    const rawRule = str(el, "data-rule");
    if (groupKey) {
      let acc = groups.get(groupKey);
      if (!acc) {
        acc = { key: groupKey, rules: new Set(), memberIds: [] };
        groups.set(groupKey, acc);
      }
      acc.memberIds.push(id);
      if (rawRule) acc.rules.add(rawRule.toLowerCase());
    } else if (rawRule) {
      // a rule with no group can't form a selection set — warn, ignore the rule.
      issues.push({
        level: "warn",
        code: "rule_without_group",
        message: `Card "${id}" has data-rule="${rawRule}" but no data-group; the rule is ignored (no group to bind it to).`,
        cardId: id,
      });
    }

    // ── lock + unlock rule ──
    const isLocked = declaresLock(el);
    const unlockRaw = str(el, "data-unlock");
    let unlock_rule: UnlockRule | Record<string, never> = {};
    const metadata: Record<string, unknown> = { kind: rawKind };

    if (unlockRaw) {
      const m = /^after:(.+)$/i.exec(unlockRaw);
      if (m) {
        const token = m[1].trim();
        // The core UnlockRule shape is { kind:'beg'|'date_after'|'event',
        // beg_prompt?, unlock_after?:ISODate }. The authored token is a
        // kind/group/name reference the RUNTIME resolves when a matching card is
        // picked (peek-runtime.js maybeUnlock) — that is an EVENT-style unlock,
        // not a date and not a beg, so map kind→'event'. The token isn't an
        // ISODate, so it can't go in unlock_after; preserve it in metadata so the
        // HTML ↔ spine link round-trips. Warn that the precise trigger lives only
        // in metadata (the core shape can't hold a card/group reference).
        unlock_rule = { kind: "event" };
        metadata.unlock_after_token = token;
        issues.push({
          level: "warn",
          code: "unlock_token_in_metadata",
          message: `Card "${id}" unlocks after:"${token}" — mapped to UnlockRule.kind="event"; the trigger token is kept in metadata.unlock_after_token (core UnlockRule has no card/group reference field).`,
          cardId: id,
        });
      } else {
        issues.push({
          level: "warn",
          code: "malformed_unlock",
          message: `Card "${id}" has data-unlock="${unlockRaw}" not of the form "after:<token>"; ignored.`,
          cardId: id,
        });
      }
    }
    if (isLocked && unlockRaw == null) {
      // locked with no way to open it: surface it, but keep is_locked true.
      issues.push({
        level: "warn",
        code: "locked_without_unlock",
        message: `Card "${id}" is data-locked but has no data-unlock; it can never open.`,
        cardId: id,
      });
    }

    // ── taunt: also flip the decorative is_taunt flag (no distinct CardType) ──
    const isTaunt = rawKind === "taunt";
    // ── custom/homemade: record the homemade fact (no CardType / flag for it) ──
    if (rawKind === "custom") metadata.homemade = true;

    const description = str(el, "data-desc");
    const source_retailer = str(el, "data-src");

    cards.push({
      id,
      variant_group_id: groupKey ?? null, // group keys are stable ids; ok to reuse
      position: index,
      type,
      title: name ?? id,
      description,
      media: null, // images flow through the ImageProvider port, not the spine
      source_url: null,
      source_retailer,
      value_cents,
      value_display: null,
      reveal_value: true,
      is_taunt: isTaunt,
      taunt_text: isTaunt ? description : null,
      is_locked: isLocked,
      unlock_rule,
      proposed_date: null,
      location_hint: null,
      metadata,
    });
  });

  // ── materialize variant groups + reconcile rules ──
  const variant_groups: VariantGroup[] = [];
  for (const acc of groups.values()) {
    let selection: VariantSelection;
    if (acc.rules.size === 1) {
      const only = [...acc.rules][0];
      selection = RULE_MAP[only] ?? defaultSelection(acc, issues, only);
    } else if (acc.rules.size === 0) {
      // a group with members but no rule is ambiguous — default + warn.
      selection = "pick_any";
      issues.push({
        level: "warn",
        code: "group_no_rule",
        message: `Group "${acc.key}" has no data-rule on any member; defaulting selection to "pick_any".`,
      });
    } else {
      // conflicting rules across members — take the first authored, warn.
      const first = acc.memberIds.length ? [...acc.rules][0] : "pick-any";
      selection = RULE_MAP[first] ?? "pick_any";
      issues.push({
        level: "warn",
        code: "group_rule_conflict",
        message: `Group "${acc.key}" has conflicting data-rule values [${[...acc.rules].join(", ")}]; using "${selection}".`,
      });
    }

    // A lone-member group is rarely an intended pick set — flag pick_one on a
    // single card (nothing to choose between), but keep the group.
    if (acc.memberIds.length < 2) {
      issues.push({
        level: "warn",
        code: "lone_group",
        message: `Group "${acc.key}" has only ${acc.memberIds.length} member${acc.memberIds.length === 1 ? "" : "s"}; a selection set usually needs 2+.`,
      });
    }

    variant_groups.push({
      id: acc.key,
      title: titleizeGroup(acc.key),
      selection,
    });
  }

  // ── cross-check: a priced tab present while some claimable card lacks a price ──
  // publish can later promote this to a hard error (you can't draw an unpriced
  // pick down against a dollar budget). Skip taunts (decorative, never priced).
  if (budgetCents != null) {
    const unpriced = cards.filter((c) => c.value_cents == null && !c.is_taunt);
    if (unpriced.length) {
      issues.push({
        level: "warn",
        code: "unpriced_in_tab",
        message: `A budget tab is set ($${budgetDollars}) but ${unpriced.length} card(s) lack a price: ${unpriced
          .map((c) => `"${c.id}"`)
          .join(", ")}. Every claimable card on a tab needs a price (publish may treat this as an error).`,
      });
    }
  }

  return { cards, variant_groups, budgetCents, issues };
}

/** A group rule that isn't a known token → default pick_any + warn. */
function defaultSelection(
  acc: { key: string },
  issues: ExtractionIssue[],
  raw: string,
): VariantSelection {
  issues.push({
    level: "warn",
    code: "unknown_rule",
    message: `Group "${acc.key}" has unknown data-rule="${raw}"; defaulting selection to "pick_any".`,
  });
  return "pick_any";
}

/** "kicks" → "Kicks"; "running-shoes" → "Running Shoes". A readable group title. */
function titleizeGroup(key: string): string {
  const words = key.replace(/[-_]+/g, " ").trim();
  if (!words) return key;
  return words.replace(/\b\w/g, (c) => c.toUpperCase());
}
