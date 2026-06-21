# Mitti — handmade stoneware storefront (mockup)

A self-contained e-commerce mockup for a fictional small-batch pottery studio,
**Mitti** (मिट्टी — Hindi for *earth / clay*). Indian-inspired artisanal direction:
terracotta, Jaipur blue, marigold and Longpi black glazes, Fraunces + Mukta type,
and a full shopping journey with **mocked Clerk auth and Stripe checkout** so the
backend services read as "live" without any real keys.

Nothing here touches the surrounding Next.js app — it's plain HTML/CSS/JS you can
double-click open.

## What's in it
```
mockup/
  index.html        storefront shell (home, shop, product, checkout, confirmation)
  styles.css        the whole look
  app.js            views, cart, mocked Clerk + Stripe flow
  lib/art.js        procedural hand-thrown-vessel SVG generator (shared with the film)
  lib/catalog.js    the 10-piece product catalogue (shared with the film)
  demo/
    mitti-demo.mp4  narrated demo film (sultry female voiceover)
    frames/         one storyboard still per scene (PNG, 1920×1080)
```

## View it
- **Storefront:** open `mockup/index.html` in any browser, or serve the folder:
  `npx serve mockup` → http://localhost:3000
- **The journey:** Home → *Shop the collection* → click a piece → pick a glaze →
  *Add to cart* → cart drawer → *Checkout* (Clerk banner + Stripe card field) →
  *Pay* → "Off to the kiln-room" confirmation.

## The vessels are generated, not photographed
Every pot is drawn at runtime by `lib/art.js`: a procedural "throwing profile" is
smoothed into a silhouette, filled with a hand-mixed glaze gradient, speckled with
deterministic stoneware fleck, and finished with a rim, sheen and contact shadow.
The same generator draws the pots in the demo film, so the shop and the video share
one visual language.

## The demo film
`demo/mitti-demo.mp4` is rendered entirely offline — no screen recorder, no cloud:
- scenes authored as animated SVG (`video/`), rasterized with **sharp**,
- voiceover synthesized with **Piper** (neural TTS), pitch-shifted and warmed for a
  sultry tone via **ffmpeg**, mixed under a soft ambient pad,
- encoded to H.264 with a static ffmpeg.

Rebuild it with `node video/build.js` (see `video/README.md`).
