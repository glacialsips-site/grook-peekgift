# BRIEF 15 — Scrape wired into `add_card` (URL → product)

**Source of need:** the curator-tools spec D2 `add_card` accepts `source_url`. The handler should scrape title/image/price/retailer when URL provided. The existing `atelier/lib/scrape/` has a 4-provider fallback chain (browserbase → zenrows → jina → anthropic_fetch → degraded) per the salvage audit — solid plumbing; just wire it.

**Pre-reqs:**
- BRIEF 04 (mutation tools) merged.

**Read first:**
1. `atelier/lib/scrape/pipeline.ts` — the 4-provider chain (it has internal 45s timeout).
2. `atelier/lib/scrape/extract.ts` — the JSON-LD preflight (saves ~5,500 tok/page; ~100% of test retailers).
3. `_packets/LIEUTENANT/_research/curator-tools/REPORT.md` D2 + §2 (Card model) + §7 (`scrape_failed` error code).
4. Existing `atelier/app/api/scrape/route.ts` — may have stale assumptions.

## DELIVERABLES

### 1. Scrape integration

In BRIEF 04's D2 `add_card` handler:
- If `source_url` provided AND `kind in ['retailer_product', 'retailer_service']`:
  - Call `scrapeUrl(url)` (the existing 4-provider chain).
  - Fill `title`, `description`, `image_url`, `value_cents`, `source_retailer`, `affiliate_url` (if affiliate-wrapping is in scope per BRIEF 16 product graph), `scrape_provider`, `scrape_degraded`, `metadata.scrape_raw` (small subset for audit).
  - Curator-supplied values WIN over scraped (e.g. if curator typed title, don't overwrite).
- If scrape fully fails: surface `scrape_degraded: true`, card still inserted with curator-supplied fields per spec §1 D2. Peek surfaces gracefully ("couldn't pull the image from that site — screenshot or another link?").
- For BRIEF 04's D3 `add_card_variants`: parallel scrape ALL variants. `Promise.allSettled`; partials returned per spec §1 D3.

### 2. Affiliate wrapping

Out of scope for this brief (lives in BRIEF 17 product graph). Stub: if the retailer is in a known affiliate network (Skimlinks/Sovrn/Awin/Impact/Amazon Associates), set `affiliate_network` to the appropriate value but leave `affiliate_url` = null. BRIEF 17 fills in real wrapping.

### 3. Edge-runtime compatibility

The scrape chain may use Node-only HTTP/Puppeteer-like libs. If so:
- The scrape itself runs in a Node-runtime route `/api/scrape/url` (POST, takes URL, returns the normalized scrape result).
- The edge chat route's `add_card` handler `fetch`es this Node route internally. Edge can call edge or Node routes freely.
- This adds a network hop but keeps the chat loop edge-safe.
- Alternative if you can make scrape edge-safe (jina + fetch fallback only, no browserbase/zenrows for the edge fast path): do so.

### 4. Caching

URL → scrape result, 24h TTL in Upstash if keyed (per concierge SETUP-STATUS). Otherwise no cache; each call hits providers.

### 5. Tests

- `add_card` with URL produces a fully-populated card (mock the scrape pipeline).
- `add_card_variants` with 3 URLs runs scrapes in parallel and returns partials shape.
- Scrape degraded scenario: card still inserted, `scrape_degraded: true`, Peek sees error envelope.
- Curator-supplied title overrides scraped title.

## HARD RULES

- **Don't reinvent scrape.** The 4-provider chain is solid; wire it.
- **Curator wins over scraper** on field conflicts.
- **`scrape_degraded` is a hint, not an error.** Card inserts either way.
- **No SQL-injection-style metadata leakage.** Strip script tags, sanitize HTML from any scraped description.
- **Edge-safe path** for chat loop (route through Node `/api/scrape/url` if needed).
- **Branch:** `lt/scrape-wired` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- typecheck/test/build green.
- If creds available: one live scrape against a public Shopify product page (e.g. birdies.com).
- Otherwise: structural tests + flag for Frank-verify.

## RETURN.md

Sections: how you integrated; edge-safety strategy (Node route or pure-edge); cache strategy; live scrape result (or deferred); any retailer-specific quirks discovered; bright ideas (JSON-LD preflight savings in production, expected token reduction). Honesty section.

Per PROTOCOL.md: push `lt/scrape-wired`, write RETURN.md.
