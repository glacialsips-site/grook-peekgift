# samples/ — the full path, end to end

These prove the one thing that matters: **a sloppy user line → a valid IR → a page as
good as the originals.** Read `dad-60th.ir.json` top to bottom — it carries its own
`_user_input` and `_comment`, and every field maps to something on the rendered page.

## The render targets (the quality bar)
The `mockups/` folder (one level up) holds the hand-art-directed HTML these IRs resolve
to. Pairing:

| Sample IR | Renders to (quality bar) | What it proves |
|---|---|---|
| `dad-60th.ir.json` | `../mockups/For the Old Man.html` | a wild concept (hardware work-order) + the `custom` block bold move (ticket stub) live happily in the same schema as a plain gift grid |

The other mockups (`The Send-Off`, `Soft Landing`, `Decree Absolute`, `El Taquito`) are
additional targets — each is a different concept/type system, all expressible in the one
`PeekIR` shape. That's the test of the contract: **if all five fit, the schema isn't
capping design.** (They do. The old `Vibe` couldn't hold any of them.)

## How to read it as a chat exemplar
Notice what the chat *authored from one line*:
- a **concept** specific enough to exclude balloons,
- a **theme** whose `display` font (Oswald) is chosen *for this concept* — not a default,
- **sections** including a `custom` block for the bold move the archetypes can't express,
- **cards** whose imagery is a `directive` (vendor-neutral) not a hardcoded URL — the
  ImageProvider port fills them later; the renderer shows themed placeholders until then.

## How to use it in the build
1. **Few-shot:** drop a trimmed version into the chat context as "here's the shape and
   the caliber." Don't over-feed — one or two is plenty; the JUMPOFF carries the taste.
2. **Conformance test:** feed each sample IR straight to the renderer with NO chat in
   the loop. If it paints the mockup, the renderer honors the contract. If it can't,
   the renderer (not the schema) is behind — fix the renderer.
3. **Round-trip test:** give the chat the `_user_input` cold and compare its IR to this
   one. Not field-for-field — concepts should differ — but it should be *this caliber*.
   Gap analysis here is the core of the safeword tuning loop (see ../TIPS.md).
