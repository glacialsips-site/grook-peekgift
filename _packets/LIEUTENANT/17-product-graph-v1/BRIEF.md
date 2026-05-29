# BRIEF 17 — Product graph v1 (opportunistic ingest from scrapes)

**Source of need:** the catalog moat. Spec landed as a research sub: own a normalized product graph (`pg_products`, `pg_offers`, pgvector) instead of scraping per-URL ad-hoc. Spec preserved at `_packets/LIEUTENANT/_research/product-graph/` (may be churned; design preserved in this brief).

**Sequencing per the research:** the graph SCHEMA ships day one + fills opportunistically from real scrapes; bulk affiliate-feed ingest waits until we're live + approved (Rakuten first). This brief installs the schema + opportunistic write path. Bulk ingest is a future brief.

**Pre-reqs:** BRIEF 15 (scrape-wired) merged.

**Read first:**
1. `_packets/SPINE/STACK-LOCK.md` — catalog row.
2. The schema from the research:
   - `pg_products` — canonical product (text_embedding VECTOR(1536), clip_embedding VECTOR(512), HNSW indexes).
   - `pg_offers` — (product × retailer × variant) with price_cents, available, affiliate_url, commission_rate.
   - `pg_source_records` — raw JSONB snapshots for audit/re-processing.
   - `pg_er_log` — entity-resolution decisions with accepted + reviewed_by.
3. Entity resolution: GTIN/UPC exact match → embedding cosine ≥0.70 auto-accept / 0.45-0.70 review / <0.45 new canonical.

## DELIVERABLES

### 1. Schema

`atelier/db/migrations/0018_product_graph.sql` (or next available):
- All 4 tables above, in `peek_v2` schema.
- pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
- HNSW indexes on both embedding columns.
- Hybrid-search example query as a SQL comment.
- RLS: read-public on `pg_products` + `pg_offers` (the graph is shareable/cacheable); write service-role only.

### 2. Drizzle schema

`atelier/db/schema/product-graph.ts` matching the SQL.

### 3. Opportunistic write path

In BRIEF 15's scrape integration: after a successful scrape inside `add_card`:
- `atelier/lib/product-graph/upsert.ts` — `upsertFromScrape(scrapeResult)`:
  - Compute embeddings (text via OpenAI `text-embedding-3-small` — coordinate; or via Anthropic if they have an embedding model; otherwise stub the embedding write and add the entry without vector).
  - Try entity-resolution against existing `pg_products` (GTIN first; embedding second). If matched: insert `pg_offers` row only. If new: insert `pg_products` row + `pg_offers` row.
  - Log decision to `pg_er_log`.
  - Fire-and-forget; never block the user-facing tool response.

### 4. Read path

`atelier/lib/product-graph/search.ts`:
- `findSimilarProducts(queryText: string, opts?: { category?, maxPriceCents?, limit? })` — hybrid search: structured WHERE + vector ORDER BY. Returns canonical products with cheapest-available offer joined.
- `findByImage(imageBase64)` — CLIP query (stub initially; flag as needs CLIP encoder; route through a dedicated `/api/cli-encode` Node route when CLIP wired).

### 5. Card integration

When the chat surfaces "similar products" later (a future curator-tools enhancement), it reads from `pg_products` via `findSimilarProducts` and proposes cards.

### 6. Tests

- Schema migration applies cleanly; pgvector extension loaded.
- `upsertFromScrape` with two scrapes of the same product (GTIN match) yields one `pg_products` row + two `pg_offers` rows.
- Different products (no GTIN, low embedding similarity) yield two separate canonical products.
- Hybrid-search query returns sensible results on fixture data.

## HARD RULES

- **Conservative entity resolution.** False-merge is catastrophic ("cheapest at Nordstrom" wrong product). Threshold ≥0.70 for auto-accept.
- **Don't block user tool calls on graph writes.** Fire-and-forget.
- **Affiliate wrapping NOT in this brief.** That's when affiliate networks come online (concierge tracks; affiliate apps need live + trafficked site to approve).
- **Embedding compute can be deferred.** If no OpenAI/embedding key in env, write text-search-only rows and flag for batch backfill later.
- **Branch:** `lt/product-graph-v1` off `claude/bold-ride-Li5zK`. Push.

## VERIFICATION

- typecheck/test/build green.
- Migration applies.
- One live scrape (BRIEF 15 capability) writes to `pg_products` + `pg_offers`.

## RETURN.md

Sections: schema migration number; embedding model used (or stub-only flag); entity-resolution threshold settings; one live ingest result (or fixture-only flag); the hybrid-search query example with timings; bright ideas (e.g. when Rakuten approves, bulk-feed ingest brief). Honesty section.

Per PROTOCOL.md: push `lt/product-graph-v1`, write RETURN.md.
