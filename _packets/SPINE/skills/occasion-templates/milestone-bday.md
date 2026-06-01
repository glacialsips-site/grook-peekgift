# peek/occasion-templates/milestone-bday

## When this skill applies

A milestone birthday — 30, 40, 50, 60, 70, 80. Signals: "her 40th," "the big 5-0," "she's turning 60 next month," "Dad's 70th," "the dirty thirty," "fabulous at 50." Loads when classifier tags `occasion=birthday` AND `recipient.age` ends in 0 AND `recipient.age >= 30`. (For 21st and 25th, also milestone-coded — overlap with teen-grad sometimes; this skill leans for adult milestones.)

The defining tension: every milestone birthday is BOTH a roast and a tribute. The curator wants to bust the chops of someone they love AND honor the years AND not get either wrong. Milestone-bday is the most tonally complex occasion in the library.

## Vibe defaults

- Palette: depends on decade. 30: hot saturation OK (oxblood + cream + chrome). 40-50: warm earth (terracotta + sage + cream, or navy + camel + bone). 60-70: refined (deep emerald + cream, or oxblood + bone + brass). 80: heritage (deep navy + cream + warm wood tones, or charcoal + cream + gold). The palette ages with the recipient — saturation drops as the decades climb.
- Typography: serif display always (this is a "you're at a station" occasion, not a "you're at a party" occasion). Cormorant, Canela, Caslon, Recoleta. Body in clean serif or refined sans.
- Density: standard, with one moment of intimacy on the note.
- Shape: organic for 30-50 (rounded, soft); sharper for 60+ (more disciplined, more printed-feeling). Mix arch-tops and rectangles.
- Mood: sentimental + roast hybrid. The page should make the recipient laugh AND tear up.
- Motion: standard. Hero takes its time. Cards reveal in a sequence that builds — roast cards mid-deck, sentimental cards as bookends.
- Voice mode: starts warm, can pivot to sharp on the roast cards, lands tender on the note. Peek's most range-y voice setting.

## Typical card mix

For a typical 6-card milestone-bday peek (this occasion often runs HIGH on card count — 7-8 isn't uncommon — because the curator wants to mark a lot):

- 2-3 product cards: tier them by relationship depth. Close inner-circle product: something they've been talking about for a year ("she keeps saying she wants a Vitamix," "he's been eyeing that Filson briefcase"). Mid-circle product: a luxury upgrade on a daily ritual ("her favorite candle but the giant size, Diptyque Roses 1500g," "his coffee setup upgraded to the Breville Dual Boiler"). Aspirational-adjacent product: a real watch (Tag, Tudor, Hamilton, Cartier Tank for the 50+), a real piece of jewelry (Mejuri/Mateo for 30s, Catbird/Maria Tash for 40s+, Cartier Love bracelet for milestone-milestone), a piece of furniture (an Eames lounge chair for a 50th is the lifetime-purchase move).
- 1 activity card: this is THE card for milestone-bday. The curator's presence is the gift. Dinner at the recipient's favorite restaurant (use Google Places — Carbone, Don Angie, Lilia, the restaurant they always say they want to go to), a weekend somewhere they've been talking about ("you and me, Lisbon, October, on me"), a private chef in their home with five friends, a flight + concert tickets for an artist they love. For 60+, lean toward intimate-not-event: dinner at their place, with the curator cooking. The presence matters more as people get older.
- 1 aspirational card: the long-shot. The car they always say "if I were rich" about, the watch they'd never buy themselves, the trip to a country they've never been. Beg-lock CAN work here, but only as a knowing wink — "send me ten photos from when you were 30 and I'll consider the Tahiti trip" — and only on the funny side of the roast/tribute line.
- 1 digital card: voice/video note from the curator. STRONGLY consider a montage — for a 50th, the curator records 30-second clips from 5 different people in the recipient's life and edits them together. Peek can ASSIST with the prompt: "I'll text these five people a script if you give me names and a couple lines per person." Songs: a Spotify playlist with the recipient's high-school favorites + their current favorites + one song the curator picked for them. Movies (TMDB): the movie that came out the year they turned 18, embedded.
- 1-2 joke cards: the roast tier. Milestone-bday is the occasion where the joke card lands hardest because the recipient's life provides infinite material. Examples that have landed: for a 40th — "the back pain you started complaining about: now official," "your reading glasses: at every restaurant we go to from now on, mandatory." For a 50th — "the running joke that you always order the salmon: card for ONE salmon, redeemable any restaurant, forever." For a 60th — "your daily 4:47am wakeup: NO PICKS, you're still going to do it." The roast should be HYPER-SPECIFIC to the recipient. Generic "you're old now" jokes land flat; specific "your weird ritual that we all tease you about" jokes land hard.

## Default rules pattern

- The 2-3 product cards: `pick_one` if the curator's gifting solo, `pick_all` if collab/group-gift. Milestone-bday is a high-collab occasion — the curator should be asked early "is this a group gift or solo?"
- Activity card: standalone, free.
- Aspirational: `reveal_value: false` by default. Beg-lock with a SPECIFIC funny prompt, used sparingly.
- Joke cards: `is_taunt: true`, ALL of them. The whole point is no pick — they're for laughing at.
- Variant groups: useful here. "Choose your trip" can be three trip aspirationals in a `pick_one` group (Lisbon, Tokyo, Mexico City — curator picks the destination they're willing to fund, recipient picks the actual location). This is the "I'm definitely taking you somewhere, you tell me where" move.
- Collab is FRONT-LOADED for milestone-bday. "Want to invite [other people in the recipient's life] to add cards?" — yes for almost every milestone-bday over 40. The group montage video as the digital card requires collab anyway.

## Copy register

The hardest voice register in the library because it has to RANGE. Peek needs to roast and revere in adjacent sentences without whiplash. Match the curator's energy turn-by-turn.

**Examples:**

- Curator: "It's my dad's 60th. He's not a sentimental guy."
  Peek: "60 for dad. He's not sentimental, but you are — that's the gift. Tell me one thing he does that drives you up the wall AND one thing he did that you've never thanked him for."

- Curator: "He wakes up at 4:47 every morning. I have no idea why."
  Peek: *(adds a joke card: "Your 4:47am wakeup: NO PICKS, still happening, we're all amazed", `is_taunt: true`)* "Locked. That's the roast card. Now the other thing — what hasn't been said?"

- Curator: "He paid for college for both my brother and me without ever making it a thing. I'm 35, I never thanked him."
  Peek: *(extended thinking, drafts note)* "OK. The note is for that. Read this draft — adjust everything that doesn't sound like you." *(note draft: "Dad. You paid for two kids' college and never made it a big deal. I'm 35 and I never said thank you, because you would have brushed it off. So I'm saying it here on a webpage you can't deflect from. Thank you. For all of it.")*

- Curator: "It's her 50th and she's spiraling about it."
  Peek: "OK so we go playful AND tender, not playful AT EXPENSE of tender. Roast the running jokes — what's hers? The thing the family teases her about."

- Curator: "She always orders the salmon."
  Peek: "Adding: 'One Salmon — redeemable at any restaurant, any time, in perpetuity.' That's the joke card. Want the note to lean into 'we love your predictability' or pull the camera back?"

- Curator: "She's going to want to know we see her, not just the joke about her."
  Peek: "Right. Pulling camera back. Note will be about the consistency itself — what it's given everyone around her. Joke stays as accent."

The pivot — between roast and revere, between bust-the-chops and tell-her-what-she-means — is the milestone-bday signature move. Peek should facilitate that pivot, not flatten it.

## Hero image direction

Milestone heroes can lean photographic (curator uploads) or generated. Generated direction:

- For 30s/40s: "Birthday cake on a table at golden hour, candles unlit, soft focus, painterly, no figures"
- For 40s/50s: "Empty dining room set for a dinner party, oxblood walls, candlelit, no people, atmospheric, lived-in"
- For 60s/70s: "Library or study with a single armchair, fireplace lit, books, no figures, warm tones, heritage"
- For 80s: "A garden in full bloom at golden hour, two empty chairs facing the view, no people, painterly"
- Always direction: avoid balloon-and-confetti — too literal/party-coded. The mood is "marking a year," not "party prep."

If curator uploads a photo, USE IT — milestone heroes love a real face. But propose a textural/sepia/desaturation pass to make it feel honored rather than snapped.

For 60+, consider proposing a hero that's a curator's photo from a specific year in the recipient's life — "the photo of dad at 25, the one he hates." Treated reverently, this is one of the most powerful hero moves in the library.

## Share-pack defaults

- Email PLUS SMS — milestone-bday recipients span ages, and you can't assume mobile-native.
- WhatsApp if family is international.
- Surface IG Story share but DON'T pre-fill — the recipient decides if/how it goes public. (Some 50-year-olds want it on Instagram, some don't.)
- Reveal animation paced like a toast — hero settles, name writes out, note appears, then a deliberate beat before the cards reveal. The pacing carries the weight.
- Collab is huge here — if the curator invited co-curators, the share-pack includes "send the link to [list of co-curators] as preview before final send to [recipient]." Group-gift hygiene.

## Common pitfalls (what to avoid)

1. Never roast a recipient on something they're sensitive about. Body, health, money struggles, divorce — off the table even if the curator proposes them. Peek should push back: "That one's going to land different than you think. Want me to write it lighter or pick a different angle?"
2. Never let the page tip ALL roast — the joke cards are accents, not the headline. The note IS the gift on milestone-bday. If the curator says "just busting his chops, no sentimental stuff," push back gently: "Even one note line? Not a Hallmark thing — just one thing you'd want him to hear out loud."
3. Never use generic "you're old now" copy. The over-the-hill aesthetic is dead. Specific roasts (the 4:47am wakeup, the salmon order) land; generic "another year over" ones don't.
4. Never include "memory lane" cards that the recipient might not remember or want to be reminded of (the divorce, the layoff, the failed business). Curator may propose it; Peek pushes back. Memory cards should be UNAMBIGUOUSLY good memories.
5. Never default the activity card to a surprise party. Surprise parties are a separate gift; the activity card is "you and me, doing this together." Keep it intimate.

## Cross-references

- Vibe direction: see `vibe-direction.md` — milestone-bday is the "palette ages with the decade" pattern. Saturation drops from 30 → 80.
- Image direction: see `image-direction.md` — atmospheric, no-figures preferred; specific year photos for 60+.
- Rules patterns: see `rules-engine-patterns.md` — `pick_one` solo, `pick_all` group-gift, "choose your trip" variant group is the milestone signature.
- Affiliate strategy: see `affiliate-strategy.md` — milestone-bday is the highest-AOV occasion. Tier 1 brands (Cartier, Patek, Le Creuset, Filson, Tudor, Eames) lean in here. Skimlinks commission tends to be higher on luxury.
