# BLAST-PHASE PRIORITIES — captured from spine-thread + concierge + research subs

_Living doc. Updated as lieutenant returns land. Source of truth for the order in which the orchestrator fires lieutenant briefs once Frank's back._

## Status snapshot

**Merged on bold-ride:**
- Slug renderer (the moat)
- Spine-thread (`/spine/*` namespace — edge chat + 5 tools + publish + recipient view; 212 tests green)
- Concierge SETUP-STATUS ledger (live + leak event logged)
- All 6 research sub REPORTs

**Research REPORTs in `_packets/LIEUTENANT/_research/`** (all 6 returned):
- ✅ curator-prompt — BASE_PROMPT proposal (~485 words), 12-tool surface, eval set
- ✅ curator-tools — 22 canonical tools, card model, mutation log shape, error contract
- ✅ depth-layer-ux — production K↔L UX (gestures, haptics, diff-mark vocab, iOS 26 visualViewport bug warning)
- ✅ landing — chat-as-hero (Concept A), peek wall proof, guest CTA path
- ✅ cinematic-reveal — rebase existing impl onto `--vibe-` (NOT a full rebuild)
- ✅ grammar-presets — 40 vibes, 22 occasions, ranked map, remix engine (+ `presets.ts` 1285-line draft on disk)

**15 briefs WRITTEN, fire-when-ready** (in `_packets/LIEUTENANT/NN-<slug>/BRIEF.md`):
- BRIEF 03: Edge plumbing slice (`lib/anthropic-edge` + `lib/db-edge`)
- BRIEF 04: Mutation tools (22 tools, dispatch wrapper, schema adds)
- BRIEF 05: Curator-Sonnet operating prompt + skills + safeword
- BRIEF 06: Depth-layer mobile chat UI
- BRIEF 07: Grammar preset library integration
- BRIEF 08: Mutation log schema
- BRIEF 09: Cinematic reveal rebase
- BRIEF 10: Landing page
- BRIEF 11: Auth bolt-on (Clerk headless + custom UI)
- BRIEF 12: Checkout bolt-on (Stripe Payment Element)
- BRIEF 13: Canonical cutover (raze legacy, promote spine)
- BRIEF 14: Image gen wired (FAL)
- BRIEF 15: Scrape wired into add_card
- BRIEF 16: Meter implementation
- BRIEF 17: Product graph v1

## Ordering rationale (fire by tier; within tier = parallel)

### Tier 1 — foundation (4 in parallel — INDEPENDENT file scope, coordinate per brief)

| # | Brief | Why first |
|---|---|---|
| 03 | Edge plumbing slice | Every future edge route reuses; refactoring spine route validates |
| 04 | Mutation tools | API surface every later labor depends on |
| 08 | Mutation log schema | BRIEF 04 + BRIEF 06 both need it |
| 07 | Grammar presets integration | BRIEF 04 B1 + BRIEF 05 both need `pickPreset` |

### Tier 2 — prompt + UI (3 in parallel, fire after tier 1 lands)

| # | Brief | Depends on |
|---|---|---|
| 05 | Curator-Sonnet operating prompt | 04, 07 |
| 06 | Depth-layer mobile chat UI | 04, 08 |
| 09 | Cinematic reveal | grammar (reads `--vibe-*`) |

### Tier 3 — bolt-ons + features (parallel after tier 2 lands)

| # | Brief | Depends on |
|---|---|---|
| 11 | Auth bolt-on | tier-1 |
| 12 | Checkout bolt-on | tier-1 + 11 |
| 14 | Image gen wired | 03 + 04 + FAL key |
| 15 | Scrape wired | 03 + 04 |
| 16 | Meter implementation | spec (no upstream code-deps) |
| 17 | Product graph v1 | 15 |
| 10 | Landing page | tier-1 + 09 |

### Tier 4 — promotion + optimizations

| # | Brief | Depends on |
|---|---|---|
| 13 | Canonical cutover (raze legacy, promote spine) | tiers 1-3 complete |
| 18 | Diff-not-full-state SSE | 06 + 08 (brief not yet drafted) |
| 19 | Persist per-turn history + SSE keep-alive | 03 (brief not yet drafted) |

## Permanent traps (don't relearn — from spine-thread RETURN.md + bake-off)

1. **Node `lib/anthropic` + `lib/db` + `lib/env` are NOT edge-safe.** Use `lib/anthropic-edge` + `lib/db-edge` (brief 03) in any `runtime = 'edge'` route.
2. **Server Components can't write cookies in Next 16.** Cookie minting lives in `atelier/proxy.ts` middleware.
3. **`noPropertyAccessFromIndexSignature` strict-mode flag** — `process.env['X']` not `process.env.X`. Same for `styles.foo` on a `Record<string, …>` (use `satisfies Record<…>`).
4. **Renderer reads only `var(--…)`; never literal colors.** ESLint rule enforces. Don't disable.
5. **Tool-result payloads ≤200 items / ≤24KB** — for edge 50ms-CPU/burst. Paginate catalog/scrape.
6. **Clerk middleware default-protects every route.** New public routes need an entry in `proxy.ts`'s `isPublicRoute`.
7. **The renderer is mount-agnostic — one-renderer invariant holds.** Don't fork it for any new surface (build preview, recipient, OG fallback). OG image-as-data only shares the validated `Vibe` + resolved hex (Satori limit).
8. **Worktree branches are transient.** Only `claude/bold-ride-Li5zK` and `lt/*` pushed branches are durable.
9. **Sub-agents need `isolation: "worktree"`** or they can drag the orchestrator's branch with them.
10. **Don't trust agent reports without verifying** — `npm typecheck && npm test && npm build` on main before merging.
11. **Legacy peek.gift checkout = info-source, NOT code-port** (Frank's call).
12. **Don't echo secret values in any form** — not whole, not split, not reassembled in reasoning. (FAL leak this session via mid-output reassembly.)

## Promotion path (BRIEF 13 — when canonical cutover hits)

Surface map:
- `/spine/page.tsx` → `/build/page.tsx`
- `/spine/[peekId]/page.tsx` → `/build/[peekId]/page.tsx`
- `/spine/g/[slug]/page.tsx` → `/g/[slug]/page.tsx`
- `/api/spine/chat/route.ts` → `/api/chat/route.ts` (raze the Tailwind-era legacy)
- `/api/spine/publish/route.ts` → folded into BRIEF 12's `/api/checkout/intent` flow

Legacy components in `atelier/components/build/*`, `atelier/components/recipient/*` Tailwind, `atelier/components/landing/*` Tailwind, and the Tailwind-coupled `globals.css` get razed in brief 13.

## One-liner template for Frank to fire a lieutenant

```
On branch claude/bold-ride-Li5zK, read _packets/LIEUTENANT/PROTOCOL.md
then _packets/LIEUTENANT/<NN-slug>/BRIEF.md and execute fully. Spawn your
own subs. Report per the protocol.
```

If the web Claude Code session can't pick `claude/bold-ride-Li5zK` from
the branch dropdown, base on `atelier-integration` and have the agent's
first command be `git fetch origin && git checkout claude/bold-ride-Li5zK`.
