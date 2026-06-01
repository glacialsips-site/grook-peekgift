# peek-jumpoff/
### The code-ready package: how a cold chat makes pages as good as the originals — and how it all plugs together.

> Built by the design instance (Opus) that made the original 10 mockups, for Claude Code.
> One self-contained folder. No relaying required — it maps the full picture so nothing
> gets built into a dead end.

## Read in this order
1. **`00_MAP.md`** — the whole picture on one page: the product, the success metric, the
   three parts, the shared spine, what code already built, the two things to fix, and the
   build order. **Start here.** If anything you build can't satisfy this, stop.
2. **`JUMPOFF.md`** — the in-page chat's **system prompt**. The design brain, written
   peer-to-peer (the chat is Opus — it's us). This is what makes output good first try.
3. **`ir/contract.ts`** — the **frozen IR** every part reads/writes. A superset migration
   of the repo's `lib/types.ts` (keeps cards; replaces thin `Vibe` with a real
   `ThemeSpec` + `Concept` + `sections[]`). The anti-generic, anti-underbuild lock.
4. **`ir/ports.ts`** — every backend (the "13 APIs," and all the future ones) as a typed
   **port with a stub**. Overbuild the interfaces, stub the implementations. Add a real
   backend = one adapter, zero changes anywhere else.
5. **`samples/`** — a worked **input → IR → page** example + how to use it as a few-shot
   and a conformance test. Proof the contract holds a wildly art-directed page.
6. **`TIPS.md`** — the traps I already hit, imagery/cost defaults, and **the test loop**
   (the safeword loop is how this actually gets dialed).
7. **`mockups/`** — the five hand-art-directed pages. The **quality bar** to match.

## The three sentences that prevent the rebuild
- **The model is the resolver.** A strong chat + the JUMPOFF authors the page from taste,
  like the originals were made. Do **not** build a mandatory deterministic design engine.
- **Overbuild the contract, build lean behind it.** The IR + ports are complete and
  frozen now; the implementations are stubs you fill in over time. That's good
  architecture, not gold-plating — which is why it actually gets built.
- **Every part conforms to the one spine.** Lean parts that read/write the full IR
  compose. A gorgeous part that invented its own shape is what you pay to rip out.

## What to actually do (the short version)
1. **Freeze the spine** — land `ir/contract.ts` + `ir/ports.ts`; migrate `lib/types.ts`
   (keep cards, swap `Vibe`→`ThemeSpec`, add `sections[]`); move existing vendor calls
   behind ports + stubs. No new features — just the seams.
2. **Swap the brain** — `PEEK_SYSTEM_PROMPT` = `JUMPOFF.md` (keep the voice you wrote,
   add the art direction); give the chat `set_concept` / `set_theme` / `upsert_section`
   tools so it authors design, not just cards.
3. **Cold-test + safeword loop** — throw simple briefs, compare to `mockups/`, safeword
   for the gap report, tune prompt-or-ports, repeat.

## Where this came from / how we work
Two seats, one intelligence: design (me) holds intent + taste + the contract; code holds
the live repo + build/deploy. I have read+write on `grook-peekgift`, so I can push the
contract and conforming stubs straight to a branch when you want — code reviews real
commits instead of a paraphrase. Ping the design side with the **actual IR + input**, never
a description, when something's off. The IR is our shared language.
