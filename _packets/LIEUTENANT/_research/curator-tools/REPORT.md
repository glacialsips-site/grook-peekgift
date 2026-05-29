# Curator Tool-Set — Canonical Spec

_Source: Hercules research sub (Opus 4.8). The structured tool calls Peek uses to mutate live page-state._

**Sources consulted:**
- `atelier/components/renderer/page-state.ts`
- `atelier/lib/vibe/grammar/grammar.ts` + `engine.ts`
- `atelier/db/schema/cards.ts`, `peeks.ts`, `picks.ts`

## §0 — Design principles (load-bearing)

1. **Small surface, large reach.** Target 16–22 tools. Sonnet on Edge degrades with wide menus.
2. **Idempotent where possible.** `set_*` replaces; `add_*` creates; `update_*` patches by id.
3. **All inputs are IDs, never literal styling.** Renderer reads everything from validated `Vibe`.
4. **Outputs are tiny envelopes.** `{ ok, id, position }` or `{ ok: false, error, user_message? }`. Cap tool_results at ~200 items (Edge constraint). Never echo full page-state.
5. **Tools NEVER validate grammar invariants.** Validation lives in `validatePageComposition` + `generateAndRepair`. Tools mutate freely; auto-repair fires before render.
6. **Every mutation returns enough metadata for a `MutationLogEntry`** (verb, subject, before/after, summary). Tool does NOT write the log; the dispatch wrapper does, on success.
7. **No conversational tools.** Conversation lives in model prose.
8. **No payment tools.** Hands off to checkout UI via `mark_ready_to_publish` + `set_publish_meta`.

## §1 — The 22 tools, 7 categories

### Category A — Meta (page-level identifiers + scoping)

**A1. `set_recipient`** — recipient_name, occasion, relationship, giver_names. Turn 1. Idempotent. Dispatch auto-chains `set_vibe_from_occasion` if occasion given AND no vibe set.

**A2. `set_recipient_profile`** — favorites, obsessions, allergies, sizes, notes. Merges additively on arrays, replaces notes. Eager — every fact dropped.

**A3. `set_note`** — personal note markdown (1..5000 chars). Sounds like the curator, not Peek. Moderation check.

**A4. `set_spend_caps`** *(NEW)* — recipient hard + soft caps on total picked value. Schema add required: `peeks.recipient_hard_cap_cents`, `peeks.recipient_soft_cap_cents`, `peeks.cap_rationale`.

### Category B — Vibe (6 small dimension-scoped tools, NOT one big bag)

**B1. `set_vibe_from_occasion`** — Dispatch maps occasion → preset library → `generateAndRepair` → validated `Vibe`. Turn 1–2, once.

**B2. `adjust_palette`** — `base_hue?, hue_shift?, key?, saturation?, strategy?`. Perturbs seed, re-runs `derivePalette` for contrast safety. High frequency.

**B3. `swap_typography`** — `display_role?, body_role?, scale_contrast?, display_case?, display_tracking?`. Constrained to `LEGAL_FONT_PAIRS`; rejects illegal with closest substitution, surfaces `repaired` field.

**B4. `set_mood`** — `mood: 'minimal'|'rich'|'whimsical'|'editorial'|'moody'|'soft'|'electric'`. Coarse bundle: shape/depth/texture/motion/imagery.

**B5. `set_voice`** — full VoiceSpec (warmth/humor/pace/formality/emoji/vocabulary/length). Turn 1–2, sticky.

**B6. `regenerate_vibe`** — escape hatch. `direction: string, preserve?: ...[]`. Full `generateAndRepair`. Rare. `defer_loading: true`, guardrail >1×/turn.

### Category C — Hero

**C1. `set_hero_image`** — URL + source label. Dispatch schedules background palette extraction; may auto-call `adjust_palette` if contrast breaks.

**C2. `generate_hero_image`** — fal.ai Flux. Server enriches with vibe palette/mood/recipient context. Output never `ok:false`; `image_url: null` when fal offline so Peek doesn't catastrophize.

### Category D — Sections + Cards (commercial heart)

**D1. `add_card_group`** *(renamed from `add_variant_group`)* — title, selection (`pick_one|any|all`), preferred_presentation (`ProductSetVariant`). HINT — `presentationForCount` overrides if illegal for count.

**D2. `add_card`** — Card model (§2). Kind: `retailer_product|service|homemade|booked_experience|custom_experience|taunt`. URL-scrape, affiliate-wrap, etc., happens in handler.

**D3. `add_card_variants`** — siblings in one call (2..8). Critical so "pick one of three" doesn't take 3 round-trips. Parallel scrapes in handler.

**D4. `update_card`** — patch by id.

**D5. `set_card_rules`** *(unifies prior lock/taunt)* — `lock: { kind: 'beg'|'date_after'|'event'|'requires_picks'|'none' }, taunt: { active, text? }`.

**D6. `remove_card`** — cascade: if only card in group, group removed.

**D7. `reorder_cards`** — `scope: { group | page }, card_ids: permutation`. Rare.

### Category E — Lifecycle (publish handoff)

**E1. `mark_ready_to_publish`** — preconditions: recipient_name, note, hero_image, ≥1 non-taunt card, touched vibe. Output paths: `paywall` / `preconditions_failed` (with `missing[]`) / `already_published`. Returns `share_url` on success.

**E2. `set_publish_meta`** — slug + optional expiry. Before E1. `slug_taken` is DB constraint trapped in dispatch.

**The handoff boundary (strict rule):**
- Peek owns: page-state mutation, drafting text, choosing placements, asking about recipient.
- Peek does NOT own: money, URL minting, recipient notifications, talking to recipient. Those are UI/server jobs surfaced via system events.
- After `mark_ready_to_publish` returns paywall, BUILD UI mounts Stripe Payment Element, handles `payment_intent.succeeded`, flips status, mints share_url. BUILD UI then emits `system: 'published'` event into Peek's transcript. Peek congratulates in PROSE only — no further tool calls.

### Category F — Inquiry

**F1. `get_page_summary`** — tiny structured summary for session-resume. NOT full state. One inquiry tool only.

## §2 — The Card Model

```ts
type CardKind =
  | 'retailer_product'    // real product, URL-scraped, affiliate-wrapped
  | 'retailer_service'    // booking page (restaurant, salon, class)
  | 'homemade'            // curator-made (no URL, curator-supplied image)
  | 'booked_experience'   // dated experience (concert tix, dinner res)
  | 'custom_experience'   // bespoke promise ("a yes-day", "I'll teach you guitar")
  | 'taunt';              // gag — never pickable

type CardLock =
  | { kind: 'beg', beg_prompt?: string }
  | { kind: 'date_after', unlock_after: string }
  | { kind: 'event', unlock_after?: string }
  | { kind: 'requires_picks', card_ids: string[] }
  | { kind: 'none' };

interface Card {
  id: string;
  peek_id: string;
  group_id: string | null;
  position: number;

  kind: CardKind;
  title: string;
  description: string | null;
  image_url: string | null;
  alt_text: string | null;

  source_url: string | null;
  source_retailer: string | null;
  affiliate_url: string | null;
  affiliate_network: 'skimlinks'|'sovrn'|'amazon_associates'|'direct' | null;
  commission_pct: number | null;
  scrape_provider: 'browserbase'|'zenrows'|'jina'|'fetch' | null;
  scrape_degraded: boolean;

  value_cents: number | null;
  reveal_value: boolean;

  proposed_date: string | null;
  location_hint: string | null;

  lock: CardLock;
  is_taunt: boolean;
  taunt_text: string | null;

  added_by_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

**Kind→DB type mapping (handler):** `retailer_product` → `product`; `retailer_service`, `booked_experience` → `activity`; `homemade`, `custom_experience` → `aspirational`; `taunt` → `product` with `isTaunt: true`. Long-term: widen DB enum to match `CardKind` (additive, low cost).

## §3 — Vibe tools rationale

`set_vibe` (bag-of-everything) is too coarse — turn 8 "warmer please" forces Peek to remember the whole shape. Replaced with 6 small tools, one dimension each. B1 once per peek; B2 high frequency; B3-B5 medium; B6 rare.

Preset library (BRIEF 07) is the source of taste for B1. Validator + auto-repair are the safety net for B2–B6.

## §4 — The undo problem

**Stance: UI-level undo for content; no `undo` tool.**

- Mutation log dispatch layer already tracks "what was my last mutation"; a tool would force Peek to model it redundantly.
- Curator says "no go back" → BUILD UI intercepts as UI action, pops most recent log entry, applies `inverse`, emits synthetic `system: 'mutation_reverted'` into Peek's transcript so model sees new state.
- If Peek itself wants to revert ("dialing back the palette") → call `adjust_palette` with inverse delta. Forward operation adding another log entry — correct; don't pretend the second decision was a non-event.

Edge case: undo crossing `mark_ready_to_publish` → inverse is `peek.status: draft` (cheap). Undo crossing payment → `inverse: null`. Refunds are human-in-loop dashboard actions.

## §5 — Publish lifecycle (visual flow)

```
[Peek mutates page-state via tools]
                  │
                  ▼
  curator: "let's publish"
                  │
                  ▼
[Peek calls mark_ready_to_publish (E1)]
  │                                          │
preconditions_failed                       ok, next_step: paywall
  │                                          │
  ▼                                          ▼
Peek asks for missing pieces        BUILD UI mounts paywall
using `missing[]`                    custom Stripe Payment Element
(no apologies)                              │
                                            ▼
                              curator pays
                                            │
                                            ▼
              Stripe webhook → flips peek.status: published
                              mints share_url
                                            │
                                            ▼
              BUILD UI emits system event into Peek transcript:
                { kind: 'published', share_url, recipient_first_name }
                                            │
                                            ▼
              Peek congratulates in PROSE only
              (no tool calls — share button etc. are UI affordances)
```

**Slug minting:** Dispatch auto-generates from `recipient_name + nanoid(4)` on E1 unless `set_publish_meta` called. E1's success returns `share_url`.

## §6 — Mutation log entry shape

Every successful tool call yields one entry. Diff-mark UI consumes; undo reads `inverse`.

```ts
type MutationVerb =
  | 'add_card' | 'add_card_variants' | 'update_card' | 'remove_card'
  | 'reorder_cards' | 'set_card_rules' | 'add_card_group'
  | 'set_recipient' | 'set_recipient_profile' | 'set_note' | 'set_spend_caps'
  | 'set_vibe_from_occasion' | 'adjust_palette' | 'swap_typography'
  | 'set_mood' | 'set_voice' | 'regenerate_vibe'
  | 'set_hero_image' | 'generate_hero_image'
  | 'mark_ready_to_publish' | 'set_publish_meta';

interface MutationLogEntry {
  id: string;                     // ulid — sortable by time
  peek_id: string;
  turn_id: string;                // groups mutations within a single model turn
  emitted_at: string;             // ISO
  verb: MutationVerb;
  subject: { kind: 'page'|'card'|'group'|'vibe'|'hero'|'note'|'recipient', /* + id */ };
  tool_input: Record<string, unknown>;
  tool_output: Record<string, unknown>;
  changed_ids: string[];          // node ids the renderer should chip
  summary: string;                // "Peek added 'Wool Throw' to The Drop"
  chip_color?: 'add'|'edit'|'remove'|'reorder'|'vibe';
  inverse: { verb, input } | null; // null = not undoable
  scrape_cost_cents?: number;
  image_gen_cost_cents?: number;
  llm_input_tokens?: number;
  llm_output_tokens?: number;
}
```

**Summary generation lives in dispatch, not tool handlers** — keeps handlers small.

**Schema gap:** No `peek_mutation_log` table exists. `events` covers analytics breadcrumbs but isn't ordered per-peek with `inverse`. Recommend new table → BRIEF 08 (schema).

## §7 — Failure modes + error contract

Peek is closed-objective. When a tool fails Peek doesn't apologize, doesn't explain the mechanic.

**Closed `ErrorCode` enum:**

| ErrorCode | Meaning | Peek's action |
|---|---|---|
| `moderation_block` | Anthropic moderation flagged | Surface `user_message` verbatim; ask rephrase |
| `preconditions_failed` | Missing required state | Use `missing[]` to ask for the specific gap |
| `not_found` | id doesn't exist | Retry once with `get_page_summary`; if still missing, "I lost track of that one, point me at it again?" |
| `invalid_input` | Zod parse failed | Retry once with corrected args; if still failing, Peek bug — log + skip |
| `scrape_failed` | Pipeline returned nothing | Card was still inserted; "couldn't pull the image from that site — screenshot or another link?" |
| `image_gen_offline` | fal returned null | Use `fallback_suggestion` — propose upload OR lean on card art |
| `rate_limited` | Throttle layer said no | Wait + one-shot retry; if still limited, "hitting some limits — let's work on the note while we wait" |
| `slug_taken` | E2 slug in use | Propose variant; ask curator to confirm |
| `already_published` | E1 on live peek | Mention share URL; offer to archive |
| `network` | Transient mid-call death | Retry once |

**Dispatch enforcement:** append meta-reminder to failed `tool_result`:
```
[NOTE TO PEEK: tool failed with ${error}. Do not apologize or explain the mechanic.
${user_message ? `Use this verbatim: ${user_message}` : `Surface to the curator in their terms.`}
${suggestion ? `Hint: ${suggestion}` : ''}]
```
Curator never sees the `[NOTE TO PEEK: ...]` block (it's part of tool_result, not assistant output).

## §8 — Anti-tools (deliberately NOT built)

| Anti-tool | Why |
|---|---|
| `chat_with_curator` / `say_to_curator` / `reply` | Peek's prose IS the chat reply |
| `ask_clarifying_question` | Prompt-level concern; meta-loop |
| `acknowledge` / `confirm_with_curator` | UX theater |
| `propose_payment_method` / `propose_checkout` / `propose_subscription` | Payment UI's job; Peek has no opinion |
| `set_curator_memory` | Out of scope for closed objective |
| `invite_cocurator` / `share_to_social` / `request_camera_capture` | Side-quests; UI buttons emit system events |
| `unlock_event` | Post-publish admin |
| `set_countdown` | Renderer feature, not curator decision |
| `place_search_v2` / `affiliate_search` | Open-assistant patterns; if needed, single strict `search_places` |
| `set_movie_card` / `set_song_card` / `set_youtube_card` | Specialized adders bloat menu; `add_card` + scrape covers; specialized paths internal |
| `set_rules_template` | Patterns are PROMPT-LEVEL playbooks Peek composes from primitives |

**Litmus test:** "Could Peek do this in prose, OR does it mutate persistent state the renderer reads?" Prose → anti-tool. Mutation → candidate.

## §9 — Summary

22 canonical tools, 7 categories. Thin-spine BUILD ships with **12** (A1, A3, B1, B2, C1, D1, D2, D3, D4, D6, E1, F1 — skip A2, A4, B3–B6, C2, D5, D7, E2 initially). Grows from real usage data.

Anthropic's `defer_loading: true` on heavier schemas (D2, D3, C2, B6, D5).

## §10 — Open questions for orchestrator

1. **Spend caps schema add** — `peeks.recipient_hard_cap_cents/soft_cap_cents/cap_rationale`. Render-side picker UI also needs to know → flag in BUILD or recipient brief.
2. **Card kind vs DB type** — confirm temporary mapping. Long-term: widen DB enum to `CardKind`.
3. **Mutation log table** — doesn't exist. Recommend `peek_mutation_log` → BRIEF 08 (schema).
4. **Preset library for B1** — depends on BRIEF 07 grammar-presets.
5. **B6 cost** — burns full model call inside tool handler. Edge can afford (network wait). Guardrail >1×/turn.
