# BRIEF 01 — the thin end-to-end spine thread (integration FAFO)

**Goal:** prove the locked stack works end-to-end with ONE peek — ugly but real — so we surface integration pitfalls BEFORE the big parallel build. This is the "fuck around and find out" pass on the *new* architecture. Pitfalls found here are the whole point; document them.

**You are NOT polishing.** Thinnest real path that touches every seam. Read `_packets/SPINE/STACK-LOCK.md` and reuse the already-built grammar renderer (`atelier/lib/vibe/grammar/` + `atelier/components/renderer/`) — it's merged, verified, 209 tests green. Don't rebuild it.

## BUILD (real)
1. **Edge chat route** (Netlify Edge function, Deno runtime): accepts curator text, calls `claude-sonnet-4-6` with a SMALL tool set, streams SSE back. Flush headers before the first model call; keep tool_results small.
2. **Page-state mutation tools** (3–5 structured tools the model calls): e.g. `set_hero`, `add_card`, `set_section`, `set_vibe` — each mutates the normalized page-state doc `{ vibe, order[], sections{ id } }` (shape already in `atelier/components/renderer/page-state.ts`).
3. **Persistence:** page-state → Supabase `peek_v2` via the existing Drizzle schema (`atelier/db/schema`). Reuse it; don't redesign the schema.
4. **/build page:** a text input + a LIVE preview that re-renders via the existing slug renderer as tools mutate state. (Skip the fancy depth-layer mobile chrome — that's a separate later labor. Just input + live preview.)
5. **Publish:** a route/action flipping the peek `draft → published`.
6. **Recipient view `/g/[slug]`:** SSR-renders the published peek through the SAME slug renderer (the one-renderer invariant — do not fork it).

## STUB / SKIP (do not build these)
- **Auth** — hardcode a fake curator session. No Clerk.
- **Checkout** — skip entirely.
- **Catalog/scrape** — hardcode 3–5 example items. Don't wire the product graph or scraper.
- **Images** — placeholders; if `FAL_KEY` is set in env, you may wire one real hero gen, otherwise placeholder.
- **Reveal animation, collab, variants, spend caps** — skip. Thinnest path only.

## ACCEPTANCE
- I can type to the stub chat, watch the page assemble live via the renderer, publish it, open `/g/[slug]`, and see the same page SSR-rendered.
- The Edge chat route holds the multi-iteration streaming loop without hitting the 26s wall (it's on Edge — verify it doesn't run as a standard Node function).
- `typecheck`, `test`, `build` all green (run them, report results).

## REPORT (`RETURN.md` in this dir)
What you built; verification results; **every integration pitfall** (Edge/Deno surprises, page-state↔DB friction, RSC/streaming seams, the renderer mounting in /build vs /g, anything that fought you); what you stubbed; and bright ideas for the blast phase.
