# TIPS — what I learned the hard way, so you don't

> Heads-ups, traps, and the test loop. The stuff that isn't in the contract or the
> JUMPOFF but will save you a rebuild. Skim it; come back when something bites.

## The traps I actually hit (and you will too)

**1. The "every page is the same font" collapse.** This is the #1 killer and it's
already in the current build (5 vibe presets, all Fraunces + Inter). The display face is
*half the concept*. If the gala and the rave share a font, you defaulted. The contract
makes `type.display` a required per-page choice on purpose — enforce it. A page where you
can't name *why this font* is a generic page.

**2. Concept-as-decoration instead of concept-as-law.** It's easy to write a nice
`oneLiner` and then build a normal page next to it. The concept has to *boss every
choice*. The test: can you point at the font, the color, the section order, the copy
voice, and each say "because [concept]"? If three things have no because, the concept
is wallpaper, not architecture.

**3. Two bold moves.** When you love an idea you want to add a second showpiece. Don't.
The vinyl tracklist AND the message-in-a-bottle AND the engraved plates = noise. Pick
one, make it loud, make everything else get out of its way.

**4. Building the renderer to the mockup instead of the contract.** The seductive
shortcut: hardcode the work-order ticket into the renderer because the demo needs it.
Now the renderer only does work-orders. Wrong. The ticket is a `custom` block in the IR;
the renderer just paints `custom` blocks. Renderer knows *kinds*, never *specific pages.*

**5. Vendor calls leaking into core.** The moment `runTool` calls `fal()` directly,
you've welded a vendor to the brain. Everything external goes through a port (`ir/ports.ts`).
Stub today, real tomorrow, swappable forever. This is the difference between "add the
14th API in an afternoon" and "rebuild."

**6. Asking the user design questions.** "What's your favorite color? Serif or sans?"
murders the magic. They came here to *not* think about design. Infer, decide, show. One
question max, only if taste-critical and unguessable (surprise party → hide the name?).

**7. Treating the in-page chat like it's dumb.** It's Opus — it's you. Don't write it a
500-line instruction manual; it'll feel managed and produce managed work. Give it the
JUMPOFF (judgment, peer-to-peer) and get out of the way. The manual instinct *lowers*
output quality here.

## Imagery without a real photo (you usually won't have one)
- Never block on an image. Author the **MediaSlot with a `directive`** (generate/search/
  removeBg…) and a `null` url. The renderer shows a themed gradient placeholder; the
  ImageProvider port fills it async. The page is beautiful *before* the image lands.
- Generated hero imagery must clear the **Moderation port** before *public* publish —
  design tolerates a `flagged`/`pending` hero state. Don't assume the image is safe.
- Uploads the user drops can be *restyled to the concept* (edit/relight op) — a raw
  phone photo in a themed page looks pasted; a relit one belongs.

## The cost-sane defaults (so day-one isn't a bill)
- **Prompt-cache the JUMPOFF + pantry.** They're big and constant — cache them or every
  turn re-pays. Biggest single cost lever.
- **Turnstile before the first LLM call** on guest chat. Open chat = open wallet.
- Stubs cost nothing — run the whole app on stubs, wire real ports only as you need them.

## The test loop (this is how the thing actually gets dialed — don't skip it)
1. **Conformance:** feed each `samples/*.ir.json` straight to the renderer, no chat.
   Does it paint the matching `mockups/*.html` caliber? If not, the *renderer* is behind.
2. **Cold round-trip:** give a fresh chat (JUMPOFF wired) the sample's `_user_input` and
   nothing else. Compare its page to the mockup. Different concept is fine — *same
   caliber* is the bar.
3. **Throw 10 weird ones:** "get-well for my coworker who broke his leg skiing," "going-
   away for the office cat," "engagement for two software engineers." Range is the metric,
   not any single hit.
4. **Safeword the chat.** Type `<SAFEWORD>` and read its structured report: what it
   inferred, what the pantry lacked, what it faked, what fought it, what'd make it
   gnarlier. **This is the gold.** It tells you whether to tune the *prompt* (taste gap)
   or the *ports/contract* (capability gap) — never a rigid engine.
5. Bring that report to design (me) + code. One change at a time. Redeploy. Repeat.

## How to talk to the design side (me) when something's off
Don't paraphrase the output — **send the actual page (or its IR) + the input that made
it.** "It came out generic" tells me nothing; the IR tells me whether the concept was
weak (prompt) or the renderer flattened it (code). The IR is our shared language; use it.

## The one-line gut check for any commit
*"If we 10×'d the backends and the design ambition tomorrow, does this still hold?"*
Yes → ship. No → you found the ceiling; fix the seam, not the symptom.
