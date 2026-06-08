# audit-verify.md — ground-truth code verification for the build decision

Read-only verification against actual source (`git show <ref>:<path>`, `git grep`). Doc claims were NOT trusted; every answer below is quoted from code.

## Headline (5 lines)
1. **PAGE MODEL: the freeform line authors WHOLE HTML via `set_page(html)` with a derived structured spine (Dual Representation / Shape C) — VERIFIED-TRUE** on `clean-slate`, `in-site-chat-buildout`, `studio-vnext`. The structured-IR (`set_concept`/`set_theme`/`upsert_section`) model is the OLDER one and is what `gallant-planck` still ships — `gallant-planck` is the pivot boundary, pre-`set_page`.
2. **DEFAULT_MODEL: `claude-opus-4-8` (Opus 4.8) — VERIFIED-TRUE** on every freeform branch (`const MODEL = "claude-opus-4-8"`). NOT Sonnet 4.6. COGS: Opus 4.8 = $5/$25 per 1M in/out vs Sonnet 4.6 = $3/$15 (~1.67× more, both directions).
3. **SERVER-SIDE CAPS: variant rules ARE enforced server-side; hard/soft $ caps are NOT — "code says: caps supported by engine but the route never passes them."** Variant/lock/taunt rules fire in `decidePick`; the freeform `apps/web` pick route calls `decidePick(doc, current, action)` with **no `caps` arg**, so the cap branches are dead.
4. **THE GATE: `packages/core` (decide→event→apply, neverthrow, `ports.ts`) EXISTS on `clean-slate` (newest tip) — VERIFIED-TRUE, not "only on gallant-planck."** BUT the freeform pivot **dropped the maker-checker from the page-authoring path** (HTML is sanitized, not `decide()`-validated). The gate survives only for **picks** (`decidePick`). `gallant-planck`'s authoring path still routes every tool through `decide()`.
5. **BUG SPOT-CHECK: the bug IDs are pinned to the `atelier` codebase, not the freeform `apps/web`.** B15 idempotency fail-OPEN = VERIFIED-TRUE on atelier. Anon `/build` can 500 = VERIFIED-TRUE on atelier (but `/build` does not exist on the freeform line at all). fal-null and CSS-URL escape on the freeform line are in their FIXED state.

---

## Branch map (so the build decision is unambiguous)
- **Freeform line (post-pivot, `set_page` HTML model):** `origin/claude/clean-slate` (newest tip, 2026-06-04; pure monorepo, NO legacy top-level `app/`/`lib/`), `origin/claude/in-site-chat-buildout`, `origin/claude/studio-vnext`. `in-site-chat-buildout` and `studio-vnext` have **byte-identical `apps/web`** (`git diff --stat origin/claude/studio-vnext origin/claude/in-site-chat-buildout -- apps/web/` is empty). `clean-slate` is the comment-stripped derivative (tip: "chore: strip every comment from the live app").
- **Pre-pivot, structured-IR model:** `origin/claude/gallant-planck-pu51x` (2026-06-02). Its `apps/web` curator authors IR (`set_concept`…), routed through `decide()`.
- **Live app of each monorepo branch = `apps/web`** — `netlify.toml` on every branch has `base = "apps/web"` and `command = "… pnpm --filter @peek/web build"`. The legacy top-level `app/`/`lib/` present on `in-site-chat-buildout` and `gallant-planck` is NOT the deployed surface.
- **`origin/atelier-integration`** is a separate, older codebase (top-level `atelier/`) — the one the `audit/bugs-wave2` BUGS.md catalogue is written against.

---

## ITEM 1 — PAGE MODEL: `set_page(html)` + derived spine (Shape C)?

### VERDICT: VERIFIED-TRUE on the freeform line. The current freeform code authors whole HTML via `set_page` and derives a structured spine; the document is the Dual-Representation envelope. The structured-IR tools are the OLD model (live on `gallant-planck`, dead/absent on the freeform line's deployed app).

**Tool surface — `clean-slate:apps/web/lib/curator/tools.ts`** (identical on in-site-chat/studio-vnext):
```ts
export const PEEK_STUDIO_TOOLS: ToolDef[] = [
  { name: "set_page",
    description: "Author the WHOLE page as one freeform HTML document and show it. Call this FIRST … Tag every interactive/claimable thing with the data-peek-* contract. Decoration is CSS/SVG only — never emit a <script>.",
    input_schema: { type:"object", properties:{ html:{ type:"string", … } }, required:["html"] } },
  { name: "edit_region", … },   // surgical node replace
  { name: "set_style", … },     // inject <style>
  { name: "set_media", … },     // set img src/bg
  { name: "resolve_card", … },
  { name: "generate_hero_image", … },
  { name: "publish", … },
];
```
There is NO `set_concept`/`set_theme`/`upsert_section` in this file.

**Document type = schema_version 2 dual rep — `clean-slate:packages/core/src/document/contract.ts`:**
```ts
export interface Presentation { html: string; html_hash: string; runtime_version: string; authored_at: ISODate; }
export interface PeekDocument { schema_version: 2; spine: PeekIR; presentation: Presentation | null; }
```
(and `schema.ts`: `PeekDocumentSchema = z.object({ schema_version: z.literal(2), spine: PeekIRSchema, presentation: PresentationSchema.nullable() })`).

**Spine is DERIVED from the authored HTML — `clean-slate:apps/web/lib/curator/draft.ts`:**
```ts
const { cards, variant_groups } = extractSpine(args.html);   // parse the HTML's data-peek-* tags
return { schema_version: 2,
  spine: { ...base.spine, …, cards, variant_groups },
  presentation: { html: args.html, html_hash: htmlHash(args.html), runtime_version: PEEK_RUNTIME_VERSION, authored_at: now } };
```
`extractSpine` (`clean-slate:apps/web/lib/curator/extract.ts`) walks `[data-peek-card],[data-card]`, reads `data-peek-id/data-kind/data-price/data-group/data-rule/data-unlock`, and reconstructs the `Card[]` + `VariantGroup[]` spine from the markup.

**System prompt states Shape C explicitly — `clean-slate:apps/web/lib/curator/system-prompt.ts`:**
> "You author the page as a **real document** — full markup … You do **not** write the behavior: you *tag* every interactive/claimable thing with the host's small data contract … and a fixed host runtime turns your tags into real selection, the tab, locks, the sheet, and checkout."
> "**set_page(html)** — author the WHOLE page as one freeform HTML document".

**Inline comment confirms "No IR" on the freeform path — `in-site-chat-buildout:apps/web/lib/curator/turn.ts`:**
> "No IR, no renderer — the caliber lives in the model's markup; the host owns only behavior." / "Page ops are relayed (not applied server-side) — the iframe is the rendered source of truth".

**Contrast — the OLD structured-IR model is what `gallant-planck` ships.** `gallant-planck:apps/web/lib/curator/tools.ts` (header comment): "input schemas are GENERATED from core's command Inputs (z.toJSONSchema), so they can never drift from what decide() will accept", with `DESCRIPTIONS = { set_concept:…, set_theme:…, upsert_section:…, remove_section, reorder_sections, set_note, … }`. There is NO `set_page` on gallant-planck's apps/web. (Both gallant-planck and in-site-chat ALSO carry an even-older top-level `lib/peek-chat/tools.ts` / `lib/peek-tools.ts` IR toolset, but those are not deployed.)

**Which tools on which branch (deployed `apps/web`):**
| Branch | Authoring tools | Model representation |
|---|---|---|
| clean-slate | `set_page`, `edit_region`, `set_style`, `set_media`, `resolve_card`, `generate_hero_image`, `publish` | freeform HTML + derived spine (Shape C) |
| in-site-chat-buildout | same as clean-slate (identical to studio-vnext) | freeform HTML + derived spine |
| studio-vnext | same as clean-slate | freeform HTML + derived spine |
| gallant-planck-pu51x | `set_concept`, `set_theme`, `upsert_section`, `remove_section`, `reorder_sections`, `set_note`, `add_card`/`update_card`, `add_variant_group`, `generate_hero_image`, `set_hero_image`, `resolve_card`, `mark_ready` | structured IR via `decide()` |

---

## ITEM 2 — DEFAULT_MODEL the curator turn actually uses

### VERDICT: VERIFIED-TRUE — Opus 4.8 (`claude-opus-4-8`), not Sonnet 4.6.

`clean-slate:apps/web/lib/curator/turn.ts`:
```ts
const MODEL = "claude-opus-4-8";
```
Identical on `in-site-chat-buildout:apps/web/lib/curator/turn.ts:21`, `studio-vnext:apps/web/lib/curator/turn.ts:21`, and `gallant-planck-pu51x:apps/web/lib/curator/turn.ts:28`. Used directly in `client.messages.stream({ model: MODEL, max_tokens: 32000, thinking: { type: "adaptive" }, … })` and in the safeword report.

There is no separate `DEFAULT_MODEL` constant on the freeform `apps/web`; `MODEL` is the only authoring-model string. The legacy top-level `lib/` on the non-clean-slate branches has stale strings (`lib/anthropic.ts: PEEK_MODEL = 'claude-sonnet-4-6'` for the dead v0 `/api/chat`; `lib/adapters/anthropic.ts: PEEK_STUDIO_MODEL = 'claude-opus-4-8'`) — but those are not the deployed curator turn.

**COGS note (from claude-api skill, cached pricing):** `claude-opus-4-8` = Opus 4.8, $5.00 input / $25.00 output per 1M. `claude-sonnet-4-6` = Sonnet 4.6, $3.00 / $15.00. The live curator runs the more expensive model at `max_tokens: 32000` with adaptive thinking and a prompt-cached system+tools prefix. No cheaper model is wired behind the authoring call on the freeform line (a cheap-model port is only an aspiration in the RECON docs, not in the code).

---

## ITEM 3 — Server-side caps + variant rules in the pick route

### VERDICT: variant/lock/taunt rules = ENFORCED SERVER-SIDE (VERIFIED-TRUE). Hard/soft $ caps = NOT enforced. "Code says: the picks engine supports caps, but the route never passes a `caps` argument, so the cap branches never run." Caps are at best client-side only.

**The route — `clean-slate:apps/web/app/api/pick/route.ts`** (gallant-planck's is identical in the load-bearing line):
```ts
import { decidePick } from "@peek/core";
…
const current = await loadPicks(doc.peek.id);
const r = decidePick(doc, current, { type: "toggle", cardId: body.cardId });   // <-- NO caps arg
if (r.isErr()) return Response.json({ error: r.error.message, code: r.error.code }, { status: 409 });
const saved = await savePicks(doc.peek.id, r.value.picks);
…
return Response.json({ picks: r.value.picks, committedCents: r.value.committedCents, overSoftCap: r.value.overSoftCap });
```
The inline comment claims the value: "The selection engine (the SAME pure function the client runs) validates against the creator's rules server-side". True for rules; the route returns `overSoftCap` but it is always `false` because `caps` is undefined.

**The engine — `clean-slate:packages/core/src/picks/engine.ts`** — proves caps are gated behind the optional `caps` param:
```ts
export function decidePick(doc, current, action, caps?: Caps): Result<PickResult, CoreError> {
  const card = doc.cards.find(c => c.id === action.cardId);
  if (!card) return err(coreError("NOT_FOUND", …));
  if (card.is_taunt)  return err(coreError("FORBIDDEN", "a taunt card can't be picked"));   // rule enforced
  if (card.is_locked) return err(coreError("FORBIDDEN", `card ${action.cardId} is locked`)); // rule enforced
  …
  if (vg.selection === "pick_one") { for (id of group) picked.delete(id); if (!wasPicked) picked.add(card.id); }   // variant rule enforced
  …
  if (caps?.hardCents != null && committedCents > caps.hardCents)            // DEAD: caps is undefined from the route
      return err(coreError("INVARIANT", `over the hard cap …`));
  const overSoftCap = caps?.softCents != null && committedCents > caps.softCents;   // always false from the route
  return ok({ picks: [...picked].sort(), committedCents, overSoftCap });
}
```
So: server-side enforcement of variant selection (pick_one/pick_all/pick_any), locked, taunt — **YES**. Server-side budget cap enforcement — **NO**, because the route does not derive `Caps` (e.g. from `data-budget`) and does not pass it. `committedCents` is computed server-side but never compared to any cap server-side. This is a real gap if the build relies on the tab/budget being authoritative.

---

## ITEM 4 — THE GATE on clean-slate, and did the pivot keep/drop the maker-checker?

### VERDICT: `packages/core` event-sourced gate (decide/apply, neverthrow, `ports.ts`) EXISTS on `clean-slate` (the newest tip) — VERIFIED-TRUE; it is NOT only on gallant-planck. BUT the freeform pivot **DROPPED the maker-checker from the page-authoring path** — HTML from `set_page` is sanitized, never run through `decide()`. The gate is retained ONLY for picks (`decidePick`). On `gallant-planck`, by contrast, the authoring path routes every tool through `decide()`.

**Core exists on clean-slate — `git ls-tree -r origin/claude/clean-slate packages/core/src/`** includes `commands/{decide,apply,events,inputs,schema}.ts`, `event-sourcing.ts`, `ports/ports.ts`, `picks/engine.ts`, `result.ts`. (Also present on gallant-planck.)

**neverthrow — `clean-slate:packages/core/src/result.ts`:**
```ts
export { ok, err, Result, ResultAsync, okAsync, errAsync } from "neverthrow";
export type CoreErrorCode = "VALIDATION" | "INVARIANT" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT";
```

**decide → events, apply → state — `clean-slate:packages/core/src/commands/{decide,apply}.ts` + `event-sourcing.ts`:**
```ts
// decide.ts
export function buildEvents(doc: PeekIR, cmd: Command, ctx: DecideCtx): Result<PeekEvent[], CoreError> {
  case "set_concept": { … return ok([{ type: "concept_set", concept }]); }
  case "set_theme":   { … }
}
// apply.ts
export function apply(doc: PeekIR, event: PeekEvent): PeekIR {
  case "concept_set": return { ...doc, peek: { ...doc.peek, concept: event.concept } };
  case "card_added":  return { ...doc, cards: [...doc.cards, event.card] };  …
}
// event-sourcing.ts
export type Decider<Doc,Cmd,Ev,E> = (doc: Doc, command: Cmd) => Result<Ev[], E>;
export function fold<Doc,Ev>(initial, events, apply) { return events.reduce((doc,e)=>apply(doc,e), initial); }
```

**`ports.ts` exists on clean-slate — `clean-slate:packages/core/src/ports/ports.ts`:** defines `LLMPort`, `ProductSourcePort`, `ResearchPort`, `CardResolverPort`, `PortResult<T>` (`{ok:true}&T | {ok:false; error; retryable?}`).

**BUT the freeform write path bypasses the gate.** `clean-slate:apps/web/app/api/curator/route.ts` calls `runCuratorTurnStreaming` then:
```ts
const doc = buildDraftDocument({ peekId, curatorId, html: currentHtml, base });   // extractSpine + presentation
const saved = await savePeekDocument(doc);
```
No `decide`/`apply` anywhere in the curator write path. `git grep` over `clean-slate apps/web/` shows `decide` imported **only** in `app/api/pick/route.ts` (`decidePick`); `apply`/`fold`/`commandFromTool`/`execute` are not imported by the web app at all. The model's HTML is gated only by `sanitizeHtml(html, true)` in `turn.ts` (`case "set_page": emit({ type: "page", html: sanitizeHtml(html, true) })`).

**Proof the pivot dropped it — `gallant-planck:apps/web/lib/curator/turn.ts` (header + body):**
```ts
// Every tool_use is routed through the core gate — commandFromTool → execute(decide+apply)
// … The document the model sees only ever moves through decide().
import { execute, commandFromTool, defaultCtx, type PeekIR, type PeekEvent } from "@peek/core";
…
emit({ type: "page", doc, pinged });   // emits a structured IR doc, not HTML
```
So gallant-planck = maker-checker ON authoring; clean-slate/in-site-chat/studio-vnext = maker-checker dropped from authoring, retained only for picks. **Net: the build inherits a half-gated system — picks are command-gated; page content is sanitize-gated.**

---

## ITEM 5 — BUG STATUS spot-check (against code)

These bug IDs originate in `origin/audit/bugs-wave2:_packets/BUGS.md` and are written against the **`atelier`** codebase (`atelier/app/…`, `atelier/lib/security/…`), NOT the freeform `apps/web`. Verified each against the cited code.

### B15 — idempotency fails OPEN when Redis missing → VERIFIED-TRUE (on atelier)
BUGS.md B15: "`app/api/stripe/webhook/route.ts:55-62` + `lib/security/idempotency.ts:16` — Idempotency fails OPEN when Redis missing — `firstSeen: true` returned."
**`atelier-integration:atelier/lib/security/idempotency.ts`:**
```ts
const redis = getRedis();
if (!redis) return { firstSeen: true };          // FAIL-OPEN when Redis absent
…
try { const result = await redis.set(key, '1', { ex: ttl, nx: true }); return { firstSeen: result === 'OK' }; }
catch (err) { console.warn('[idempotency] redis threw, allowing event', …); return { firstSeen: true }; }   // FAIL-OPEN on throw
```
Webhook consumes it (`atelier/app/api/stripe/webhook/route.ts`): `const idemp = await checkIdempotency({ source:'stripe', eventId: event.id }); if (!idemp.firstSeen) return new Response('ok', {status:200});`. With no Upstash env, `firstSeen` is always true → no dedupe → Stripe retry storm reprocesses. Partial backstop exists only for the publish branches (`publishPeek` returns `'already'` when `peek.status === 'published'|'claimed'`), but analytics/`track()` and any non-publish event type still double-fire — exactly as the bug states. **Not present on the freeform line at all** — `clean-slate:apps/web/app/api/stripe/webhook/route.ts` has NO idempotency layer (relies solely on `markPeekPublished` being idempotent), so the freeform webhook is "idempotent-by-status-only," no Redis dependency to fail open.

### Anon `/build` 500 → VERIFIED-TRUE (on atelier); N/A on freeform line (no `/build` route)
`atelier-integration:atelier/app/build/page.tsx` (Server Component) — the anon branch:
```ts
const anonSessionId = await readAnonSessionId();
if (!anonSessionId) { log.error('anon_session_cookie_missing', { slug }); throw new Error('Anonymous session cookie missing — middleware did not mint one.'); }
const { data, error } = await sb.from('peeks').insert({ slug, curator_id: null, status:'draft', vibe: DEFAULT_VIBE, metadata: { anonymous_session_id: anonSessionId } }).select('id').single();
if (error || !data) { … throw new Error(`Failed to create anonymous draft peek: ${error?.message ?? 'unknown'}`); }
```
An anon visitor whose cookie wasn't minted by middleware (or whose insert fails) hits a thrown error → 500 (`atelier/app/build/error.tsx`). So the anon path CAN 500. NOTE: this **contradicts the stale `bugs-wave2 AUDIT.md` claim** "There is no anon-peek-creation path" — on atelier-integration HEAD there now IS one (`curator_id: null` + `anonymous_session_id`). On the **freeform line there is no `/build` route at all** — `clean-slate:apps/web/app/api/` = `curator`, `pick`, `publish`, `stripe/webhook`, `upload` only. So this bug does not exist on the freeform deployed surface.

### fal `generate_hero_image` returning null → code says: FIXED on the freeform line (no null, defensive fallback)
`clean-slate:apps/web/lib/ports/image.ts` (`generateHero`) never returns null:
```ts
if (!key) return { ok:false, error:"image generation not configured" };
if (!res.ok) return { ok:false, error:`fal ${res.status}` };
const falUrl = body.images?.[0]?.url;
if (!falUrl) return { ok:false, error:"fal returned no image" };
…
return { ok:true, url: falUrl, provider:"fal" };
```
And `turn.ts` handles a failed gen without crashing: `if (gen.ok && gen.url) { ok({url}) } else { fail("image generation failed (…). leave a treated slot + caption instead.") }`. The model is told to leave a treated slot — the documented degradation, not a null crash. (The original null-return bug belonged to the atelier-era `lib/anthropic/tools/generate_hero_image.ts`.)

### CSS-URL escape present → VERIFIED-TRUE on the freeform line (with a scope caveat)
`clean-slate:apps/web/lib/sanitize.ts` — `sanitizeCssText` runs on both `<style>` text (via `uponSanitizeElement` hook) and inline `style` attrs (via `afterSanitizeAttributes`):
```ts
function sanitizeCssText(css: string): string {
  return css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\(/gi, "/*x*/(")
    .replace(/(?:behavior|-moz-binding)\s*:[^;}]*/gi, "")
    .replace(/url\(\s*(['"]?)\s*javascript:[^)]*\)/gi, "url()");   // CSS url() js-scheme neutralized
}
```
DOMPurify config also forbids `script/iframe/object/embed/form/input/textarea/select/base/noscript` and `http-equiv`, and forces `rel="noopener noreferrer"` on `target="_blank"`. **Caveat:** the CSS-URL escape only neutralizes the `javascript:` scheme inside `url(...)`; it does NOT strip remote `url(https://…)` (so CSS-based remote fetch / data exfil via background-image is still possible). If "CSS-URL escape present" meant js-scheme neutralization → present; if it meant full url() lockdown → only partial.

---

## Cross-checks performed
- `gallant-planck-pu51x` + `atelier-integration` cross-checked as instructed: gallant-planck = the structured-IR / decide-gated authoring predecessor; atelier = the bug-catalogue codebase. Both confirm the freeform line is a distinct, later architecture.
- `in-site-chat-buildout` vs `studio-vnext`: byte-identical `apps/web` (empty `git diff --stat`).
- `clean-slate`: verified it has NO top-level `app/`/`lib/` (true "clean slate" monorepo), making it the cleanest tip for the freeform model.
