# SCRAPE-COMPARISON — legacy peek.gift vs vNext (atelier)

_Frank's claim: "the scraper and search are better than our current in there" — comparing legacy live peek.gift to the vNext atelier scraper._

---

## TL;DR

**The legacy Vite peek.gift codebase is NOT in this repo.** I cannot do a line-by-line code comparison. Frank needs to shuttle either the legacy repo URL (so I can clone it) or a zip into `_packets/_orch-desktop/legacy-snapshot/`. Without it, the comparison below relies on the orchestration documents (URL-AUDIT, STATE, BUGS, archived handoffs) plus a third Next.js prototype that DOES live at this repo's root (also called `peek-gift-vnext` — not the live Vite site, a separate scrap).

What IS in this repo:

1. **vNext (atelier) scraper at `atelier/lib/scrape/*`** — Browserbase → ZenRows → Jina → Anthropic web_fetch → degraded stub, with Anthropic-driven structured extraction in `extract.ts`. This is what Frank's call refers to as "our current."
2. **A separate root-level Next.js prototype at `app/`, `lib/`** — also named `peek-gift-vnext` in `package.json:2`, but clearly an earlier/sibling iteration. Its scrape is much thinner (direct fetch → ZenRows fallback → regex meta-parsing in `app/api/scrape/route.ts`). It does NOT use Browserbase, Jina, or Anthropic extraction. This is what `CLAUDE.md:25` calls "scrap/reference" — not the live legacy site.
3. **No legacy Vite source** anywhere in the repo tree.

The vNext (atelier) scraper is materially more sophisticated than the root prototype on every axis. So if Frank is comparing atelier to the root `app/` prototype, atelier wins. If he's comparing atelier to a separately deployed Vite codebase that lives on a different Netlify project, **I have no data on that codebase** and cannot validate his claim.

**Recommendation:** Frank shuttles the legacy Vite repo to me (URL clone or zip), then I write a proper port-list packet. See §7.

---

## 1. What IS in repo: the two scraper implementations side-by-side

### vNext atelier (`atelier/lib/scrape/*`) — the current build target

Pipeline orchestrator at `atelier/lib/scrape/pipeline.ts:150-214` cascades through four tiers, falling through on null:

1. **Browserbase** (`atelier/lib/scrape/browserbase.ts`) — `POST /v1/sessions` then `POST /v1/sessions/{id}/page` (BUGS M13: endpoint shape guessed, every call 404s, paying for unused sessions). Lines 71-159.
2. **ZenRows** (`atelier/lib/scrape/zenrows.ts:20-62`) — `GET api.zenrows.com/v1/?url=...&js_render=true`, returns raw HTML.
3. **Jina Reader** (`atelier/lib/scrape/jina.ts:29-73`) — `GET r.jina.ai/{url}` with `X-Return-Format: markdown`. Free, no key. Detects Cloudflare blocks and access-denied bodies (lines 19-27).
4. **Anthropic web_fetch** (`atelier/lib/scrape/anthropic-fetch.ts:80-124`) — Claude SDK with the `web_fetch_20250910` tool. The model fetches AND extracts in one call, returning JSON directly.

Each HTML-returning tier is then run through **Anthropic structured extraction** (`atelier/lib/scrape/extract.ts:105-131`) — Claude FAST_MODEL with a strict JSON-only system prompt, 30k char HTML budget, fence-tolerant JSON parser at lines 73-98. This is the load-bearing piece: a single LLM call turns blob HTML into `{title, description, imageUrl, valueCents, sourceRetailer}`.

Image post-processing at `atelier/lib/scrape/image.ts:57-67`:
- HEAD-validates the returned image URL (lines 8-36).
- Re-hosts to Supabase Storage via `lib/image-gen/rehost.ts` (lines 38-55) so the card image survives even if the retailer's CDN drops it or hot-linking gets blocked.

Each tier records vendor usage (`recordUsageFireAndForget` at `pipeline.ts:180-188`) for cost attribution.

The pipeline has a 45s top-level timeout (`PIPELINE_TIMEOUT_MS = 45_000` at line 13) and degrades gracefully to a domain-stub product (`degradedProduct` at lines 63-69) rather than returning a hard failure. The caller sees `degraded: true` and asks the curator for a screenshot.

Route `atelier/app/api/scrape/route.ts:96-179`:
- Origin allowlist + rate limiting (`limiters.scrapePerUser()` at line 106).
- Zod-validated body with `peekId` + `sessionId` (lines 19-25).
- **Cache lookup on `events` table** (lines 58-73, 136-142) — checks for a previous `scrape_complete` event with the same URL and returns the prior product, avoiding re-scraping the same URL.
- Always records a `scrape_complete` event (lines 81-94) for analytics + future cache hits.

The tool wrapper `atelier/lib/anthropic/tools/scrape_url.ts:45-142`:
- Pre-wraps the URL through `wrapAffiliateLink()` with peek-level customId (lines 47-50), inserts the card, then RE-wraps with `peekId:cardId` post-insert (lines 99-108). Tightly integrated with the affiliate revenue path.
- Fires PostHog `scrape_url_requested` and `scrape_complete` events (lines 52-58, 110-128).
- Async worker variant at `atelier/lib/jobs/scrape-worker.ts:8-43` runs the same pipeline through Inngest with 3 retries; updates a placeholder card row when the scrape lands.

### Root prototype (`app/api/scrape/route.ts`, `lib/peek-tools.ts`) — NOT the legacy live site

This is the other Next.js project at the repo root. Frank's `CLAUDE.md:25` says it stays as "scrap/reference." It is NOT the live Vite peek.gift.

Scraper at `app/api/scrape/route.ts:10-26`:

- Two-tier: direct `fetch()` with desktop UA (lines 36-52) → ZenRows fallback if HTML title empty (lines 54-66).
- No Browserbase. No Jina. No Anthropic extraction. No image rehost. No cache. No rate limit.
- Structured extraction is regex over the HTML — `pickMeta()` greps `<meta property="og:title">` etc. at lines 88-102, `pickTitle()` at lines 104-107.
- Price comes from `og:price:amount` (lines 73-77), not from any retailer-specific selectors. Misses anything outside OpenGraph.
- Returns `{title, description, image_url, price_cents, retailer}` (lines 28-34) — same shape as atelier's, fewer fields populated.

This prototype's tool layer (`lib/peek-tools.ts`) exposes a `scrape_url` tool at lines 146-154 that proxies to `/api/scrape`; nothing about affiliate wrapping or async workers.

There is **no search tool of any kind in the root prototype.** No `web_search`, no `place_search`, no `affiliate_search`. The 12-tool list at `lib/peek-tools.ts:11-161` is purely page-mutation: set_recipient, set_vibe, set_hero_image, generate_hero_image, set_note, add_card, add_variant_group, remove_card, reorder_cards, scrape_url, mark_ready_for_publish.

### Direct comparison table

| Concern | Root prototype `app/api/scrape/route.ts` | vNext `atelier/lib/scrape/*` |
|---|---|---|
| Tiers | 2 (fetch → ZenRows) | 4 (Browserbase → ZenRows → Jina → web_fetch) |
| Extraction | Regex on OpenGraph meta tags | Anthropic LLM, 30k HTML budget, JSON-only |
| Image validation | None | HEAD probe + Supabase rehost |
| Caching | None | `events` table lookup by URL |
| Rate limit | None | `limiters.scrapePerUser()` |
| Affiliate wrap | None | `wrapAffiliateLink()` pre + post insert |
| Async fallback | None | Inngest worker w/ 3 retries |
| Graceful degrade | Returns `ok:false, scrape_empty` | Returns domain-stub product, `degraded:true` |
| Cost attribution | None | `recordUsageFireAndForget` per tier |

On every axis, atelier is more capable than the root prototype. The root prototype is genuinely useful only for the meta-tag-only path (and even that is duplicated by atelier's Anthropic extract).

**If Frank is comparing atelier to the root prototype, the claim is wrong — atelier is strictly better.** If he's comparing to the live Vite peek.gift, that codebase isn't here and I can't validate.

---

## 2. What "search" means in the live peek.gift — speculation only

I have no source code to reference. The only signals in this repo:

- `_packets/SPINE/URL-AUDIT.md:291` confirms the legacy Vite app used `VITE_GOOGLE_PLACES_API_KEY` — i.e. **legacy has Google Places integration** for place/activity search. Atelier does not — there is no Google Places client in `atelier/lib/`.
- `_packets/SPINE/CAPABILITY_INVENTORY.md:21` references `affiliate_search`, `activity_search` (Viator/OpenTable/Ticketmaster/Booking/GetYourGuide) as future-tense tools to BUILD. None exist yet.
- `_packets/SPINE/TOOL_MANIFEST.md` describes the surface — `web_search` via Anthropic native (A9 capability), `affiliate_search` (proposed, §2 of `affiliate-strategy.md`), `place_search_v2` (Tier 0 expansion).
- The atelier tool registry at `atelier/lib/anthropic/tools/` ships 16 tools (listed in §1) — none of them are search of any kind. No `web_search`, no `place_search`, no `affiliate_search`.

So when Frank says "search is better in legacy," the plausible meanings are:

1. **Google Places product/activity search** — legacy Vite likely has a wired `place_search` tool that hits Google Places API directly. Curator says "wine tour in Sonoma" and the legacy app returns 3-5 hits w/ photos + addresses. Atelier has nothing here.
2. **Affiliate catalog search** (Skimlinks/Sovrn) — possible but unlikely given the affiliate-strategy.md treats this as future-tense, and the URL audit doesn't reference legacy keys for Skimlinks.
3. **Plain web search** (Anthropic native or third-party) — possible if legacy uses Claude's `web_search` tool or a SERP API. No signal in audit docs.

Best guess: **legacy "search" is Google Places** for activity/restaurant/venue cards, plus possibly direct retailer search for product cards. Atelier was supposed to consolidate this into `place_search_v2` (per `affiliate-strategy.md:40-44`) but the tool hasn't been built.

If Frank wanted atelier to match legacy's search capability today, the gap is concrete: **build `place_search` (Google Places wrapper) as a tool**. The Google Places key is already configured per URL-AUDIT — it's a 1-packet job.

---

## 3. Stack/services comparison

| Service | Root prototype | vNext atelier | Legacy Vite (inferred) |
|---|---|---|---|
| Fetch | `fetch()` direct | `fetch()` direct in jina/anthropic-fetch | Likely `fetch()` direct |
| Headless browser | — | Browserbase (broken M13) | Possibly Browserbase (key was cloned FROM legacy per `_packets/STATE.md:129`) |
| Anti-bot scrape | ZenRows | ZenRows | Possibly ZenRows (key cloned from legacy per `_packets/STATE.md:130`) |
| Markdown reader | — | Jina Reader (free) | Unknown |
| LLM extract | — | Anthropic FAST_MODEL JSON | Unknown, but legacy predates atelier's Anthropic-first approach |
| Place/activity search | — | — | Google Places API (`VITE_GOOGLE_PLACES_API_KEY` per URL-AUDIT:291) |
| Affiliate wrap | — | Skimlinks + Sovrn at `atelier/lib/affiliate/*` | Unknown |
| Image rehost | — | Supabase Storage via `lib/image-gen/rehost.ts` | Likely Supabase Storage (different bucket `gift-assets` per URL-AUDIT:153) |
| Cache | — | `events` table | Unknown |

The atelier stack is broader (4 tiers + image rehost + cache + rate limit + affiliate) but appears to be missing what legacy has on the **search** side (Google Places). Browserbase + ZenRows keys explicitly came from legacy per `STATE.md:129-130` — so legacy IS using at least ZenRows.

---

## 4. Specific files in legacy worth porting

**Cannot enumerate without legacy source.** Generic candidates the comparison suggests:

- Whatever module hits Google Places — likely `src/lib/places.ts` or `src/api/places.ts`. Port to `atelier/lib/search/google-places.ts` and wrap as a `place_search` tool.
- Any retailer-specific scrape adapters (Amazon, Etsy, Target product page selectors that beat generic OG parsing). Port to `atelier/lib/scrape/retailers/<retailer>.ts` and consult before the Anthropic extract tier.
- Any cached merchant catalog used to enrich product search results.

---

## 5. Patterns/features to reproduce in vNext

Inferred from Frank's claim "scraper is better in legacy":

1. **`place_search` tool wired to Google Places** — clear gap. Add to `atelier/lib/anthropic/tools/` and register in `bootstrap.ts`. The Anthropic toolspec is already drafted in `_packets/SPINE/skills/affiliate-strategy.md:40-44` as `place_search_v2`. Reuse the existing `GOOGLE_PLACES_API_KEY` server env (URL-AUDIT confirms it's set).
2. **Retailer-specific scrape adapters** — if legacy has them, they're cheap wins. Atelier currently leans 100% on the LLM to extract from generic HTML, which is robust but token-expensive. A short-circuit for common retailers (Amazon, Etsy, Target, Walmart, Anthropologie, etc.) using their well-known JSON-LD structured data (`<script type="application/ld+json">{"@type":"Product",...}`) would be cheaper + more reliable than the LLM path for ~80% of real product URLs. This is a generally-known pattern; even without legacy source, it's the obvious upgrade.
3. **JSON-LD `Product` schema parser** — Step 0 of the extract pipeline. If the HTML contains a parseable JSON-LD Product block, use it directly; skip the LLM. The current `atelier/lib/scrape/extract.ts` strips scripts at line 25 — which is exactly where JSON-LD lives. **This is a likely-broken behavior in atelier today.** See §6 below.
4. **Better image selectors** — generic OG image often misses the high-res product photo. Retailers expose better selectors (`<meta property="product:image">`, JSON-LD `image[]`, gallery selectors).

---

## 6. What we DON'T want to port from legacy

Without source I can only flag candidates by inference from architectural drift in `_packets/STATE.md`:

- **Supabase JWT-based API key path** (URL-AUDIT mentions legacy still uses these; vNext is on modern `sb_secret_*`). Don't port the auth model.
- **Vite-prefixed env vars** (`VITE_GOOGLE_PLACES_API_KEY` exposes the Places key in the client bundle per URL-AUDIT:291 — "the key is exfilable from the client bundle"). Atelier MUST keep the Places key server-side only.
- **Any `public` schema dependencies** — atelier is on `peek_v2` schema; legacy is on `public`. Per `CLAUDE.md:54-55`, they're isolated; don't bring `public` references over.
- **The root-prototype regex meta-parser** (`app/api/scrape/route.ts:88-115`) — atelier's LLM extract is strictly better. Don't regress.

---

## 7. Recommended dispatch

**Packet 42 is the right slot per `affiliate-strategy.md:324`** ("the `affiliate_search` tool itself is a new packet (likely Packet 42 per CAPABILITY_INVENTORY §K), not a bug fix").

I recommend splitting Frank's "port the better parts" into TWO packets, only one of which I can spec without the legacy source:

### Packet 42 (specifiable now) — `place_search` tool + JSON-LD extract preflight

Two slices, both self-contained, no legacy code required:

**Slice A — `place_search` tool (Google Places):**
- New file: `atelier/lib/search/google-places.ts` — Places API v1 wrapper, server-side, uses `process.env.GOOGLE_PLACES_API_KEY`.
- New file: `atelier/lib/anthropic/tools/place_search.ts` — registers as `place_search`. Input: `{query, location_hint?, max_results?}`. Output: 3-5 places with `{title, description, image_url, address, source_url, place_id}`.
- Register in `atelier/lib/anthropic/tools/bootstrap.ts`.
- Update curator system prompt to know about `place_search` for activity/restaurant/venue prompts.

**Slice B — JSON-LD Product preflight:**
- New file: `atelier/lib/scrape/jsonld.ts` — parse all `<script type="application/ld+json">` blocks from raw HTML, look for `@type: Product` (or `Product` inside `@graph`), return `ScrapedProduct` directly.
- In `atelier/lib/scrape/pipeline.ts` — before calling `extractProduct()`, run `parseJsonLdProduct(html)`. If found, skip the LLM call entirely.
- In `atelier/lib/scrape/extract.ts:25` — keep the script-strip for the LLM path, but do JSON-LD extraction BEFORE the strip.

Estimated 1 packet, 1-2 hours of worker time, no new vendors.

### Packet 43 (cannot spec yet) — port legacy retailer adapters + verify search parity

**Blocked on legacy source.** Frank shuttles the Vite repo into `_packets/_orch-desktop/legacy-snapshot/` (zip or git clone). Then I write:

- Per-retailer scrape adapter list (Amazon / Etsy / Target / Walmart / Wayfair / Anthropologie / Nordstrom / etc. — whatever legacy has).
- Port the actual `place_search` implementation from legacy if it has retailer-context awareness beyond raw Google Places.
- Validate Frank's "better" claim by diff'ing extracted fields against atelier's LLM path on a fixed corpus of test URLs.

Defer until Frank decides whether shuttling is worth the time vs just letting Packet 42-A get atelier to feature parity on search.

---

## 8. What I need from Frank to do this properly

One of:

- **Legacy repo URL** that I can `git clone` (if it's on github.com/glacialsips-site/... or wherever, and I have access via the github MCP).
- **A zip of the legacy `src/` tree** shuttled into `_packets/_orch-desktop/legacy-snapshot/`. I only need: anything matching `scrape`, `places`, `search`, `extract`, `product`, `affiliate`, `retailer`. Don't bother with auth/UI/styling code — irrelevant for this comparison.
- **Just the file paths** in legacy that he thinks are better, plus 200-line snippets of each. Cheapest for him, gives me what I need.

Until then, Packet 42-A (the `place_search` tool) is the obvious next move regardless — atelier has zero search capability today, and Google Places key is already configured.
