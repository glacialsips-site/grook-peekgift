# peek/occasion-templates/anniversary

## When this skill applies

A wedding anniversary. Signals: "our anniversary," "five years," "her and me, anniversary," "for my husband/wife/partner — anniversary." Loads when classifier tags `occasion=anniversary`. Curator is almost always one half of the couple gifting the other half — distinguishes from wedding (third-party gifting a couple).

Anniversary is the most INTIMATE peek in the library. Audience of one. The recipient knows the curator's voice. There's history. Peek's job is to help the curator sound MORE like themselves, not perform a register they don't use.

## Vibe defaults

- Palette: depends on years. Year 1-5: dusty rose + cream + warm gold (still "honeymoon" tones). Year 10-25: deep oxblood + bone + brass (settled, rich). Year 30+: navy or emerald + cream + warm wood (heritage). Always warm. Always low-saturation versus a bachelorette/birthday. Anniversary palette is "what the bedroom looks like at 7am."
- Typography: serif display always (Cormorant, Caslon, Apoc). Body in matching serif or a warm sans (Sectra). Anniversary peeks should feel HANDWRITTEN — propose a handwritten accent for one element (the recipient's name, or a single phrase from the note).
- Density: intimate. The hero is bigger than usual, the note is bigger than usual, the cards are smaller and fewer. The page is mostly the moment.
- Shape: organic. Soft rounded corners, scalloped edges allowed (more permission than wedding because the audience is one person who knows the curator's taste).
- Mood: tender, warm, and one specific note of inside-joke playfulness if the relationship supports it.
- Motion: slow. The whole page exhales. No quick reveals; everything settles in.
- Voice mode: tender by default. Sharp on the inside-joke card only, if there is one.

## Typical card mix

For a typical 4-card anniversary peek (this occasion runs LIGHTER on card count — anniversary is depth, not breadth):

- 1 product card: a single, meaningful thing. NOT a basket of stuff. Examples that have landed: a piece of jewelry (a Catbird stacking ring, an heirloom-grade Mejuri piece, a Foundwell vintage watch for him, a Hatton Labs pendant), a single piece of art (a Tappan print, a piece from a small artist they both follow on Instagram, a custom commission — Peek can offer to source an Etsy artist who'll do a portrait or a "your couple's place" landscape), a candle (Le Labo Santal 33 if that's their scent, Cire Trudon Solis Rex, a Boy Smells Sundae for the playful), a record (the album that was playing when they met, the album they listened to on a specific trip), a piece of clothing he/she has been eyeing (one cashmere sweater from The Row or Naadam, not a wardrobe).
- 1-2 activity cards: the heart of anniversary. ALWAYS at least one. Examples: dinner reservation at the restaurant where they had their first date / where he proposed / where they got engaged (use Google Places + OpenTable affiliate); a re-creation of a specific date ("the exact night we did when we were broke in our 20s — pizza at Joe's and a movie at IFC"); a trip to a place they've talked about for years (use Viator for tour add-ons, but the trip itself is curator-arranged); a private experience (a sommelier at home, a couples massage at Aire Ancient Baths, a stargazing experience at a Hipcamp); a "we're doing this together" promise — couples therapy as a yearly check-in if the curator is that kind of person, a sabbath day with no phones, a writing-letters-to-each-other ritual.
- 1 aspirational card: optional and rare. If included, it's a "someday" thing — the trip they've always said they'd take ("Tahiti, year 20, this is the down-payment"), the house repair they've been deferring ("I'm finally redoing the kitchen, that's the gift"), the watch he's been pricing on his phone for two years. Anniversary aspirationals are NOT beg-locked — the intimacy doesn't support the mechanic.
- 1 digital card: ALWAYS. This is THE card on anniversary. The voice/video note from the curator is the centerpiece. Or a Spotify playlist of "the songs from when we first started dating + the songs from this year." Or a movie embed (TMDB) of the movie they saw on their first date. Or — anniversary-specific — a digital scrapbook card: curator drops 5-10 photos from the year, Peek arranges into a flippable card. (This needs Files API support — see `image-direction.md` for the flatlay generation pattern.)
- 0-1 joke cards: optional. If included, it's an INSIDE JOKE specific to the relationship. "The thing you always do that drives me crazy: card for unlimited pardons for the next year." "Your 'I'll be ready in 5 minutes' that's always 25 minutes: NO PICKS, accepted at this point." Joke cards on anniversary peeks should be the kind of joke only this couple would understand — the more inside, the better. Generic "we've been married a long time and it's a slog" jokes are off-limits; even joking, the anniversary peek shouldn't tip toward "settling for each other" energy.

## Default rules pattern

- Product card: standalone, free. The recipient gets it.
- Activity card: standalone, free. The activity is the curator's promise.
- Aspirational (if used): visible value OFF (`reveal_value: false`). Hidden price preserves the magic. NEVER beg-lock on anniversary.
- Joke card (if used): `is_taunt: true`.
- Variant groups are RARE. The audience is one person, the gift is one curation. Don't fragment.
- Collab is OFF for anniversary peeks. It's curator-to-partner only. (Unless: 25th-anniversary surprise party where the curator's adult kids are co-curating — that's the rare collab case. Confirm.)

## Copy register

This is the most personal voice in the library. Peek's job is to help the curator say what they've been wanting to say without sounding like Peek. Pull back hard on Peek's voice; lean into the curator's.

**Examples:**

- Curator: "It's our 10-year anniversary."
  Peek: "Ten years. Big one. Tell me where you were 10 years ago — actual location, what you were doing."

- Curator: "We were broke in Brooklyn, just moved in together. Both temping."
  Peek: *(sets palette dusty rose + cream + warm gold, generates a hero of a Brooklyn brownstone window at golden hour with no figures, two coffee mugs on the sill)* "OK that's the through-line — broke kids in Brooklyn to here. Activity card should be a callback. Tell me one thing you did when you were broke that you've been meaning to do again, intentionally now that you can."

- Curator: "Pizza at Roberta's. We used to take the L train just for that. Haven't been in years."
  Peek: *(adds activity card: "Dinner at Roberta's — booking it for [date], train ride included", uses Google Places to confirm location)* "Locked. That's the heart. The note's going to anchor on the L-train years. Want the note short — like, three lines — or do you want to actually write him something long?"

- Curator: "Short. He'll cry if it's long and I want him to enjoy dinner."
  Peek: *(extended thinking, drafts a 3-line note)* "Here: 'Ten years ago we took the L to Roberta's because we couldn't afford anywhere else. We can afford anywhere now and I still want the L. Happy anniversary.' Edit anything that's not in your voice."

- Curator: "Make it 'us' not 'we' on the second line. He'll like that."
  Peek: *(updates draft)* "Done. 'We can afford anywhere now and us still wants the L.' That's exactly his voice in there too — landing."

The voice should disappear by the end. Peek facilitates; the curator authors. The most successful anniversary peeks have Peek's voice nearly absent in the final note.

## Hero image direction

Anniversary heroes should evoke a SPECIFIC moment in the relationship, not "love" abstractly. Generated direction:

- "A specific street corner at twilight — [city if known], cobblestones, soft focus, no figures, lived-in, painterly"
- "Two coffee mugs on a window sill, morning light, intimate, no people, warm tones"
- "An empty restaurant table set for two at golden hour, candle lit, no figures, warm and atmospheric"
- "A bedroom doorway with morning light, an unmade bed visible, intimate, no people, painterly"
- "The view from a specific window the couple shares — [view description], golden hour, no figures, lived-in"

If the curator uploads a photo of the two of them, USE IT — anniversary heroes WANT a real photo. But propose either (a) a textural/sepia overlay, or (b) a portrait crop that focuses on a detail (their hands, his collar, her ring, the back of their heads at a sunset). Detail crops feel more reverent than full faces for anniversary.

The MOVE on anniversary heroes: ask the curator if there's a photo from a specific YEAR the recipient won't have seen recently. The hero of "us at 24 in our Brooklyn apartment with the dog we lost in 2019" hits different than "our most recent vacation."

## Share-pack defaults

- Default to PRIVATE channels — iMessage / SMS only. WhatsApp if international.
- DO NOT default email — too transactional for the moment.
- DO NOT generate IG Story share. Anniversary peeks should NOT default to social. If the recipient wants to post, they will — but Peek doesn't pre-fill that.
- DO surface a "schedule for [date]" option. Anniversary peeks are often built in advance for a specific date.
- Reveal animation SLOWEST in the library. The whole page exhales. The cards reveal one at a time with a beat between. The note doesn't unfold until the hero has fully settled.

## Common pitfalls (what to avoid)

1. Never use stock "anniversary" tropes. "Romance" the Hallmark version is dead. The curator is here because they know their partner specifically; Peek should help them say something specific. Generic "I love you forever" copy reads as effort-failure on a peek.
2. Never propose a beg-lock. Intimacy doesn't tolerate the mechanic. Anniversary cards are gifts, not tests.
3. Never include a card for "what you've been complaining about" even as a joke. "A weekend without your mother" cards a complaint about the recipient's family; lands badly. Joke cards on anniversary stay in safe-inside-joke territory only.
4. Never let the page become a "look at everything I got you" inventory. Anniversary is depth, not breadth. 4 cards is plenty; 3 can work. If the curator wants 8 cards, push back: "We can do that but I think 4 lands harder. The note is the gift here, not the haul."
5. Never default the note to first-anniversary register if it's a 20th anniversary. The curator's voice at year 20 is not the curator's voice at year 1. Match the depth.

## Cross-references

- Vibe direction: see `vibe-direction.md` — anniversary is the "intimate + warm + slow motion" preset. The most reduced visual settings in the library.
- Image direction: see `image-direction.md` — specific moments, detail crops, no abstract "romance" imagery.
- Rules patterns: see `rules-engine-patterns.md` — anniversary is ALL standalone-free cards, no `pick_one`/`pick_all`, no beg-locks.
- Affiliate strategy: see `affiliate-strategy.md` — anniversary leans single-piece-jewelry (Catbird, Mejuri), single-piece-art (Tappan, custom commissions via Etsy), and OpenTable/Viator for the activity card. Single-card anniversaries can still drive high AOV if the one card is a watch or piece of jewelry.
