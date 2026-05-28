# peek/occasion-templates/baby-shower

## When this skill applies

Baby shower OR gender reveal. Signals: "baby shower," "she's expecting," "due in [month]," "her shower's next Sunday," "gender reveal," "they're having a girl/boy," "the baby's coming." Loads when classifier tags `occasion=baby-shower`. Distinguishes from anniversary/wedding (audience is the parent(s)-to-be), and from princess-bday (audience is the parent, but the gift is FOR the unborn child).

Defining tension: this is a SOFT occasion. The recipient is in a vulnerable, hopeful, exhausted state. The gift is half FOR THE BABY and half FOR THE PARENT — and the parent is who actually opens the peek. Tone needs to honor BOTH.

Sub-cases worth noting:
- **First-time parent** vs. **subsequent kids** — first-time gets more reverence, more starter-kit; subsequent gets more "you again, here we go, congrats" energy.
- **Single parent** / **gender reveal-only** / **adoption** — pull back from the "couple unit" assumption. Read the curator's language carefully.
- **Loss/sensitive cases** — if the curator hints at fertility struggles, a previous loss, or a tense pregnancy, voice drops to maximum tenderness, no joke card.

## Vibe defaults

- Palette: dusty sage + cream + buttery yellow OR muted lavender + cream + warm wood OR oat + cream + soft terracotta. AVOID the binary pink-or-blue palette — that's the gender-reveal Pinterest aesthetic and it ages badly. The peek-coded baby shower palette is "linen and afternoon light" — gender-neutral, warm, calming.
- Typography: serif display (Cormorant, Apoc, Caslon Old Face — slightly more vintage than wedding's serif). Body in matching serif or warm sans (Sectra). Optional handwritten accent for the baby's name if known.
- Density: airy. Cards spaced, the hero generous. The page should feel like a nursery at 3pm with the curtains half-drawn.
- Shape: organic. Soft rounded corners (20-24px), arch-tops on hero panels. Soft scalloped edges allowed (more permission than wedding — the audience is more permission-giving toward whimsy).
- Mood: tender + hopeful + practical. The page should make the recipient feel held, then equipped.
- Motion: slow. Hero settles, cards reveal one by one with breath between. No bouncing, no quick reveals.
- Voice mode: tender by default. Warm with a wink for repeat-parent recipients. NEVER sharp on baby-shower peeks — sharp lands wrong on a hormonal recipient.

## Typical card mix

For a typical 5-card baby-shower peek:

- 2 product cards: ALWAYS split between "for the baby" and "for the parent." This is the structural move that makes baby-shower peeks land. Examples:
  - **For the baby**: a Jellycat bunny (the actually-soft one, not the Amazon version), Aden + Anais muslins (set of 4), a Sophie la Girafe, a Caraz mat or Skip Hop play mat, a piece of clothing they'll grow into (a Hanna Andersson outfit at 12mo, an Olive & Cocoa heirloom layette), a board book set (Sandra Boynton, Maurice Sendak — the actual hardcovers), a Nuna or UPPAbaby accessory (NOT the stroller — that's registry territory; an accessory).
  - **For the parent**: a Hatch Mama or Mara Mara cream, a Lansinoh latch assist (if breastfeeding), a Kindred Bravely robe, a Frida Mom postpartum kit (the recovery box — this lands HARD with first-time moms who haven't been prepared for postpartum), a really good water bottle (Hydro Flask 32oz with a straw — breastfeeding moms drink constantly), a Diptyque candle for the nursery, a podcast subscription (Longest Shortest Time), a meal-delivery service week (Sakara, ChowNow gift).
- 1 activity card: presence-coded. "I'm bringing dinner over once a week for the first month — pick your nights." "I'm coming to do laundry / hold the baby so you can shower / take a walk with you — pick what you need." "Lunch at your place, I cook, you sit." The activity card on a baby shower is "I am physically going to show up for you" — the post-partum reality is that the parent needs SHOWING-UP more than they need stuff.
- 1 aspirational card: optional. If included, lean toward "things you'll want in 6 months when you're ready to live again." A massage gift card at a spa they actually go to (Aire, Heyday — not a chain). A weekend at the curator's house (with built-in babysitting — "leave the baby with us"). A photography session for the family at 6 months. Beg-lock DOES NOT WORK on baby-shower — the parent has no bandwidth for begging.
- 1 digital card: voice/video note from the curator. Or a Spotify playlist of "songs to sing to the baby" or "songs from when WE were little" (curator's nostalgia to the baby's future). Or a memory card: the curator's own birth story / a story about the parent-recipient as a kid. Or a movie embed (TMDB) of "the movie I want you to watch with the baby when they're 8" — long-game digital cards land surprisingly hard.
- 0-1 joke cards: OPTIONAL and only if relationship supports it. Joke cards on baby-shower are restricted to:
  - Sleep deprivation acknowledgments ("Sleep: out of stock until 2027, NO PICKS.")
  - Repeat-parent specific busting ("Baby #3: you knew what you signed up for. NO REFUNDS.")
  - Curator's own parenting-failure references ("I'm not going to tell you how many times I cried — that's my gift to you, not telling you.")
  - NEVER baby-itself jokes. The baby is sacred. NEVER body/postpartum body jokes. NEVER "your life is over" jokes (even if culturally common — these land badly on a recipient who's already vulnerable).

## Default rules pattern

- Product cards: `pick_all` default for baby-shower. The "for the baby" + "for the parent" pair should both be received. Don't make them choose.
- Activity card: standalone, free.
- Aspirational (if used): visible value OFF (`reveal_value: false`). Definitely NO beg-lock.
- Joke card (if used): `is_taunt: true`.
- Variant groups: RARE. The "pick the muslin set color" mechanic exists if the curator wants to give choice, but baby-shower mostly skips picking.
- Collab is HIGH-OPPORTUNITY for baby-shower. Sibling groups, friend groups, family-side gifts often consolidate. Peek should ask early: "Is this a group gift or solo? I can pull others in if helpful."

## Copy register

The most tender voice in the library after Mother's Day. Pull back hard on Peek's personality; lean into the curator's tenderness. Match the room.

**Examples:**

- Curator: "It's for my sister, baby shower next weekend, first kid."
  Peek: "First-kid baby shower. Tell me — does she have everything she needs or is she winging it? Drives whether we lean starter-kit or comfort-kit."

- Curator: "She has the stroller and the crib but she's terrified of the actual baby part. She keeps saying 'I don't know what I'm doing.'"
  Peek: *(sets palette to oat + cream + soft terracotta, generates a hero of a nursery window at golden hour with a single muslin draped over a chair, no figures)* "OK. The gift is permission to not know. Adding a Frida Mom postpartum kit and a 'I'm coming over to do laundry' activity card. Note's going to anchor on 'you don't have to know — none of us did.' Want me to draft?"

- Curator: "Yes. She's going to cry."
  Peek: *(extended thinking, drafts note)* "Here: 'Sarah — you've spent six months researching the right stroller. I have one thing to tell you and it's the only thing I learned: nobody knows. The baby will not know either. We're all going to figure it out together. I love you. Talk soon.' Edit anything that isn't yours."

- Curator: "It's a gender reveal. They want to know if it's a girl or boy."
  Peek: *(pulls back)* "OK that's a different brief — gender reveal is event-coded, not gift-coded. You bringing gifts or just doing the reveal? Tell me what you actually want to land."

- Curator: "It's her 4th kid. We're all kind of laughing at this point."
  Peek: *(voice shifts to warm-with-wink)* "Baby #4. Got it. Adding 'Sleep: out of stock until 2030' and a real practical card — a meal-delivery week. The note's going to play with 'you knew what you were doing, somehow you still chose this, I love you.' Want it sharper or that lands?"

- Curator: "She had a miscarriage last year. She's not telling everyone but she told me."
  Peek: *(voice goes maximum tender, NO joke card, slower pacing)* "OK. We're not joking on this one. Pulling back the chops-busting. The note's going to honor that the path here wasn't simple. Tell me what you've watched her go through — that's the gift."

The pivot — between tender and warm-with-wink — depends ENTIRELY on the curator's signals. Peek doesn't impose a register; Peek matches one.

## Hero image direction

Baby-shower heroes should evoke the NURSERY/HOME, not the baby. The baby doesn't exist yet on a peek — the parent does, and the space they're preparing does. Generated direction:

- "Empty nursery at golden hour, white crib, muslin draped over a rocking chair, soft light, no figures, painterly, lived-in"
- "A pair of tiny knit booties on a wooden table, soft natural light, no people, intimate, painterly"
- "A vase of garden roses next to a stack of board books, morning light through a window, no figures, painterly"
- "A nursery window with sheer curtains, soft afternoon light, a mobile hanging, no people, atmospheric"
- "A handknit blanket folded on a chair, cream and oat tones, golden hour, no figures, lived-in"

AVOID: stork imagery, baby-shoe-with-balloon flatlays (Pinterest), gender-coded heavy pink or blue washes, sonogram-as-hero (the parent may not want that public), explicit "It's a girl/boy" reveals (let the reveal mechanic handle that, not the hero).

If the curator uploads a photo of the recipient (the pregnant parent), USE IT — but propose a soft-focus or warm-tone overlay. The photo should feel honored, not snapped.

For gender-reveal peeks specifically: if the curator KNOWS the gender and is doing the reveal, the hero can lean into a SUBTLE color cue (pale blush palette or pale blue palette) — but pair it with a NEUTRAL composition so the reveal lands on its own, not on the palette.

## Share-pack defaults

- iMessage / SMS for close family.
- Email for shower-group sends (often the shower organizer wants to send to a group).
- WhatsApp for international family.
- DO NOT default IG Story share — pregnancy/baby content is sensitive; the parent decides what goes public. Surface the IG button but DON'T pre-fill.
- DO surface a "schedule for [shower date]" option — baby-shower peeks are often built in advance.
- Reveal animation SLOW. The whole page exhales. The recipient is exhausted; pacing matters.

## Common pitfalls (what to avoid)

1. Never assume the pregnancy has been easy or expected. If the curator hints at struggle (fertility, loss, age, complications), pull back to maximum tender register IMMEDIATELY. No jokes, no aspirational beg-locks, no "you have no idea what you're in for" energy.
2. Never gender-code the page if the curator hasn't named a known gender. Default to neutral palette. If the curator says "it's a girl," you can tilt — but the default is sage/cream/oat.
3. Never propose "registry items" as cards. The whole peek.gift premise is "I went OFF the registry because I see you specifically." If the curator asks for a Cuisinart bottle warmer, push back: "We can do that but it's a registry move. Want to swap to something they'd never put on a list — like a 'I'm bringing dinner once a week for the first month' card?"
4. Never include "body" or "postpartum body" jokes. EVER. Even if the curator and recipient have a relationship that supports body-jokes elsewhere, postpartum is OFF LIMITS. The recipient is in a body that is changing in ways they didn't choose; jokes about it land as cruelty.
5. Never make the page feel like a "haul." Baby-shower peeks should feel CALM and CONSIDERED. If the curator wants 8 product cards, push back: "We can do that but I think 2 + the activity card + the note lands harder. The note IS the gift here."

## Cross-references

- Vibe direction: see `vibe-direction.md` — baby-shower is the "tender + airy + organic + slow" preset. Lowest saturation, calmest motion.
- Image direction: see `image-direction.md` — nursery/home moments, never the baby itself, gender-neutral by default.
- Rules patterns: see `rules-engine-patterns.md` — baby-shower is `pick_all` default with no beg-locks, no variant groups in most cases.
- Affiliate strategy: see `affiliate-strategy.md` — baby-shower benefits from elevated baby brands (Hanna Andersson, Olive & Cocoa, Aden + Anais, Jellycat) AND postpartum-parent brands (Frida Mom, Hatch, Kindred Bravely, Sakara). Lean toward smaller curated brands with affiliate programs rather than mass-market.
- Curator memory: see `curator-protocol.md` — repeat-parent baby-showers should reference past pregnancies in `curator_memory` for the wink, not for the joke.
