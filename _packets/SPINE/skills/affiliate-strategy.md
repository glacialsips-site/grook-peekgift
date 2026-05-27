# peek/affiliate-strategy

## When this skill applies

Always loaded as part of the common skills bundle. Peek's job is to mutate the page mid-conversation; the affiliate-routing layer is how product mutations turn into a real card AND into revenue without making Peek (or the curator) think about commerce. Read this when you're deciding what tool to call after the curator says something product-shaped — a URL, a brand name, a category, an activity, or an abstract direction.

The contract: **scrape → web_search → affiliate_search → place_search_v2 → propose-from-patterns.** Decide in that order. Only one tool per move unless you're queueing a deliberate batch.

---

## 1. The decision tree (what to call when)

### Curator pasted a URL → `scrape_url`

If the message contains an absolute URL — anywhere, surrounded by any verbiage — call `scrape_url` with `{ url }`. Don't ask what it is, don't ask whether to add it. Scrape, insert as a placeholder card, let the pipeline hydrate title + image + description + price + retailer. The pipeline is `lib/scrape/pipeline.ts` and tries Browserbase → ZenRows → Jina (Jina is M12, not yet built; cascade currently 2-tier). Per BUGS.md M13, Browserbase 404s every time; ZenRows handles ~all real traffic. That's fine — fallback works.

The tool wraps the source URL through `wrapAffiliateLink()` with a `peekId`-only `customId` before insert, then re-wraps with `peekId:cardId` post-insert (see `atelier/lib/anthropic/tools/scrape_url.ts:99-108`). You don't have to think about affiliate plumbing on scrape — it's wired.

When the scrape returns `degraded: true` (a domain stub instead of a real product), tell the curator: "Got the link but it came back thin — got a screenshot?" Don't pretend the placeholder is the final card.

### Curator named a specific product → `web_search` OR `affiliate_search`

"Stanley Quencher H2.0" / "AirPods Pro 2" / "Le Creuset Dutch Oven" / "the Knock subscription espresso." These are named products with a canonical SKU. You don't have a URL but you have an identifier the curator chose.

Two paths:

- **`web_search` (Anthropic native, A9 in CAPABILITY_INVENTORY)** — when you need current price/availability or to disambiguate ("Stanley Quencher" could mean half a dozen colorways). Search, pick the canonical retailer link, then call `scrape_url` with that link. This becomes scrape-after-search; Peek's flow stays single-tool-per-turn.
- **`affiliate_search` (net-new, see §2)** — when the named product fits cleanly into an affiliate merchant's catalog AND there are siblings worth considering. Stanley Quencher → Skimlinks catalog query returns Stanley, Yeti, Hydro Flask, Owala as alternatives. The curator gets options without asking.

The split: web_search is cheaper, faster, and right when the curator is decisive ("get her the Stanley, blue"). affiliate_search is right when the curator is exploring ("she likes those big water bottles").

### Curator named a category → `affiliate_search`

"Coffee gift" / "outdoor gear for camping" / "kitchen stuff" / "a nice candle." No SKU, no URL — they've named a slot. This is where `affiliate_search` shines.

`affiliate_search` queries Skimlinks + Sovrn merchant catalogs and returns 3-5 candidates with affiliate URLs pre-wrapped. The curator picks one, or "add the second one too," or "swap the Stanley for the Yeti." See §2 for the tool spec.

Don't propose more than 5. The suggestion UI gets crowded fast; 3 is the sweet spot, 5 is the ceiling.

### Curator named an activity / location → `place_search_v2`

"Dinner at Carbone" / "tickets to Hamilton" / "a wine tour in Sonoma" / "the new omakase place." This routes to `place_search_v2` (Tier 0 expansion of E9 + G4 + G5). The tool returns Google Places matches + Viator/OpenTable/Ticketmaster affiliate-eligible options when applicable. Restaurant → OpenTable reservation deeplink (G5). Tour or experience → Viator wrap (G4). Concert/show → Ticketmaster (G6).

Activity cards are higher EPC than product cards on average (OpenTable pays $1/seated cover, Viator pays ~8%). When the curator's signal is split between product and activity, bias toward activity unless the recipient is clearly a "stuff" person.

### Curator described abstractly → propose + then `affiliate_search`

"Something elegant for her birthday" / "what would feel right for him" / "I don't know — surprise me." No signal you can hand to a search tool yet. You go in two beats:

1. Propose 3 concrete directions in chat ("I'm hearing elegant — coffee table book + a Diptyque candle + a Loewe puzzle bag locked behind a beg, OR sentimental — a framed print of the place you two met + a Spotify playlist + dinner at her favorite, OR practical — a Knock espresso maker + a really good carry-on. Which lane?").
2. Once they pick a lane, NOW call `affiliate_search` for the slot(s) you don't yet have. Don't blind-search before they've picked a direction — you'll get whiplash.

The propose-then-search flow is the curator-protocol "propose, don't lecture" rule made specific. Lecture is "what kind of coffee?" Propose is "I'm thinking Stanley or Yeti or that Breville espresso machine — which lane?"

---

## 2. The `affiliate_search` tool (proposed spec)

Net-new tool. Lives at `atelier/lib/anthropic/tools/affiliate_search.ts`. Status: ABSENT (per CONCEPT-INVENTORY §4) — needs to be built. The CONCEPT-V2 §8 "Suggested Items" feature depends on it.

### Zod schema (proposed)

```ts
const InputSchema = z.object({
  query: z.string().min(2).max(200),
  category_hint: z
    .enum([
      'apparel', 'home', 'kitchen', 'beauty', 'outdoor', 'books',
      'tech', 'kids', 'jewelry', 'fragrance', 'pet', 'sports',
      'food_and_drink', 'art', 'wellness',
    ])
    .optional(),
  price_floor_cents: z.number().int().nonnegative().optional(),
  price_ceiling_cents: z.number().int().nonnegative().optional(),
  max_results: z.number().int().min(1).max(5).default(3),
  prefer_network: z.enum(['skimlinks', 'sovrn', 'any']).default('any'),
}).strict();

type Output = {
  ok: true;
  results: Array<{
    title: string;
    description: string | null;
    image_url: string | null;
    source_url: string;        // canonical retailer URL
    source_retailer: string;
    value_cents: number | null;
    network: 'skimlinks' | 'sovrn' | 'direct';
    affiliate_url: string;      // pre-wrapped via wrapAffiliateLink()
    commission_pct_estimate: number | null;
    confidence: 'high' | 'medium' | 'low';
  }>;
};
```

### What it does

Calls Skimlinks Merchant API + Sovrn Commerce API in parallel, dedupes by retailer + product fingerprint, ranks by `(commission_pct × confidence × fit_score)` where `fit_score` is a quick semantic match against the peek's vibe/occasion (cached per-peek). Returns up to 5 candidates already wrapped through `wrapAffiliateLink(originalUrl, buildClickCustomId(peekId))`. The card ID isn't known yet — the curator hasn't picked — so customId is peek-level at search time. When the curator selects a result and the tool transitions to `add_card`, the re-wrap-with-peekId:cardId happens just like in scrape_url today (mirror lib/anthropic/tools/scrape_url.ts:99-108 logic).

### How results render to the curator

Two surfaces:

1. **Suggestion sidebar deck (curator-side)** — H6 in CAPABILITY_INVENTORY. A first-class panel, not buried in the chat history. Results render as miniature cards in a right-side or bottom-sheet sidebar in `/build`. Each result shows: image (cropped), title, price (if known), retailer chip, commission badge (subtle — for internal awareness, NOT customer-facing). Drag-and-drop into the card list, or click "Ask Peek to add this one."
2. **Chat-bubble preview (inline)** — a compact 3-up grid in Peek's response bubble. "Here are 3 — which lands?" Curator clicks one → that triggers `add_card` automatically. The sidebar deck retains the full set for browsing.

The suggestion deck is the missing piece of CONCEPT-V2 §8. Without it, `affiliate_search` results die in the chat scrollback. Build the sidebar as part of the same packet that ships the tool.

### Failure modes

- **No keys** (`SKIMLINKS_PUBLISHER_ID` and `SOVRN_API_KEY` both unset) → tool returns `{ ok: false, error: 'affiliate_not_configured' }`. Peek falls back to `web_search` and inserts a `network: 'direct'` card with no affiliate URL.
- **Zero results** → return empty results array with `ok: true`. Peek says "didn't find clean affiliate options for [query] — want me to do a web search instead?"
- **API timeout** (>3s) → return what came back on time; flag `degraded: true` per source.

---

## 3. The stale-endpoint correction

Per BUGS.md trailing notes: `lib/affiliate/skimlinks.ts` and `lib/affiliate/sovrn.ts` use stale endpoints. The wraps still resolve (Skimlinks maintains backwards compatibility for old `skimresources.com` URLs and viglink.com redirects through Sovrn's infra), but they're not the documented current endpoints and could drop without warning.

Current code (stale):

```ts
// lib/affiliate/skimlinks.ts:19
`https://go.skimresources.com/?${params.toString()}`

// lib/affiliate/sovrn.ts:19
`https://redirect.viglink.com/?${params.toString()}`
```

Correct endpoints (per current vendor docs as of writing):

```ts
// Skimlinks
`https://go.redirectingat.com/?${params.toString()}`

// Sovrn Commerce
`https://redirect.viglink.com/?${params.toString()}` // viglink.com still resolves but Sovrn docs publish redirect.sovrn.com
```

For Skimlinks, the swap from `go.skimresources.com` → `go.redirectingat.com` is the critical one. Skimlinks acquired Viglink and now publishes both `go.redirectingat.com` and `go.skimresources.com` as active; the former is the canonical post-merger URL and what their dashboard generates. Both currently resolve, but new publisher accounts increasingly require `go.redirectingat.com` for click attribution to register.

For Sovrn, `redirect.viglink.com` remains operational because Sovrn purchased Viglink and kept the infra running. Newer docs reference `redirect.sovrn.com` but `redirect.viglink.com` is not deprecated. Lower priority — fix when convenient.

**Action:** ship a one-line packet swapping the Skimlinks URL builder. Sovrn is lower priority; leave a TODO and revisit when we have a documented Sovrn account on file. The webhook signature format (M14) is a separate gap — also defer until vendor docs are in hand.

Once swapped, click attribution should round-trip correctly through Skimlinks's reporting dashboard. The current `parseClickCustomId` on the webhook side (`lib/affiliate/wrap.ts:49-56`) doesn't change — it's just splitting `peekId:cardId` regardless of endpoint.

---

## 4. Click attribution flow

Peek doesn't need to think about this — call the tools, the plumbing handles the round-trip. Documented here for packet-writers who need to extend it.

1. **Card insert time** — when `add_card` (or `scrape_url`, or future `affiliate_search` → add) writes the card, `wrapAffiliateLink(sourceUrl, buildClickCustomId(peekId, cardId))` produces an affiliate URL with the custom ID embedded as a query param: Skimlinks `xs=peekId:cardId`, Sovrn `cid=peekId:cardId`. The custom ID is opaque to the user.
2. **Recipient clicks card** — affiliate URL opens in a new tab/window. Skimlinks/Sovrn redirect logs the click with our customId.
3. **Recipient purchases** — Skimlinks/Sovrn's pixel fires on the retailer's confirmation page (or via S2S server-side notification depending on merchant). Transaction records to our publisher account with the customId attached.
4. **Skimlinks webhook fires** — `POST /api/webhooks/skimlinks` (`atelier/app/api/webhooks/skimlinks/route.ts`). Verifies HMAC signature (M14 — guessed format; needs vendor confirmation), then calls `parseClickCustomId(transaction.xs)` to recover `peekId` + `cardId`. Looks up the most recent pick on that card by that recipient signature. Upserts a row into `affiliate_revenue` table (`db/schema/affiliate_revenue.ts`) with `on_conflict: external_txn_id`.
5. **No Sovrn webhook yet** (per CONCEPT-INVENTORY §4 known gap). Sovrn revenue is tracked in their dashboard manually until we wire it. Lower priority — Skimlinks is the primary network.

The chain breaks if:

- M16 isn't fixed (scrape-worker doesn't re-wrap with cardId post-hydration) — Wave 2 candidate.
- The wrap URL is stale enough that Skimlinks doesn't recognize the click — §3 above.
- The webhook signature format is wrong (M14) — pending vendor docs.

For Peek's purposes: **never call `wrapAffiliateLink` yourself in tool code you write going forward.** The existing tools (`add_card`, `scrape_url`) own the wrap, and `affiliate_search` (when built) will own it for its insertion path. Calling it twice produces a double-wrapped URL that no merchant will recognize.

---

## 5. Revenue per channel

Don't lecture the curator about commission rates — never. But Peek's biases when choosing between equivalent options should reflect what actually drives revenue. Internal mental model, not user-facing copy:

### Skimlinks (primary product affiliate)

- Average ~5% commission across the publisher base.
- Strongest at boutique mid-luxury brands: Patagonia, Cuyana, Mansur Gavriel, Polène, Brooklinen, Knock, Olive & June, Jellycat (princess-bday hits this hard), Great Pretenders. These often run 8-12%.
- Weak at mass retailers: Amazon (no Skimlinks coverage — Amazon Associates is separate and not wired), Walmart, Target. If the curator wants "from Target," it'll be a `direct` wrap with no revenue.
- Apple, Tesla, Ferrari — `direct` only. Aspirational/gag cards are fine to ship at zero commission; they're the bait.

### Sovrn (fallback product affiliate)

- Average ~4% across publishers. Often duplicates Skimlinks's coverage. Use as fallback when Skimlinks returns nothing for a query.
- Stronger than Skimlinks for some long-tail categories (independent makers, smaller stores).

### Viator (tours and experiences — G4)

- ~8% commission, the highest of the affiliate-tour space.
- Activity cards: tours, experiences, lessons (cooking class, wine tasting, scuba dive). Recipient books the activity, we get the cut.
- Strongest for travel-coded peeks (anniversary trips, honeymoons, retirement bucket-list).

### OpenTable (reservations — G5)

- Pays per-seated-diner (~$1/cover, varies by partner program). Volume-multiplier on the right peeks.
- Best fit: anniversary dinners, "let me take you out" activity cards, restaurant gift cards (the activity reads as the gift even if no money changes hands at peek.gift).
- Doesn't matter whether the curator pays for the meal — recipient just clicks-through and books. Revenue independent of who ultimately pays.

### Ticketmaster / SeatGeek (events — G6)

- Variable, generally 5-10% on resale, 2-5% on primary.
- Best fit: concert ticket gifts, sports tickets, theater. Activity card with the event embedded.
- Less reliable across regions — international events often not affiliate-eligible.

### Practical bias map (for Peek's internal scoring)

When two equivalent options exist and Peek is choosing what to surface first:

- Boutique-mid-luxury > mass retailer (commission + fit + feels-curated)
- Activity (Viator/OpenTable) > equivalent-cost product (higher EPC + more memorable + better recipient experience)
- Affiliate-eligible > direct (revenue + same UX)
- Curator-personalized > generic catalog match (FIT wins; never push a 12% commission item that's wrong for the recipient — see Anti-patterns §7)

This is bias, not rule. The curator's voice always wins. If they say "get her the Target version," get her the Target version.

---

## 6. The suggestion UI (curator-side panel)

Per H6 + CONCEPT-V2 §8 — the missing first-class surface. Without this, `affiliate_search` results just die in the chat. The packet that ships `affiliate_search` MUST ship the UI alongside.

### Layout (proposed)

Desktop `/build`:

- Right rail, ~320px wide, collapsible.
- Header: "Suggestions" + a small toggle to filter by source (Peek's picks / Skimlinks / Sovrn / Activity).
- Deck of compact suggestion cards stacked vertically. Each ~120px tall.
- Each suggestion card: thumbnail (left, ~80px square), title (1 line, truncated), price chip (top-right), retailer chip (bottom-left, neutral type, no logo), action row (bottom: "Add" → fires `add_card` with the suggestion's data; "Swap" → opens variant-group flow; "Hide" → dismisses).

Mobile:

- Bottom drawer, swipe-up to expand. Default at peek of the chat.
- Suggestions render as horizontal-scrolling cards in the collapsed view, full grid when expanded.

### Population logic

- Initial state: empty placeholder ("Peek will drop suggestions here as you chat.").
- On every `affiliate_search` call, append results to the deck. Don't replace — accumulate. Curator may want to revisit earlier suggestions.
- Auto-dedupe by `source_url` so the same product doesn't appear twice if Peek re-searches a similar category.
- Cap at 20 suggestions visible — older ones scroll off / collapse into an archive.
- The deck persists per-peek. Reload `/build/[peekId]` → suggestions reload from a server-side cache (Supabase `suggestions` table or Upstash, depending on packet design).

### Drag-and-drop into card list

- Curator drags a suggestion card from the deck onto the card list in the main column.
- Drop fires `add_card` with the suggestion's pre-filled data (already affiliate-wrapped, no re-scrape needed).
- Visual: drop zone highlights between existing cards; drop sets the position via existing reorder mechanics.

### Curator's "ask Peek to add this one"

- Click a suggestion → Peek adds it via `add_card`. Peek narrates ONE line in chat acknowledging the move ("Added the Stanley — keeping or swap?"). The page updates live per the mutate-first principle.

### What the curator NEVER sees

- Commission percentages.
- Affiliate URLs (the `affiliate_url` field). Only the wrapped URL is used internally by the card-render layer.
- Network names ("Skimlinks", "Sovrn") branded anywhere customer-facing. The suggestion card shows "Stanley" as the retailer, not "Stanley via Skimlinks."
- Any internal scoring or confidence numbers.

The principle from CONCEPT-V2: **no retailer branding visible.** Cards feel like the curator's gift, not Amazon's wishlist. Same applies to suggestions: the curator sees product + retailer name (for trust + clarity), not "your affiliate plugin."

---

## 7. Anti-patterns

The traps you avoid because they undermine the product:

### Never push a high-commission item over a better-fit one

If the curator says "she's into Stanley cups," and Skimlinks returns Yeti (8% commission) and Stanley (5%) — pull Stanley first. The curator's signal is "Stanley." Yeti is the swap option, not the lead. FIT > commission. Always.

Exception: when the curator is genuinely open ("she likes those big water bottles, any are fine") and Yeti's commission is materially higher, lead with Yeti. The curator gave you license to optimize.

### Never wrap a URL twice

`wrapAffiliateLink(wrapAffiliateLink(url).wrappedUrl, ...)` produces nonsense. The result is a Skimlinks-of-a-Skimlinks-URL that no merchant pixel will recognize. Symptom: clicks happen, no commission attributes.

Defense: `wrap.ts` doesn't check for already-wrapped URLs (we should add a guard — possible follow-up packet). For now, the rule is: tools call `wrapAffiliateLink` exactly once at insert time. The re-wrap with `peekId:cardId` post-insert is a special case that always operates on the ORIGINAL URL, not the wrapped one (see `add_card.ts:252-261` — it passes `parsed.source_url`, not `wrapped.wrappedUrl`).

If you're writing a new tool that creates a card with an affiliate URL: pass the ORIGINAL retailer URL to `wrapAffiliateLink`. Never pass a Skimlinks or Sovrn URL.

### Never expose retailer branding in the recipient's card view

The card shows the product. It does NOT show "from Amazon," "Best Price at Walmart," "via Skimlinks." The recipient should never know — and certainly never care — where the card data came from. Schema-wise, `cards.sourceRetailer` is stored but hidden from recipient queries; `cards.affiliateUrl` is only used on click-through. The display layer shows `title`, `description`, `imageUrl`, `valueCents` (gated by `revealValue`). Nothing else.

This is BRAIN-DUMP rule: "the cards feel like the sender's gift, not Amazon's wishlist." Never violate it.

### Never call `affiliate_search` for activities, restaurants, or events

That's `place_search_v2` territory. Skimlinks doesn't have restaurant listings; calling it for "dinner at Carbone" returns nothing useful or returns wrong-category junk (a cookbook titled "Carbone" maybe). Use the right tool.

### Never call `web_search` when `scrape_url` works

If the curator pasted a URL, you have a URL. Don't web-search around it to find a "better" URL. Scrape the one they gave you. Their judgment > your fact-finding. If the page is paywalled / broken / 404 (the scrape will tell you via `outcome.ok: false`), THEN ask the curator for a different link.

### Never call `affiliate_search` repeatedly for the same category in one session

Curator says "coffee gift" — you call once, return 3 options. Curator says "those are wrong, more elegant" — you do NOT re-call `affiliate_search` with `query: 'elegant coffee gift'`. You ask one clarifying question ("more like a $200 Breville or more like a single beautiful pour-over kettle?") and search ONCE more with the refined query. Searches cost API quota; over-searching burns it.

The exception: if the curator pivots categories ("forget coffee, what about candles?") — that's a new category, new search. Different from refining within one.

### Never auto-add the highest-affiliate-rate result without curator confirmation

`affiliate_search` returns suggestions; it does NOT add cards. The transition from suggestion → card is the curator's move (drag-drop or "add this one"). Peek can NARRATE a recommendation ("the Stanley feels closest to her — adding unless you want a different one"), but the add still flows through `add_card` with the curator's implicit OK in the next turn if they don't object.

The exception: when the curator's prior turn explicitly said "just add the best one" — that's permission. Add it; describe what you did in one line.

### Never propose affiliate cards for cards the recipient can't realistically receive

The Ferrari is a gag (`is_taunt: true`). It doesn't get an affiliate wrap. Why? Because no one's clicking through to a Ferrari dealer from a peek and Skimlinks's Ferrari coverage is non-existent anyway. Gag cards: `affiliateNetwork: null`, `affiliateUrl: null`, `sourceUrl: null`. The card exists for the joke. (See `rules-engine-patterns.md` for the taunt vs off-limits distinction.)

Aspirational cards CAN be affiliate-wrapped if the recipient could plausibly receive them on unlock. The "designer bag locked behind a beg" IS realistic — if the recipient writes a great beg and the curator approves, the curator might actually buy it. Wrap it.

---

## 8. Cross-references

- `rules-engine-patterns.md` — affiliate-source cards become beg-locked, variant-grouped, or gag-overridden via the rules engine. The escalator pattern in particular (cheap free → medium beg-locked → aspirational date-locked) often pulls all three from `affiliate_search` for the lower two tiers and a single curator-specified aspirational for the top.
- `image-direction.md` — `affiliate_search` returns `image_url` from merchant catalogs. These are often clinical product photos. The hero-image pipeline can re-render them through fal.ai if a softer, vibe-matched composition is wanted (Tier 1 — see CAPABILITY_INVENTORY E3).
- `vibe-direction.md` — the suggestion deck should re-skin per the peek's vibe. Princess-bday peek shows suggestion cards in dusty pink + cream; teen-grad shows in ink + cream. The deck is part of the build surface, not a generic admin panel.
- `share-mechanics.md` — affiliate revenue doesn't appear in shareables. The OG card shows the gift, not the retailer.
- `CAPABILITY_INVENTORY.md` §E7 + §E8 + §H6 — the master inventory for affiliate vendors and the suggestion UI gap.
- `BUGS.md` — M14 (Skimlinks webhook signature), M16 (scrape-worker re-wrap), and trailing-notes stale-endpoint items are the live gaps. The `affiliate_search` tool itself is a new packet (likely Packet 42 per CAPABILITY_INVENTORY §K), not a bug fix.
- `CONCEPT-V2.md` §8 — the "suggested items" concept this skill operationalizes.
- `CONCEPT-INVENTORY.md` §4 — current PARTIAL status: wrap WIRED, webhook WIRED with caveats, scrape WIRED (2/3 tiers), suggestion UI ABSENT, Sovrn revenue webhook ABSENT.

---

## TL;DR for Peek

- URL in message → `scrape_url`.
- Specific product named → `web_search` (decisive) or `affiliate_search` (exploratory).
- Category named → `affiliate_search`.
- Activity/place named → `place_search_v2`.
- Abstract → propose 3 directions in chat, then search ONCE the curator picks a lane.
- Results render in the right-rail Suggestion deck (curator drags-drops or clicks-add).
- Never wrap twice. Never expose retailer branding. Never push high-commission over fit.
- Revenue comes back via Skimlinks webhook → `affiliate_revenue` table → curator dashboard (later). You don't think about it. You just call the right tool.
