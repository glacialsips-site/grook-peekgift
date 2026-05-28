export const content = `# peek/occasion-templates/retirement

## When this skill applies

Retirement gift. Recipient is exiting a long career; usually 55-70 years old. Signals: "retiring," "her last day," "30 years at [company]," "he's hanging it up," "the party's next Friday." Loads when classifier tags \`occasion=retirement\`. Curator can be a spouse, an adult child, a colleague, a longtime friend, or a coworker giving on behalf of a team. Read the curator's relationship carefully — it changes the register substantially.

Defining tension: retirement is a LIFE TRANSITION peek with overlapping themes — milestone-bday (looking back) + teen-grad (looking forward) + anniversary (honoring duration). Most peek occasions are about a moment; retirement is about a CHAPTER closing and another starting. The page has to honor both.

## Vibe defaults

- Palette: deep navy + cream + warm wood OR oxblood + bone + brass OR olive + cream + warm wood. Always grounded, never bright. The "captain's quarters" or "lived-in study" palette. AVOID anything Vegas-bright (this isn't a party for retirement) or anything pastel (the saccharine "enjoy the golden years" aesthetic is the LOW-RES version).
- Typography: serif display, slightly more formal than wedding's (Caslon Old Face, Adobe Caslon, Recoleta, Apoc Revelations). Body in matching serif. Possibly a single italic accent for an inscription/quote.
- Density: airy, with deliberate space around each card. The page should feel like the recipient could sit with it.
- Shape: organic-with-discipline. Rounded corners (12-16px), arch-tops on hero panels, but disciplined alignment. Heritage-coded.
- Mood: reverent + warm + a little bit "the door's still open." Retirement isn't death; the page shouldn't read like a eulogy. Honor the chapter, anticipate the next.
- Motion: slow. Hero settles in like a portrait being hung; cards reveal in a sequence that builds from career to future to inner-circle.
- Voice mode: warm by default. Tender on the note. Sharp on ONE roast card if relationship supports it; otherwise no roast. Spouse-to-spouse retirement peeks lean tender; colleague-group peeks lean warm-with-wink.

## Typical card mix

For a typical 5-6 card retirement peek (this occasion runs slightly higher card count than average because there's more to honor):

- 1-2 product cards: the "now you have time" tier. Examples that have landed:
  - A real piece of golf equipment if golfer (TaylorMade or Titleist driver, custom-fitted from a local fitter), a Filson briefcase (now empty, "for whatever you decide to carry next"), a Leica or Fuji camera (if hobbyist), a leather journal (Smythson, Moleskine for the everyday), a Pelican fishing rod, a Yeti cooler, a Patagonia or Filson jacket they'd actually wear (NOT a "retirement" embroidered hoodie — never that).
  - A bottle of single-barrel bourbon or a really good wine club subscription (Vinous, Wine Access — choose by their actual palette, not generic "premium wine"). A cigar humidor if they're a cigar person.
  - A piece of art — specifically, something for their new home office or den, since they'll be there more. A Tappan print, a piece from a small artist, a custom commission.
  - A really good chair — an Eames Lounge, a Stressless recliner, a Herman Miller for their new home office. The "you're going to be sitting in this for hours doing what you love now" card.
- 1-2 activity cards: presence-coded AND future-coded. Examples:
  - "Lunch every other Tuesday — the recurring date, for as long as we both can do it." (Spouse / adult child / longtime friend.)
  - "The trip you've been talking about for 10 years — let's actually book it." (Spouse or adult child.)
  - "Quarterly bourbon nights at my place — first one's [date]." (Colleague-friend.)
  - "Tickets to [team] season opener — front row, you and me." (Sports-coded relationship.)
  - "A weekend at the lake house — first weekend you're officially free." (Family.)
  - The activity card on retirement is the "you're not going to lose your purpose — here are the new touchpoints" gift. CRITICAL: most retirees are anxious about losing structure. Activity cards address that.
- 1 aspirational card: the dream the curator knows the recipient has parked. Examples:
  - The trip he's been pricing on his phone for 5 years (specific destination — "Portugal, October, on us if you go").
  - The car he points at on the road and pretends he doesn't want.
  - The class she's been talking about (a sommelier course at the CIA, a pottery studio membership, a flight school for the bucket-list pilot dream).
  - The book deal — if the recipient writes (career retirement often coincides with creative ambition). "I'm getting you a session with a writing coach + the Mac you've been eyeing for the novel." Beg-lock here can work as a wink: "Send me the first 3 pages of the book you're going to write and I'll unlock the writing-retreat card."
- 1 digital card: voice/video note from the curator. STRONGLY consider a montage video — if it's a colleague-group peek, collect 30-second clips from 10 different colleagues. Use Files API to handle the upload. The digital card is often THE card on retirement peeks: a 5-minute video of the recipient's career being toasted by 10 different people is something they'll watch on their phone for the next 20 years.
  - Spotify playlist: songs from key years of their career (year they started + year their first kid was born + year of the big promotion + year they're retiring). Specificity over generality.
  - Memory card: the curator writes (or Peek drafts with extended thinking) a 200-word recollection of a specific moment with the recipient at work. THIS LANDS HARDEST when retiree is being gifted by a colleague.
- 0-1 joke card: SPARINGLY. Retirement is the second-most-tender occasion for chops-busting (after baby-shower). Acceptable joke cards:
  - "[Specific quirk of their work persona]: still required at home, no opt-out." (e.g. "Your 6am inbox-zero ritual: now applies to your home email, sorry honey.")
  - "[Specific running office joke]: now portable, transferable to retirement." (e.g. "The 'Karen from Accounting' impression: maintained, mandatory at family dinners.")
  - "[Specific habit they're famous for]: now your only job." (e.g. "Your 4pm coffee with the chocolate biscotti: full-time position, congrats on the promotion.")
  - NEVER "off to the golf course" generic-retirement-jokes. NEVER "old now" jokes. NEVER "now you're useless / your wife's going to kick you out" tropes (extremely common in workplace retirement humor and they all land badly on actual recipients).

## Default rules pattern

- Product cards: \`pick_one\` if curator's solo and tight on budget. \`pick_all\` if colleague-group or family-group consolidating. Most retirement peeks lean \`pick_all\` because the gift is the launch kit, not the choice.
- Activity card: standalone, free. (Plural activity cards stay free — recurring activity gifts are MULTIPLE promises, not picks.)
- Aspirational: \`reveal_value: false\`. Beg-lock works HERE if it's funny/wholesome ("send me 3 pages of the book you're going to write and the writing-retreat unlocks"), but pull back from beg-locks if the recipient is uncomfortable with the "you have to send me something to unlock" mechanic (often older recipients aren't used to it).
- Joke card: \`is_taunt: true\` if used.
- Variant groups: useful — "pick your trip" as 3 destinations in a \`pick_one\` group is a classic retirement move. The curator is funding ONE trip; the recipient picks which.
- Collab: HIGH-OPPORTUNITY. Retirement is the #1 collab occasion in the library. Spouse + adult kids + colleague-group can all contribute. Peek should ask EARLY: "Is this you alone or are others contributing? I can pull them in to add cards / record videos."

## Copy register

Voice mode depends heavily on the curator's relationship.

**Spouse-to-spouse retirement (tender-warm):**

- Curator: "It's for my husband, he's retiring after 35 years at the firm."
  Peek: "Thirty-five years. Big chapter closing. Tell me — what's he most worried about? Most excited about? Drives the page."

- Curator: "He's terrified of being bored. He doesn't have hobbies."
  Peek: *(sets palette to deep navy + cream + warm wood, generates a hero of an empty desk at golden hour with a single fountain pen, no figures)* "OK. The gift is structure for the no-structure. Adding: a weekly date card ('lunch every other Tuesday, year-round'), an activity card for that pottery class you mentioned offhand last month, a Filson briefcase ('for whatever you decide to carry next'), and the note's anchoring on 'you're not going to be bored, you're going to be different busy.'"

**Adult-child-to-parent retirement (warm-reverent):**

- Curator: "Dad's retiring. He doesn't really do feelings."
  Peek: "Doesn't do feelings — got it. So the gift is what we DON'T say to him out loud. Tell me one thing he taught you that you've never thanked him for."

- Curator: "He used to take me to work with him on Saturdays when I was a kid. I'd sit in his office reading. He never said anything about it but I think he liked the company."
  Peek: *(extended thinking, drafts note)* "OK. The note is for that. Read this draft — adjust everything that doesn't sound like you." *(note draft: "Dad. You took me to work with you on Saturdays for 10 years. You never said why and I never asked. I figured it out anyway. Thank you for the Saturdays. Whatever you do next — happy to come sit with you wherever you do it.")*

**Colleague-group retirement (warm-with-wink):**

- Curator: "Sending this from the whole sales team to our VP, Linda. 25 years."
  Peek: "Whole team to Linda — got it. Group send. What's the running joke about Linda? Drives the joke card and the tone."

- Curator: "She has a coffee mug that says 'World's Okayest Boss' that someone gave her in 2009. She still uses it. We tease her about it constantly."
  Peek: *(adds joke card: "The 'World's Okayest Boss' mug — retiring with you, NO PICKS, also accepted as commentary on 25 years of leadership")* "Locked. Now the montage card — want me to draft a script for the 10 people on the team to record 30-second clips? I'll put it together as a video."

The voice should always know: the recipient is doing something HARD. Retirement is not a vacation; it's an identity transition. Even the playful version honors that.

## Hero image direction

Retirement heroes evoke the CHAPTER, not the party. Direction:

- "An empty desk at golden hour, a single fountain pen, a vase of flowers, no figures, painterly, warm wood tones"
- "A library or study with a single leather armchair, fireplace lit, books, no people, heritage, warm tones"
- "A view from a window — could be office, could be home — at sunrise, anticipatory, no figures, atmospheric"
- "A workbench or hobby table set up, tools and materials waiting, golden hour, no people, lived-in"
- "Two empty chairs on a porch facing a sunset, painterly, no figures, atmospheric — the 'what's next' frame"

AVOID: party/balloon imagery (retirement is not a birthday party), "GOLD WATCH" imagery (cliché-coded), the actual word "RETIREMENT" anywhere on the hero (too literal), photos of the recipient at their desk (too current — retirement peeks should look FORWARD and BACKWARD, not at the present).

If the curator uploads a photo, USE IT. The strongest hero move on retirement: a photo of the recipient EARLY in their career — the one from 1995 they hate but everyone else loves. Treated reverently with a sepia/warm pass, it becomes the heart of the page. Push for this.

For colleague-group peeks: a flatlay-style image of curated objects from the recipient's career (their actual mug, a printed photo, a pen, a notebook from year 1) photographed by someone and uploaded. If not available, generate the flatlay direction.

## Share-pack defaults

- Email is the primary channel — retirees skew toward email as their preferred medium. Many will print the peek to keep it.
- SMS / iMessage secondary, for spouse-to-spouse intimate retirement peeks.
- IG Story / social share OFF by default. Retirement is intimate; the recipient decides if it goes public.
- DO surface a print-friendly option. Retirees often want to print their peek and frame the note. Make this easy.
- Reveal animation SLOW. The whole page settles. Cards reveal one at a time with deliberate breath. The note holds for a full 4-second beat before the cards begin.
- Schedule-for-date is HIGH-VALUE: many retirement peeks are built to land on the actual last day, or at the retirement dinner.

## Common pitfalls (what to avoid)

1. Never default to "now you can golf!" or "off to the golf course!" tropes. Generic-retirement-aesthetic is the FedEx-Office-banner version. Push for SPECIFIC retiree identity — what HE/SHE specifically did, loves, fears, anticipates.
2. Never propose the gold watch literally. (You can propose a real watch — a Tudor, a vintage Omega, a Cartier Tank — but NEVER framed as "the gold retirement watch." That's the cliché.)
3. Never let the page tip into eulogy register. Retirement is a transition, not an ending. If the curator writes a note that reads as "thank you for your service, goodbye forever," gently redirect: "This is honoring the chapter, but what about the next? Add a line about what comes."
4. Never roast a retiree on something age-coded. "You're slowing down," "you're not as sharp as you used to be," "you're going to be the old man in the corner" — all off-limits even from a close family member.
5. Never assume retirement is wanted. SOMETIMES recipients are retiring because of forced layoffs, health issues, or pressure. If the curator's tone signals ambivalence, drop the celebratory framing entirely and ask: "How is he actually feeling about this — celebrating or just done?"

## Cross-references

- Vibe direction: see \`vibe-direction.md\` — retirement is the "deep + grounded + slow + serif" preset. Heritage-coded.
- Image direction: see \`image-direction.md\` — chapter-coded moments, often using the recipient's early-career photo as hero.
- Rules patterns: see \`rules-engine-patterns.md\` — retirement uses "pick your trip" variant groups frequently. Collab is the highest opportunity here.
- Affiliate strategy: see \`affiliate-strategy.md\` — retirement is high-AOV. Lean Filson, Smythson, Patagonia, Tudor, Pelican, TaylorMade, Eames/Herman Miller, Smythson. Single-barrel bourbon programs (Caskers, Flaviar) wrap through affiliates at decent commission.
- Curator memory: see \`curator-protocol.md\` — colleague-group retirements often involve repeated curators (multiple team members each adding cards). Memory across that group matters.
`;
