import { parse, type HTMLElement } from "node-html-parser";
import type {
  Card,
  CardType,
  VariantGroup,
  VariantSelection,
  UnlockRule,
} from "@peek/core";

export interface ExtractionIssue {
  level: "warn" | "error";
  code: string;
  message: string;
  cardId?: string;
}

export interface ExtractedSpine {
  cards: Card[];
  variant_groups: VariantGroup[];
  budgetCents: number | null;
  issues: ExtractionIssue[];
}

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

const RULE_MAP: Record<string, VariantSelection> = {
  "pick-one": "pick_one",
  "pick-any": "pick_any",
  "pick-all": "pick_all",
};

const CARD_SELECTOR = "[data-peek-card],[data-card]";


function attr(el: HTMLElement, name: string): string | null {
  const v = el.getAttribute(name);
  return v == null ? null : v;
}

function str(el: HTMLElement, name: string): string | null {
  const v = attr(el, name);
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

function dollars(raw: string | null): number | null {
  if (raw == null) return null;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

function toCents(d: number): number {
  return Math.round(d * 100);
}

function kebab(input: string): string {
  return input
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function shortHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function declaresLock(el: HTMLElement): boolean {
  return el.hasAttribute("data-locked") || el.classList.contains("locked");
}


export function extractSpine(html: string): ExtractedSpine {
  const issues: ExtractionIssue[] = [];
  const cards: Card[] = [];

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

  const budgetEl = root.querySelector("[data-budget]");
  const budgetDollars = budgetEl ? dollars(attr(budgetEl, "data-budget")) : null;
  const budgetCents = budgetDollars == null ? null : toCents(budgetDollars);

  const cardEls = root.querySelectorAll(CARD_SELECTOR);

  const seenIds = new Set<string>();

  interface GroupAcc {
    key: string;
    rules: Set<string>;
    memberIds: string[];
  }
  const groups = new Map<string, GroupAcc>();

  cardEls.forEach((el, index) => {
    const name = str(el, "data-name");

    const rawId = str(el, "data-peek-id");
    let id: string;
    if (rawId) {
      id = rawId;
    } else {
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
      issues.push({
        level: "warn",
        code: "rule_without_group",
        message: `Card "${id}" has data-rule="${rawRule}" but no data-group; the rule is ignored (no group to bind it to).`,
        cardId: id,
      });
    }

    const isLocked = declaresLock(el);
    const unlockRaw = str(el, "data-unlock");
    let unlock_rule: UnlockRule | Record<string, never> = {};
    const metadata: Record<string, unknown> = { kind: rawKind };

    if (unlockRaw) {
      const m = /^after:(.+)$/i.exec(unlockRaw);
      if (m) {
        const token = m[1].trim();
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
      issues.push({
        level: "warn",
        code: "locked_without_unlock",
        message: `Card "${id}" is data-locked but has no data-unlock; it can never open.`,
        cardId: id,
      });
    }

    const isTaunt = rawKind === "taunt";
    if (rawKind === "custom") metadata.homemade = true;

    const description = str(el, "data-desc");
    const source_retailer = str(el, "data-src");

    cards.push({
      id,
      variant_group_id: groupKey ?? null,
      position: index,
      type,
      title: name ?? id,
      description,
      media: null,
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

  const variant_groups: VariantGroup[] = [];
  for (const acc of groups.values()) {
    let selection: VariantSelection;
    if (acc.rules.size === 1) {
      const only = [...acc.rules][0];
      selection = RULE_MAP[only] ?? defaultSelection(acc, issues, only);
    } else if (acc.rules.size === 0) {
      selection = "pick_any";
      issues.push({
        level: "warn",
        code: "group_no_rule",
        message: `Group "${acc.key}" has no data-rule on any member; defaulting selection to "pick_any".`,
      });
    } else {
      const first = acc.memberIds.length ? [...acc.rules][0] : "pick-any";
      selection = RULE_MAP[first] ?? "pick_any";
      issues.push({
        level: "warn",
        code: "group_rule_conflict",
        message: `Group "${acc.key}" has conflicting data-rule values [${[...acc.rules].join(", ")}]; using "${selection}".`,
      });
    }

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

function titleizeGroup(key: string): string {
  const words = key.replace(/[-_]+/g, " ").trim();
  if (!words) return key;
  return words.replace(/\b\w/g, (c) => c.toUpperCase());
}
