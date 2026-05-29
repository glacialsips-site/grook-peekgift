# RETURN 01 — the thin end-to-end spine thread

**Branch:** `lt/01-spine-thread` (off `claude/bold-ride-Li5zK`), pushed to origin.
**Status:** typecheck ✅ · test ✅ (212) · build ✅ · edge-runtime ✅ (manifest-verified). Live click-through ❌ (no creds in container — see Honesty).

---

## TL;DR for the orchestrator

The locked stack works end-to-end. I built a **self-contained spine under `/spine/*`** (NOT on the legacy `/build`, `/g/[slug]`, `/api/chat` paths) and proved: type → Edge SSE chat → tools mutate page-state in `peek_v2` → live preview re-renders via the grammar `SlugRenderer` → publish → `/spine/g/[slug]` SSR-renders the SAME renderer.

**Why namespaced and not on the canonical paths:** the brief says stub auth, skip checkout, *don't touch them*, and keep green. The legacy `/build` + `/g/[slug]` + `/api/chat` are the old Tailwind architecture entangled with Clerk/Stripe/recipient-cookies. Replacing them = ripping auth/checkout + breaking the 212-test build — out of scope for a FAFO thread. The spine proves the pattern in isolation; **promoting it to canonical paths (razing legacy) is a deliberate orchestrator step**, and this RETURN gives you the exact cutover surface.

---

## What I built (all real)

| Piece | File | Runtime |
|---|---|---|
| Edge chat route (SSE, tool loop) | `app/api/spine/chat/route.ts` | **edge** (Deno) |
| Publish action | `app/api/spine/publish/route.ts` | node |
| Build entry (creates draft, redirects) | `app/spine/page.tsx` | node RSC |
| Build surface (chat + live preview) | `app/spine/[peekId]/page.tsx` + `components/spine/spine-builder.tsx` | RSC → client island |
| Recipient SSR view | `app/spine/g/[slug]/page.tsx` | node RSC |
| Wire mappers (snake→camel) | `lib/spine/wire.ts` | pure |
| Derive → RenderablePage | `lib/spine/derive.ts` | pure |
| Types + SSE events | `lib/spine/types.ts` | pure |
| Clerk whitelist (+2 lines) | `proxy.ts` | — |
| Unit test (wire + derive seam) | `tests/unit/spine-derive.test.ts` | — |

**Tools (5, model-callable in the edge loop):** `set_hero`, `set_note`, `set_vibe`, `add_card`, `remove_card`. Each mutates `peek_v2` rows (peeks/cards) immediately (mutate-first), returns a tiny `tool_result`, then the loop re-fetches state and pushes a full `state` SSE event so the preview re-renders live. Reuses the existing schema (`peeks`/`cards`) and the merged `SlugRenderer` + grammar — no schema redesign, no renderer fork.

---

## Verification (run myself, real results)

- `npm --prefix atelier run typecheck` → **exit 0**
- `npm --prefix atelier run test` → **27 files, 212 tests pass** (209 baseline + 3 new spine tests)
- `APP_URL=… npm --prefix atelier run build` → **exit 0**, all 5 spine routes compiled
- Edge proof: `.next/server/middleware-manifest.json` → `functions` contains **`/api/spine/chat/route`** ⇒ it deploys as a Netlify **Edge Function**, not a Node lambda. `/api/spine/publish` is correctly Node. → the **26s Node wall does not apply** to the chat loop.

---

## Integration pitfalls (the point of this pass)

1. **The verified Node plumbing is NOT edge-safe — this is the big one.** `db/client.ts` uses the `postgres` TCP driver; `@/lib/anthropic` transitively imports it; `@/lib/env` and `@/lib/supabase/service` import `server-only` + do a heavy zod parse of `process.env`. None can be imported into an edge bundle. → The edge route uses **raw `fetch` to `api.anthropic.com/v1/messages`** (no SDK in the edge bundle) and an **inline `@supabase/supabase-js` REST client** reading `process.env['…']` directly. **Blast-phase implication:** you need an `lib/*-edge` slice (edge-safe anthropic loop + supabase-REST accessor) separate from the Node `lib/anthropic`/Drizzle stack. They cannot be one module.

2. **PostgREST returns snake_case; Drizzle `$inferSelect` is camelCase.** Anyone assuming `getSupabaseService().from('peeks').select()` returns Drizzle-shaped rows will be wrong — it returns `recipient_name`, not `recipientName`. → `lib/spine/wire.ts` owns the snake→camel mapping in one place. Plus the typed client carries a `peek_v2` schema generic that won't annotate against the default `'public'` `SupabaseClient` type → I let the inline edge client infer (untyped, returns `any`, no friction) and `as unknown as` cast at the typed Node call sites.

3. **`fromPeekData` wants full Drizzle `Card[]` (incl. `Date` fields) but the wire is JSON.** → `toCard()` adapter in `derive.ts` fills every required column with null/defaults, and `import type` for `Card`/`Peek` so no runtime `db/schema` import leaks into the client bundle.

4. **The renderer is genuinely mount-agnostic — the one-renderer invariant holds with zero forking.** `SlugRenderer` + `sections.tsx` + `lib/vibe/grammar/*` have no `server-only`/`node:` deps, so the *same* component renders client-side in the build preview (driven by React state) and server-side in `/spine/g/[slug]` (RSC). "Pure RSC" in the comments means "no client interactivity," not "server-only." Cost: deriving on the client ships the ~27KB grammar engine to the browser and runs `validatePageComposition` on every keystroke-driven state change (fine here; note it).

5. **Strict-mode flags bit twice:** `noPropertyAccessFromIndexSignature` forbids `styles.shell` on a `Record<string,…>` (→ `… satisfies Record<…>`) and forbids `process.env.X` (→ `process.env['X']`).

6. **Clerk middleware default-protects everything.** `proxy.ts` `auth.protect()`s all non-public routes — `/spine` + `/api/spine` 404/redirect for anon until whitelisted. Added 2 lines to `isPublicRoute`. Any new public surface must be added there.

7. **Header-flush / streaming timing.** Returning `new Response(stream, {headers})` flushes headers before model latency; the `ReadableStream.start()` runs the model fetch concurrently. I also enqueue an immediate `: spine open` SSE comment to force the first byte out before loading state / calling the model — matches the brief's "flush before first model call" + keep-alive intent.

8. **Cookie-in-middleware (Next 16) was avoidable here, but won't be in the blast.** Legacy `/build` + `/g/[slug]` mint anon/recipient cookies in `proxy.ts` because Server Components can't write cookies in Next 16. The spine needs no session, so it sidesteps this — but the real recipient *picks* flow will hit it again.

---

## Stubbed / skipped (per brief — stated plainly)

- **Auth:** `curator_id = null`, `metadata.spine = true`. No Clerk.
- **Checkout:** none. Publish is a status flip `draft → published`.
- **Catalog/scrape:** none. The model free-types cards via `add_card` (great for the empty→alive demo). No product graph, no scraper.
- **Images:** URL pass-through only (`set_hero.heroImageUrl`, `add_card.imageUrl`). No fal.ai gen wired (placeholders render via the renderer's `data-placeholder`).
- **Reveal animation / collab / variants / spend caps:** none.
- **Chat history:** NOT persisted. Each request is stateless; the **current page-state is injected into the system prompt every turn** so the model always sees what's on the page (it just doesn't see prior chat prose). Cheap and works for the thin path; the blast phase wants a messages table for resume.
- **tool_result pagination (≤200):** trivially satisfied — payloads are a handful of cards. Real catalog/scrape tools MUST paginate.

---

## Honesty: what I could NOT verify

No live click-through. This container has **no `ANTHROPIC_API_KEY` / Supabase creds** (only `.env.example`) and likely no egress, so I could not exercise the live SSE loop or a real DB round-trip. What's proven is structural: typecheck, 212 tests, build, and the edge-function manifest. **Highest-risk-untested-at-runtime:** (a) the upstream Anthropic SSE parser in `modelTurn` (content-block indexing + `input_json_delta` accumulation) — logic reviewed, not run against a real stream; (b) whether the non-public `SUPABASE_SERVICE_ROLE_KEY` is readable from Next's edge runtime on Netlify (it is on the platform, but verify on first deploy). **Recommended:** deploy the branch to the vnext sandbox (or run locally with creds) and do one click-through: `/spine` → type → watch preview → publish → open `/spine/g/[slug]`.

---

## Bright ideas for the blast phase

- **Carve `lib/anthropic-edge` + `lib/db-edge` (supabase-REST).** One verified edge slice every edge route shares; keep Node `lib/anthropic`/Drizzle for Node routes. This pitfall (#1) will recur on every edge function.
- **Push page-state *diffs* (changed ids), not full state.** `page-state.ts` already anticipates a `changed: Set<id>` commit shape — feed it to the renderer for surgical diff-mark instead of a full re-render per tool.
- **Persist per-turn history + SSE keep-alive ping (~15s)** for true dropped-client resume (the lock-time guardrail #3 resume goal).
- **Promotion path:** when ready, raze legacy `/build` + `/g/[slug]` + `/api/chat` (+ their Tailwind component trees) and move the spine onto the canonical paths. The spine is the reference implementation; the cutover is mechanical but touches auth/checkout, so it's an orchestrator call.
- The model free-typing cards with no catalog is a surprisingly good empty-state demo — wire scrape/product-graph *behind* `add_card` later, with pagination.

---

_Do NOT merge to bold-ride — orchestrator reviews and merges._
