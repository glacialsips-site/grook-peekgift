# BRIEF 13 — Canonical cutover (raze legacy paths, promote spine)

**Source of need:** the spine lives at `/spine/*` (and `/api/spine/*`) by design — to FAFO the new stack without breaking legacy. After BRIEFs 03–12 land, the spine has all the pieces (auth, checkout, mutation tools, depth-layer UI, presets, reveal, landing) and is ready to BE the canonical surface. This brief is the big mechanical raze + promotion.

**Pre-reqs (all must be merged before firing this brief):**
- BRIEFs 03 (edge plumbing), 04 (mutation tools), 05 (curator prompt), 06 (depth-layer UI), 09 (cinematic reveal), 11 (auth), 12 (checkout) merged.
- BRIEFs 07 (presets) and 10 (landing) recommended.
- If any pre-req is missing, ABORT and flag.

**Read first:**
1. `_packets/SPINE/STACK-LOCK.md` — the locked stack the spine implements.
2. `_packets/LIEUTENANT/01-spine-thread/RETURN.md` — the "Promotion path" section.
3. `atelier/app/spine/*` + `atelier/app/api/spine/*` + the existing legacy paths.

## DELIVERABLES

### 1. The raze

Delete from `atelier/`:
- `app/build/` (legacy Tailwind build surface) — REPLACED by promoted spine.
- `app/g/[slug]/` (legacy Tailwind recipient view) — REPLACED.
- `app/api/chat/route.ts` (legacy Node chat loop with the 26s `maxDuration=300` bug) — REPLACED.
- `app/api/publish/route.ts` (legacy publish — though already largely superseded by `app/api/spine/publish/`).
- `components/build/*` (Tailwind build surface) — UNLESS something is still consumed; verify with `grep -r "from '@/components/build/" atelier/app` after each file removal.
- `components/recipient/*` Tailwind components — UNLESS BRIEF 09 ported necessary helpers (e.g. `reveal/phases.ts`); keep what BRIEF 09 declared as kept.
- `components/landing/*` Tailwind landing — REPLACED by BRIEF 10's landing.
- `app/globals.css` — Tailwind directives go; replace with the new `--vibe-*` base + reset.
- `tailwind.config.ts`, `postcss.config.mjs` — remove Tailwind toolchain entirely.
- The Tailwind package + autoprefixer + postcss-tailwind from `package.json`.

For each deletion: verify with `npm run build` after each batch. If something else still imports it, leave a TODO comment + flag in RETURN.md.

### 2. The promote

Rename / move:
- `atelier/app/spine/page.tsx` → `atelier/app/build/page.tsx`.
- `atelier/app/spine/[peekId]/page.tsx` → `atelier/app/build/[peekId]/page.tsx`.
- `atelier/app/spine/g/[slug]/page.tsx` → `atelier/app/g/[slug]/page.tsx`.
- `atelier/app/api/spine/chat/route.ts` → `atelier/app/api/chat/route.ts`.
- `atelier/app/api/spine/publish/route.ts` → merge with `atelier/app/api/checkout/intent/route.ts` per BRIEF 12 (the publish action is now Stripe-backed).
- `atelier/components/spine/spine-builder.tsx` → REPLACED by BRIEF 06's depth-layer-builder (already there if BRIEF 06 merged). Delete the spine-builder.
- `atelier/lib/spine/*` → `atelier/lib/build/*` OR fold into more specific paths (`derive.ts` → `lib/page-state/derive.ts`; `wire.ts` → `lib/db-edge/wire.ts` per BRIEF 03).

### 3. Middleware

`atelier/proxy.ts`:
- Remove `/spine` + `/spine/*` from `isPublicRoute` if no longer routes.
- Add `/build/*` (which Clerk middleware protects after auth bolt-on).
- Verify `/g/*` and `/api/og/*` are public per BRIEF 11.

### 4. Internal references

Sweep:
- `grep -r 'spine' atelier/ _packets/SPINE/` — any prose references to the namespace? Update.
- Internal links between routes (`<Link href="/spine/...">` → `<Link href="/build/...">`).
- Server-side redirects (e.g. from `/`'s CTA → `/build`).

### 5. Tests

- Existing 212+ tests still pass (the spine renames track through).
- New end-to-end smoke test: sign-in → `/build` → chat-builds-page → publish (with test coupon) → `/g/<slug>` SSR-renders correctly.
- Lint: no Tailwind class names remaining anywhere (`grep -r 'className=".*[a-z-]*-[0-9]'` heuristic).

### 6. Deploy plan

NOT IN THIS BRIEF: deploy is the orchestrator's separate go-ahead. Lieutenant produces a verified branch only.

## HARD RULES

- **Mechanical, no creative changes.** Promotion only. Don't redesign anything en route.
- **Verify after every batch of deletions.** `npm run build` must stay green; if it breaks, back up + investigate.
- **Don't touch `atelier/lib/vibe/grammar/`, `atelier/components/renderer/`, `atelier/db/schema/`.** Those are sacred.
- **Don't deploy.** Push branch; orchestrator reviews + plans deploy.
- **Coordinate with concierge** — any new env vars introduced by sub-briefs must be flagged for concierge to wire on Netlify.
- **Branch:** `lt/canonical-cutover` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- `npm --prefix atelier run typecheck` — 0.
- `npm --prefix atelier run test` — all pass.
- `npm --prefix atelier run build` — clean; route manifest shows `/build`, `/g/[slug]`, `/api/chat` (edge), no `/spine/*` anywhere.
- Bundle inspection: no Tailwind utility classes in the output CSS; no `tailwindcss` in dep tree.

## RETURN.md

Sections: every file deleted; every rename; any TODO from places where a Tailwind import couldn't be cleanly removed (orchestrator decides); the route manifest before/after; integration pitfalls (especially Clerk middleware + the rename); a Frank-verifiable click-through. Honesty section.

Per PROTOCOL.md: push `lt/canonical-cutover`, write RETURN.md.
