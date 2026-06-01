# ir/INTERFACES.md — the frozen inter-component contracts

The three seams every downstream agent builds **to**. The shapes here are derived from
`lib/ir/contract.ts` (types), `lib/ir/schema.ts` (runtime validation + sanitize), and
`lib/ir/ports.ts` (capabilities). If code and this doc disagree, the **code in `lib/ir/*`
wins** — update this doc, never silently diverge.

Three parts, one shape: the **chat** authors a `PeekIR`; the **renderer** consumes a
`PeekIR`; **checkout + the recipient surface** consume a `PeekIR`. Everything below is how
those parts talk.

Conventions: a port `Result<T>` is `{ ok:true, ...T } | { ok:false, error, retryable? }`
(see `ports.ts`). All IR mutations are validated with `validatePeekIR()` before persist,
and any `custom` HTML is run through `sanitizeCustomHtml()` before render.

---

## 1. Renderer API

The renderer turns a `PeekIR` into a live, themed, interactive DOM subtree and **updates in
place** as the chat streams IR snapshots. It is a **controller** (create once, `update()`
on every snapshot), not a one-shot. It knows **section KINDS, never specific pages**.

### 1.1 Signature

```ts
import type { PeekIR, Section } from '@/lib/ir/contract';

export interface RecipientInteractions {
  // The recipient surface (DQ-7) supplies these; the gift-builder preview passes no-ops.
  // Layered ON the shared renderer — the renderer calls them, never implements them.
  onPick?(cardId: string): void;                 // recipient selects a card
  onBeg?(cardId: string, message: string): void; // locked card with unlock_rule.kind==='beg'
  onUnlock?(cardId: string): void;               // a date_after/event card whose gate passed
  onCheckout?(): void;                           // the in-world CTA (Peek.cta_label) fired
}

export interface RenderOptions {
  surface: 'builder' | 'recipient';  // builder = live preview pane; recipient = the shared page
  interactions?: RecipientInteractions;
  reducedMotion?: boolean;           // force-honor prefers-reduced-motion (else read media query)
}

export interface PeekRenderer {
  update(ir: PeekIR): void;          // re-render/diff to the new IR snapshot (idempotent)
  destroy(): void;                   // tear down observers/listeners/injected <style>/<link>
}

// Mounts into `root` and returns the controller. Implementation may be React (preferred,
// per stack) or imperative DOM — the SEAM is this fn + update/destroy, not the internals.
export function mountPeek(root: HTMLElement, ir: PeekIR, opts: RenderOptions): PeekRenderer;
```

The chat preview calls `mountPeek(el, ir, { surface:'builder' })` once, then `update(ir)` on
every `page` SSE event (§2). The recipient route calls it with `surface:'recipient'` and real
`interactions`.

### 1.2 ThemeSpec → `--peek-*` CSS variables (DQ-1)

The renderer is the **only** emitter of theme vars; it sets them on the mount root's `style`
so all descendants — including `custom`-block HTML — inherit them. Exact mapping (the var
contract is also documented on `ThemeSpec` in `contract.ts`):

| ThemeSpec field        | CSS variable             | notes |
|------------------------|--------------------------|-------|
| `palette.bg`           | `--peek-bg`              | |
| `palette.surface`      | `--peek-surface`         | |
| `palette.ink`          | `--peek-ink`             | |
| `palette.muted`        | `--peek-muted`           | |
| `palette.line`         | `--peek-line`            | |
| `palette.accent`       | `--peek-accent`          | |
| `palette.accent2`      | `--peek-accent-2`        | fall back to `accent` if absent |
| `type.display` (stack) | `--peek-font-display`    | full font stack incl. fallbacks |
| `type.body` (stack)    | `--peek-font-body`       | |
| `type.accent` (stack)  | `--peek-font-accent`     | fall back to display if absent |
| `radius.card`          | `--peek-radius-card`     | `…px` |
| `radius.pill`          | `--peek-radius-pill`     | `…px` |
| `space.sectionY`       | `--peek-space-section-y` | `…px` |
| `space.gutter`         | `--peek-space-gutter`    | `…px` |
| `space.stack`          | `--peek-space-stack`     | `…px` |
| `motion.easePanel`     | `--peek-ease-panel`      | slide menu / sticky bar curve |
| `motion.easeSheet`     | `--peek-ease-sheet`      | bottom-sheet curve |

Then emit `ThemeSpec.cssVars` verbatim — but **only after** `sanitizeCssVars()` (drops any
key not starting with `--peek-`, neutralizes `javascript:`/`expression(`). `palette.mode`,
`glow`, `texture`, `scene`, `motifs`, `frame` drive painted treatments (gradients, grain,
neon glow, scene backdrops, framed media), not vars. Honor `prefers-reduced-motion` and
gate ambient loops on `motion.intensity`. **Never emit the legacy `--bg/--accent` names** —
the ported reference engine (`peek-jumpoff/engine/renderer.js`) used those; it is rewritten,
not copied.

### 1.3 SectionKind dispatch

Iterate `ir.sections` in array order; dispatch on `section.kind`, reading the documented
`section.data` shape (full table in `contract.ts` §5). Unknown `data` keys are ignored;
unknown decorative enum values (scene/motif/frame) degrade to `none`/`plain` — never throw.

- `hero` — `{ eyebrow?, headline (may contain \n), dek?, ledger?: [k,v][], media? }`. Auto-fit
  the headline so long words never overflow; full-bleed when `media.url` is present.
- `note` — pulls `Peek.note_md` (or `data.title`/`data.sub` override). Markdown → safe HTML.
- `giftgrid` — **the core.** Render `ir.cards` (respecting `variant_groups` + `position`).
  `data.intro?` is a lead line. Map `Card.type` (`product|activity|aspirational|digital`,
  DQ-5) to the card face; the old `homemade/experience/idea` vocabulary is **re-mapped here**,
  not in the IR. Card price text uses `Card.value_display` when set (DQ-4: ranges / "—"),
  else format `value_cents`; hide entirely when `reveal_value===false`.
- `rail` / `lookbook` / `tracklist` / `courses` / `tiers` / `stubs` / `flightplan` — alternate
  presentations over `ir.cards` (or section-local items in `data`); see the reference shell.
- `gallery` (DQ-3) — `{ images?: MediaSlot[] }` horizontal photo strip.
- `details` (DQ-3) — `{ rows: [label,value][] }` when/where/dress for invites.
- `steps` — `{ steps: [num,label][] }`.
- `countdown` (DQ-3, **live**) — `{ target: ISODate, label?, doneText? }`. A ticking client
  clock — this is why it's first-class, not `custom`.
- `claim` (DQ-3, **live**) — `{ label?, capacity?, cta? }`. Live claim/RSVP count; wires to
  `interactions.onPick`/recipient state.
- `custom` — `{ html }` model-authored themed markup. **MUST** pass through
  `sanitizeCustomHtml()` before injection. The renderer provides the `--peek-*` vars; the
  HTML styles itself against them. This is the no-ceiling escape hatch.

### 1.4 The interaction shell (port the *quality*, per DECISIONS)

Bar = the original mockups. The shared shell (both surfaces): sticky top bar that solidifies
on scroll, slide-in menu (staggered links), bottom **detail sheet** on card tap, sticky
**action bar** (subtotal + CTA) that appears past the hero, scroll-reveal stagger, count-ups,
scroll-progress. Animate with `--peek-ease-panel` / `--peek-ease-sheet`; gate on
`motion.intensity` + reduced-motion.

### 1.5 How recipient interactions layer on (DQ-7)

One renderer, two surfaces. `surface:'recipient'` wires the shell's affordances to
`interactions`: card tap → sheet → **Pick** button → `onPick(cardId)`; a locked card with
`unlock_rule.kind==='beg'` shows `beg_prompt` + input → `onBeg(cardId, msg)`; `date_after`/
`event` gates resolve to `onUnlock(cardId)` when passed; the in-world CTA (`Peek.cta_label`)
→ `onCheckout()`. `surface:'builder'` passes no-ops (preview is non-interactive for picks).
The recipient surface owns pick/beg/unlock **state + persistence** (via `Pick` + its own
route); the renderer only emits the events.

---

## 2. Chat SSE protocol

The chat route (`app/api/chat/*`, streaming per DQ-9) responds with
`Content-Type: text/event-stream`. Each SSE `data:` line is one JSON object of the union
below (newline-delimited JSON also acceptable for fetch-stream clients). The client applies
them in order: append `text` deltas to the transcript; replace the preview with each `page`
snapshot; surface `tool`/`notice`; stop on `done`/`error`.

```ts
export type ChatEvent =
  | { type: 'text';   delta: string }                         // assistant prose, token by token
  | { type: 'page';   ir: PeekIR; rev: number }               // full validated IR snapshot → renderer.update()
  | { type: 'tool';   phase: 'start' | 'result' | 'error';
      id: string; name: string;                               // the design tool (§3)
      input?: unknown;                                         // present on 'start'
      result?: unknown;                                        // present on 'result' (the tool's return)
      error?: string }                                        // present on 'error'
  | { type: 'notice'; level: 'info' | 'warn'; text: string }  // non-fatal (e.g. stub-mode banner, safeword)
  | { type: 'done';   rev: number }                           // turn complete; rev = final snapshot rev
  | { type: 'error';  error: string; retryable?: boolean };   // fatal for this turn
```

Rules:
- **`page` carries the FULL IR**, already `validatePeekIR()`-passed and `custom`-HTML
  sanitized server-side — the client renders it as-is, never re-validates for safety. `rev`
  increments per snapshot; the client ignores a snapshot whose `rev` is ≤ the last applied.
  Emit a `page` after each tool that mutates the IR so the preview tracks the chat live.
- **`text`** is incremental; concatenation reconstructs the message. Interleaves with `tool`
  and `page` in real call order.
- **`tool`** brackets each tool call (`start` → `result|error`) for "Peek is doing X" UI;
  the actual IR change always also arrives as a `page`.
- **`notice`** is for out-of-band info: stub-mode (`[stub-llm]`/no keys) banner, the safeword
  self-report, moderation flags. **Safeword** (`process.env.PEEK_SAFEWORD ?? "bananahead"`,
  DQ-8): when the user message equals it exactly, the route drops persona and emits the
  structured self-report as `notice`(s) — what it inferred / the pantry lacked / it faked /
  fought / would make gnarlier — then `done`. Never inline the safeword in the prompt.
- **`error`** ends the turn; `retryable` mirrors the port `Result.retryable`.
- Stub LLM (no `ANTHROPIC_API_KEY`) still drives this protocol: it emits a deterministic
  `text` + at least one `page`, so the surface is demoable with zero secrets.

---

## 3. Tool → IR reducer API

Every design tool is a **pure mutation** on the IR: `reduce(ir, name, input) → ir'`. The
server validates `input` against the tool's schema, applies the mutation, re-runs
`validatePeekIR()` on the result, persists via `ports.persistence`, and emits a `page` event.
The **same reducer** runs in live mode (model calls the tool) and in stubbed/scripted mode
(so the preview builds identically with no key — mirrors the salvaged
`lib/peek/preview-driver.ts` pattern). The reducer calls `ports.*` only — **never** a vendor
SDK or raw SQL inline (`runTool` rule from PLAN.md §2).

```ts
import type { PeekIR } from '@/lib/ir/contract';
export interface ToolContext { peekId: string; curatorId: string }
export type ToolResult = { ok: true; ir: PeekIR; result?: unknown } | { ok: false; error: string };
export async function reduceTool(ir: PeekIR, name: string, input: unknown, ctx: ToolContext): Promise<ToolResult>;
```

The tool set mirrors + extends the existing `lib/peek-tools.ts` (the old `set_vibe`→`set_theme`,
`set_hero_image`/`generate_hero_image` now write `MediaSlot`, `scrape_url`→`resolve_card`,
`mark_ready_for_publish`→`mark_ready`). Inputs are the **Anthropic `input_schema`** the model
sees; mutations are exact.

| Tool | Input (key fields) | IR mutation |
|---|---|---|
| `set_concept` | `oneLiner*, boldMove*, voice*, emotionalCore*, antiPattern?` | Replace `peek.concept`. The anti-generic lock — author this first/early. |
| `set_theme` | `theme: ThemeSpec` (or partial — merge) incl. `type{display,body,accent,scaleRatio,displayTracking,eyebrowTracking,displayCase}`, `palette`, `scene`, `motifs[]`, `frame`, `radius{card,pill}`, `space{sectionY,gutter,stack}`, `motion{intensity,reduceMotionOK,easePanel,easeSheet}`, `cssVars?` | Deep-merge into `peek.theme`; `cssVars` filtered by `sanitizeCssVars`. Must VARY `type.display` per concept (no default Fraunces+Inter). |
| `upsert_section` | `id?, kind*, title?, data?, media?, position?` | If `id` exists → patch it; else insert a new `Section` (at `position`, else append). `kind`-specific `data` shapes per `contract.ts` §5. `custom.html` sanitized on apply. |
| `remove_section` | `id*` | Drop the section with `id` from `sections[]`. |
| `reorder_sections` | `section_ids: string[]` | Reorder `sections[]` to match the id list. |
| `set_note` | `note_md*` | Set `peek.note_md` (markdown). Polish curator voice — never rewrite. A `note` section renders it. |
| `add_card` | `type*, title*, description?, source_url?, source_retailer?, value_cents?, value_display?, reveal_value?, variant_group_id?, proposed_date?, location_hint?, is_taunt?, taunt_text?, is_locked?, unlock_rule?, media?` | Append a `Card` (auto `id`, `position = cards.length`). `media` is a `MediaSlot`; `value_display` (DQ-4) is the human price string. Defaults: `reveal_value=false`, flags=false, `unlock_rule={}`, nullables→null. |
| `update_card` | `card_id*, ...any Card field` | Patch the card with `card_id` (partial). |
| `add_variant_group` | `title*, selection*('pick_one'|'pick_any'|'pick_all')` | Append a `VariantGroup` (auto `id`); returns `variant_group_id` for subsequent `add_card`. |
| `set_card_rule` | `card_id*, is_locked?, unlock_rule?{kind('beg'|'date_after'|'event'),beg_prompt?,unlock_after?}, reveal_value?` | Set lock/unlock/reveal on a card (the "beg / unlock / off-limits-but-funny" mechanic). |
| `remove_card` | `card_id*` | Delete the card; re-pack remaining `position`s. |
| `reorder_cards` | `card_ids: string[]` | Set `position` to match the id order. |
| `generate_hero_image` | `prompt*, aspect?` | Call `ports.image.generate`; set `peek.hero` to a `MediaSlot` (`source:'ai_generated'`, resulting `url`, `directive` echoing the prompt). Returns `{ url, provider }`. |
| `set_hero_media` | `url?, source?, directive?, alt?, frame?` | Set `peek.hero` to a `MediaSlot` directly (user upload / paste / pending directive). |
| `resolve_card` | `text* (fuzzy ask OR URL), constraints?{maxPriceCents,shipTo,sizeHint}, images?, screenshot?` | Call `ports.cardResolver.resolve` (the DQ-10 cascade). Returns `{ card: CardData, via }`; the model then calls `add_card` with it (or apply directly). Replaces the old self-HTTP `scrape_url`. |
| `mark_ready` | `{}` | Flag the draft ready → triggers the paywall/publish step. Emits an event; no IR field beyond status intent. |

Reducer guarantees:
- Validate `input`, apply, **re-validate the whole IR** (`validatePeekIR`) — reject the
  mutation if the result is invalid; never persist/emit an invalid IR.
- Sanitize before store/render: `custom` section `html` → `sanitizeCustomHtml`; theme
  `cssVars` → `sanitizeCssVars`.
- ID/position bookkeeping (new ids, contiguous `position`) lives in the reducer, not the model.
- All side-effecting work goes through `ports.*` (image gen, resolve, persistence, analytics).
```
