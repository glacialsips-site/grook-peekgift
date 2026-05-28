# SPINE — what peek.gift IS, and what it has to ship with

The spine is the load-bearing definition of the product:

1. **The curator-AI system prompt** — what Peek (the chat agent) is, what it collects, why it collects it, how it speaks, what tools it can call.
2. **The slug data-model** — one flexible Zod-validated schema that covers princess-bday → bachelorette → wedding → 80th-birthday with the same shape.
3. **The tools manifest** — every tool Peek can call, mapped to one of the vendors in the capability inventory.

Everything else (vibe engine, cards, cinematic reveal, payment UI, share-sheet) is **decoration on the spine**. Polish without a strong spine = a Geocities page. Strong spine + decoration = the product.

## Reading order

Read these in order. Each one assumes the prior:

1. **`CAPABILITY_INVENTORY.md`** — what every vendor can do, what's wired, what's keyed-not-used, what's net-new. The catalog. Pairs with `_packets/CONCEPT-V2.md` (product brief), `_packets/CONCEPT-INVENTORY.md` (what's in code), `_packets/ANTHROPIC-API-CONTEXT.md` (Anthropic mechanics), `_packets/BRAIN-DUMP.md` (Frank's raw voice), `_packets/BUGS.md` (live bug ledger), `_packets/STATE.md` (live state).
2. **`CURATOR_PROMPT.md`** *(next turn)* — Peek's system prompt. Identity, what-it-collects + WHY each, conversational rules (one Q at a time, mid-stream tool calls, propose-don't-lecture), mobile-first chat UI (text + mic + `+` attachment menu mirroring the Claude mobile app).
3. **`SLUG_MODEL.ts`** *(next turn)* — one Zod schema for the page. Skeleton: recipient / occasion / vibe / hero / note / cards / rules / countdown / share / collab / checkout. Card types as discriminated union (product / activity / aspirational / digital / joke). Vibe re-skins it per occasion.
4. **`TOOL_MANIFEST.md`** *(next turn)* — every tool Peek can call, with schema + side effects + which vendor it routes to.
5. **`skills/peek-*.md`** *(later)* — the conditional skill bundles (occasion-templates, vibe-direction, image-direction, copy-house-style, share-mechanics, reveal-mechanics, affiliate-strategy, rules-engine-patterns).
6. **`URL-AUDIT.md`** *(in flight)* — backend-vendor URL drift audit (written by a parallel agent).
7. **`CUTOVER.md`** — the peek.gift apex domain cutover plan. Five steps; same Netlify site, same keys.

## Rules for spine docs

- Spine docs are **canonical**. Workers MUST read the relevant spine docs before implementing. If a packet would conflict with a spine doc, the packet is wrong (or the spine needs updating first — file a separate doc-update packet).
- Spine docs reference vendors via the capability inventory by name. Don't re-explain what Skimlinks is in TOOL_MANIFEST.md — link to CAPABILITY_INVENTORY.md §E7.
- Mobile-first is implicit. Every UI surface (chat, preview, recipient view) is mobile-first; desktop is the second-pass. The chat surface mirrors the Claude mobile app paradigm (text + mic + `+` attachment menu).
- "Custom everything." No Clerk-branded UI. No Stripe-branded checkout. Vibe engine drives the visual layer; primitive Vibe components, not hardcoded utility classes for color/spacing/shape/type.
