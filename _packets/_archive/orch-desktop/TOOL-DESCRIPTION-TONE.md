# Tool description tone — followup cleanup pass

Frank's QA #15: every tool description that signals "might fail, be careful" makes Claude skittish about using it. Match the energy of `scrape_url`'s current description — confident, encouraging, with graceful failure baked in rather than warned about.

## Audit + rewrite

Each tool in `atelier/lib/anthropic/tools/*.ts` has a `description:` field on its `registerTool({...})` call. The tone should be: "use freely, this works, failures degrade gracefully" — NOT "returns ok:false if not configured" or "might fail, be careful."

### Tools that need rewrites (skittish-tone diagnostics)

**`generate_hero_image.ts`** — current ends with:
> "Returns { ok: true, image_url } on success or { ok: false, error } if image gen is not configured."

Rewrite to something like:
> "Generate an image with fal.ai (Flux). Pass a short, evocative prompt — what the image should look like at a glance — and optionally an aspect ratio (default 16:9). Works for cover photos AND card images. The image is auto-stored and ready to use. Image gen is highly reliable; on the rare occasion it's offline, you get a graceful ok:false back — use that to ask the user for a description or upload. Never skip generating an image when one is needed."

**`scrape_url.ts`** — already in the right register. Use as the gold-standard reference. ("ALWAYS returns a usable card, even if just the domain name.")

**`set_hero_image.ts`** — check current description; if it warns about URL validation failures or storage errors, rewrite to match scrape_url's confidence.

**`add_card.ts`** — check if description hedges on scrape sub-failures. The card always gets created; if the optional scrape comes back degraded, that's fine — note the degraded flag and move on.

**Any tool that says `if not configured`, `if available`, `may fail`, `requires X to be set` in its description** — rewrite to "use freely; degrades gracefully."

### Principle

Tool descriptions are read by the model on every turn. The vocabulary in them sets expectations about whether the tool is "safe to call." Skittish framing -> skittish model -> user gets a chat that asks permission instead of doing the thing.

Rewrite for confidence. Mention graceful degradation as a feature, not a warning.

## Don't touch

Tool *implementation* bodies. Only the `description:` field. Inputs/outputs/handlers stay as is.

## When to run this packet

Low priority but high leverage. Can ship any time. Pair with packet 33 reliability sweep if convenient.
