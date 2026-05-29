# BLAST-PHASE PRIORITIES — captured from spine-thread + concierge returns

_Living doc. Updated as lieutenant returns land. Source of truth for the order in which the orchestrator fires lieutenant briefs once Frank's back._

## Status snapshot (auto-updated)

**Merged on bold-ride:** slug renderer (the moat) · spine-thread (`/spine/*` namespace, edge chat, publish, recipient) · concierge SETUP-STATUS ledger.

**In-flight (Hercules's research subs, results inform briefs):**
- Curator-Sonnet operating prompt (research → brief 05)
- Depth-layer mobile UX (research → brief 06)
- Cinematic reveal (research → brief 09)
- Landing page (research → brief 10)
- Curator-Sonnet mutation tools spec (research → brief 04)
- Grammar preset library (research → brief 07)

**Already written, fire-when-ready:**
- BRIEF 03: Edge plumbing slice (`lib/anthropic-edge` + `lib/db-edge`)

## Ordering rationale (read before queuing)

Three tiers. Each tier's labors are mostly parallel within; cross-tier order matters.

### Tier 1 — foundation (the spine's foundation; everything else depends)

| # | Brief | Depends on | Why first |
|---|---|---|---|
| 03 | Edge plumbing slice | spine-thread (merged) | Every future edge route reuses this; refactoring the spine route validates the slice |
| 04 | Curator-Sonnet mutation tools spec | research sub | Defines the tool-call API surface the AI uses — drives both prompt design (05) and feature scope of every later production tool |
| 05 | Curator-Sonnet operating prompt | research sub + 04 | Closes the "what does Peek actually say" question. Once locked, every chat-loop labor inherits it |

### Tier 2 — production cutover (the spine's promotion)

| # | Brief | Depends on | Why now |
|---|---|---|---|
| 06 | Depth-layer mobile chat UI | research sub | Productionizes the K↔L mockup. Replaces the spine's basic `spine-builder.tsx` |
| 11 | Auth bolt-on (Clerk headless + custom UI) | tier-1 done | Real `curator_id`, removes the spine's `curator_id = null` hack |
| 12 | Checkout bolt-on (Stripe Payment Element custom UI) | 11 + tier-1 done | Real publish flow. Reference (not port) legacy peek.gift. |
| 13 | Canonical cutover (raze legacy `/build` `/g/[slug]` `/api/chat` + Tailwind components, move spine to canonical paths) | 06 + 11 + 12 | The big raze. Mechanical but touches everything once. Single big lieutenant. |

### Tier 3 — features (parallel; pick by what moves the conversion needle most)

| # | Brief | Depends on | Notes |
|---|---|---|---|
| 07 | Grammar preset library (occasions × vibes) | research sub | Frank's taste calibration tunes this. |
| 09 | Cinematic reveal | research sub + 06 | The recipient's emotional peak. |
| 10 | Landing page | research sub | High-leverage for conversions. |
| 14 | Image gen (FAL) wired into `set_hero` + `add_card` | 03 + FAL key in env | Concierge tracks FAL key. |
| 15 | Scrape wired into `add_card` (URL → product) | 03 | Reuses existing `lib/scrape/*` patterns. |
| 16 | Meter implementation (extends `lib/usage`) | spec exists | All valves WIDE OPEN at launch; data-driven throttle. |
| 17 | Product graph v1 (ingest opportunistically) | 15 + spec exists | Schema first, fill from scrapes. |
| 18 | Diff-not-full-state SSE | 03 + 06 | Optimization; spine sends full state per turn. |
| 19 | Persist per-turn message history + SSE keep-alive | 03 | For dropped-client resume. |

## Permanent traps (don't relearn — from spine-thread RETURN.md + bake-off)

1. **Node `lib/anthropic` + `lib/db` + `lib/env` are NOT edge-safe.** Use `lib/anthropic-edge` + `lib/db-edge` (brief 03) in any `runtime = 'edge'` route.
2. **Server Components can't write cookies in Next 16.** Cookie minting lives in `atelier/proxy.ts` middleware. (`/spine` sidesteps; `/g/[slug]` recipient-pick flow will hit it.)
3. **`noPropertyAccessFromIndexSignature` strict-mode flag** — `process.env['X']` not `process.env.X`. Same for `styles.foo` on a `Record<string, …>` (use `satisfies Record<…>`).
4. **Renderer reads only `var(--…)`; never literal colors.** ESLint rule enforces. Don't disable.
5. **Tool-result payloads ≤200 items / ≤24KB** — for edge 50ms-CPU/burst. Paginate catalog/scrape.
6. **Clerk middleware default-protects every route.** New public routes need an entry in `proxy.ts`'s `isPublicRoute`.
7. **The renderer is mount-agnostic — one-renderer invariant holds.** Don't fork it for any new surface (build preview, recipient, OG fallback). OG image-as-data only shares the validated `Vibe` + resolved hex (Satori limit).
8. **Worktree branches are transient.** Only `claude/bold-ride-Li5zK` and `lt/*` pushed branches are durable.
9. **Sub-agents need `isolation: "worktree"`** or they can drag the orchestrator's branch with them.
10. **Don't trust agent reports without verifying** — `npm typecheck && npm test && npm build` on main before merging.
11. **Legacy peek.gift checkout = info-source, NOT code-port** (Frank's call).

## Promotion path (when canonical cutover hits)

Surface the spine surfaces map onto:
- `/spine/page.tsx` → `/build/page.tsx`
- `/spine/[peekId]/page.tsx` → `/build/[peekId]/page.tsx`
- `/spine/g/[slug]/page.tsx` → `/g/[slug]/page.tsx`
- `/api/spine/chat/route.ts` → `/api/chat/route.ts` (raze the legacy Tailwind-era one)
- `/api/spine/publish/route.ts` → `/api/publish/route.ts` (or merge with existing if compatible)

The legacy components in `atelier/components/build/*`, `atelier/components/recipient/*`, and the Tailwind-coupled `globals.css` get razed in brief 13.
