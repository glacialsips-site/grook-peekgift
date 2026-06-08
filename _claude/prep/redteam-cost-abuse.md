# RED-TEAM — COGS & ABUSE: where "really good pencils, sold cheap" breaks

> Adversarial review for the CTO. The job is to BREAK the economics, not bless them. READ-ONLY pass over `apps/web/app/api/curator/route.ts`, `apps/web/lib/curator/turn.ts`, `apps/web/app/api/upload/route.ts`, `apps/web/lib/ports/image.ts`, `apps/web/lib/curator/prompt.ts`. Pricing is REAL Opus 4.8 (`claude-api` skill, cached 2026-05-26), not guessed.
>
> **Verdict: the $12 fee does NOT durably cover COGS, and the cost surface is wide open to a scripted attacker. Both are fixable, but as-built today this fails the "sold cheap and still positive" test.**

---

## 0. THE PRICES I'M COMPUTING AGAINST (real, not memory)

| Model | Input $/1M | Output $/1M | Cache write (5m, 1.25×) $/1M | Cache read (0.1×) $/1M |
|---|---|---|---|---|
| **Opus 4.8** (`claude-opus-4-8`) | $5.00 | $25.00 | $6.25 | $0.50 |
| Sonnet 4.6 (`claude-sonnet-4-6`) | $3.00 | $15.00 | $3.75 | $0.30 |
| Haiku 4.5 (`claude-haiku-4-5`) | $1.00 | $5.00 | $1.25 | $0.10 |

**fal `flux/schnell`** (the wired model, `lib/ports/image.ts`): ~**$0.003/megapixel** published rate. At the wired sizes: 16:9 1280×720 ≈ 0.92MP ≈ **$0.003**; 1:1 1024×1024 ≈ 1.05MP ≈ **$0.003**. schnell is the *cheap* Flux — note this is NOT "fal at max" (see §5). Round to **$0.003–0.005/image**.

**The verified code constants that drive everything:**
- `turn.ts:14` `MODEL = "claude-opus-4-8"` — hardcoded, no dial. (`route.ts` constructs `new Anthropic()` directly; there is no `LLMPort` indirection on this path.)
- `turn.ts:15` `MAX_HOPS = 12` — up to 12 Opus round-trips per user turn.
- `turn.ts:42` `max_tokens: 32000`, `thinking: {type:"adaptive"}`.
- `prompt.ts:22-23` system = **4 `cache_control:{ephemeral}` blocks** → the system IS prompt-cached (good — this is the one thing working in our favor).
- `route.ts:31` `POST` — **no auth, no rate-limit, no botGate, no captcha**. Only guard is `if (!process.env.ANTHROPIC_API_KEY)`.
- Curator route writes **no `usage_ledger` row** — zero server-side cost metering on the paid path (confirms prior Z8). We are blind on spend.

**Cached-system token estimate:** the 4 cached blocks (`PEEK_METHOD` + `PEEK_PANTRY` 44KB + `FEWSHOT`/exemplar 11KB + `PEEK_CONTRACT`) are ~72KB of source string. Conservative estimate **≈ 18K tokens** of cached system. On Opus 4.8 that's a **$0.1125 cache-write** the first time and **$0.009 cache-read** every turn after, per 5-minute window.

---

## 1. PER-PEEK COGS — and where it goes underwater

A "completed peek" = collection chat to gather intent → the model authors the page via `set_page` (+ N `edit_region`/`set_style` refinements) → M `generate_hero_image` → publish. Every hop is a **full Opus 4.8 call at max_tokens 32000, adaptive thinking ON**, carrying the **18K cached system + the entire growing message history** (each hop re-sends prior assistant `set_page` HTML — which is large — as input).

### The per-hop cost (Opus 4.8, conservative)
- Cached system read: 18K @ $0.50/1M = **$0.009**
- Uncached input (history + tool results; grows every hop — early hops ~3K, later hops carry 10–30K of prior HTML): model **~12K avg uncached input** @ $5/1M = **$0.060**
- Output: `set_page` emits a **full bespoke HTML page** — a real art-directed page is 6K–15K tokens; adaptive thinking adds more billed output. Model **~10K output avg** @ $25/1M = **$0.250**, plus thinking tokens (adaptive, billed as output) realistically **+4K** = **+$0.100**.

**→ a single meaty Opus hop ≈ $0.42.** A trivial text-only hop (no `set_page`) ≈ $0.08.

### A realistic "good" completed peek
A real session is not one hop. Intent gathering (2–3 light hops), the big `set_page` author (1 heavy hop), then refinement ("darker," "different font," "make it pick-one," "add a soup option" — each a `set_page` or `edit_region` re-author). Call it:

| Component | Count | $/unit | Subtotal |
|---|---|---|---|
| Light chat hops (no re-author) | 3 | $0.08 | $0.24 |
| Heavy author/refine hops (full `set_page`) | 4 | $0.42 | $1.68 |
| `generate_hero_image` (fal schnell) | 2 | $0.004 | $0.008 |
| First-turn cache write (one-time) | 1 | $0.1125 | $0.11 |
| **TOTAL per completed peek** | | | **≈ $2.04** |

**Against the $12 fee: gross margin ≈ $9.96 (83%).** That sounds fine — and it is, *for a disciplined single user*. The economics do not die on the average peek. **They die on the tail and on abuse**, because nothing in the code bounds the tail.

### Break-even: how many refinements sink one peek
Each additional heavy `set_page` refinement hop ≈ **$0.42** (and *rises* as history grows — later hops re-send all prior HTML as uncached input, so a 20th refinement hop is closer to **$0.70–0.90**). Hold images aside (they're nearly free here):

- The **$12 fee** covers roughly **$12 / ~$0.55 avg-heavy-hop ≈ 21 heavy re-authors** before the peek is gross-margin-negative on compute alone.
- That is **one indecisive creator** in a single sitting: "darker… no, warmer… actually the first one… change the font… now the other font… group these… ungroup… make it loud… too loud." Each "again" is a full Opus 4.8 page re-author at 32K max_tokens. Twenty rerolls is a believable bad session, not an attack.
- **And there is no cap on hops-per-session, sessions-per-user, or peeks-per-user.** A creator can open the studio, never pay, and reroll indefinitely. Only completed *publishes* pay; **all the COGS is incurred pre-paywall.** The $12 is collected at publish, but the compute is spent during authoring whether or not they ever publish. **Most COGS is on unpaid drafts** (live DB: 50 peeks, 0 publishes, picks=0 — every cent of Opus spend to date produced $0).

> **The structural problem:** the fee is charged at publish; the cost is incurred at authoring; nothing ties the two. A peek that never publishes costs $2–10 and earns $0. At the current 0% publish rate that's not a margin, it's pure burn.

---

## 2. THE TRIGGER ("enough info OR show me") — the reroll hole

The expensive Opus `set_page` fires on a config-dialable trigger (enough-info OR explicit "show me"). **Worst case: a user re-rolling "show me" 20×.** In the code as built, "show me" → another `runCuratorTurnStreaming` → up to 12 Opus hops → at least one full `set_page` re-author. There is:

- **No hard ceiling** on re-authors per peek anywhere in `route.ts` or `turn.ts`. `MAX_HOPS=12` caps hops *within one HTTP turn*, not turns-per-peek. A client just POSTs `/api/curator` again with the growing `messages[]`.
- **20× "show me"** at the rising-cost heavy hop (history grows each time, so input cost climbs) ≈ **20 × ~$0.65 ≈ $13** of Opus on a **single unpaid draft**. One bored user with the studio open exceeds the $12 fee before ever hitting publish.
- **The conflict with "never cap without usage data":** Frank's rule (MEMORY §0 #9) forbids arbitrary caps — and the prior $0.05/24h anon cap (INFRA-3) was the cited violation that "cripples the trial." So we cannot just slam a turn cap on. **The resolution is not a cap — it's making rerolls cheap** (see mitigations: model-dial the refine path to Sonnet, cache the prior HTML as a prefix, and meter so the cap that eventually lands is data-derived, not gut-feel). Today we have *neither* a cap *nor* metering *nor* a cheap-reroll path — the worst of all worlds.

---

## 3. ABUSE — `/api/curator` is OPEN and UNAUTHENTICATED (audit-verified)

**Verified in `route.ts`:** the only precondition is the API key existing. No Clerk check, no rate-limit, no `botGate`, no Turnstile, no per-IP throttle, no anon metering. `curatorId` falls back to `"anon"` (`draft.ts:5`). There is **no `middleware.ts`/`proxy.ts` in `apps/web`** (verified by find). **This is a public, unauthenticated endpoint that spends Opus 4.8 at $0.42/hop on demand.**

### Cost of one scripted attacker before Turnstile exists
A trivial `curl` loop POSTing `{messages:[{role:"user",content:"build me a wild full-page site, show me"}]}`:

- Each request → up to 12 Opus hops, at least one 32K-max_tokens `set_page`. Realistic **$0.50–$1.50 per request** (a single request that triggers a few authoring hops).
- The route is an SSE stream with `maxDuration=120` — an attacker doesn't even need to read the response; fire-and-forget.
- **Concurrency is unbounded.** 100 parallel workers × 1 req/2s × $0.75 = **$3,750/hour ≈ $90K/day** of Opus spend, attributable to nobody, earning $0.
- Even a single naive script at 1 req/sec ≈ **$2,700/hour**. A script kiddie with a $5 VPS bankrupts the Anthropic bill in an afternoon. **"Open chat = open wallet"** is literal and live the instant a key is on the deploy.

### Is bot-gate at Ch5 too late? — YES. Move it to Ch0/Ch1.
The build plan puts `botGate`/Turnstile in **Ch5 (harden)**, after the studio (Ch2) and recipient loop (Ch3) light up generation against a real key. **That ordering is the single most dangerous sequencing decision in the plan.** The moment Ch2 deploys with a live `ANTHROPIC_API_KEY` (and it must, to demo the studio on a phone per the Ch2 gate), the open endpoint is exploitable for 3 chapters. The Ch2 gate *requires* a keyed deploy; the protection doesn't arrive until Ch5. **Botgate + a per-IP/session rate-limit must be a Ch0/Ch1 deliverable — before the first keyed deploy of the curator route, full stop.** It's free (Cloudflare Turnstile) and it's the difference between a controlled demo and an open money-burn.

---

## 4. OPUS-HARDCODED vs THE DIAL — the cost of NOT having the dial during build/test

The plan's call #4 is "model dialable, not hardcoded… drop-to-Sonnet is a flag." **The code does not honor this.** `turn.ts:14` is a literal `const MODEL = "claude-opus-4-8"` and `route.ts` `new Anthropic()` calls it directly — there is no `LLMPort`, no env switch, no per-op routing on this path. Consequences:

- **The dial doesn't exist yet, so every build/test iteration is full Opus.** Ch2 ("a real one-line brief → a page authored live, screenshotted on a phone — and it beats the zip") is exactly the chapter where the team will run *hundreds* of authoring iterations to tune the prompt and clear the aesthetic bar. At ~$0.42–$2/iteration on Opus, **prompt-tuning Ch2 alone is plausibly $100s–$1000s of Opus**, all on the dev's own dime, all avoidable.
- **Non-creative ops are paying Opus rates.** Frank's explicit rule: "don't burn Opus to read a price tag" — Sonnet/Haiku for vision/extract/classify. But the collection-chat hops (intent gathering, "is this enough info?", reading a pasted URL) all run on Opus 4.8 here. Routing the *chat/extract* hops to Sonnet 4.6 ($3/$15 vs $5/$25 — ~40% cheaper input, 40% cheaper output) or Haiku 4.5 ($1/$5 — **80% cheaper**) and reserving Opus for the actual `set_page` author would cut the per-peek light-hop cost from $0.08 to ~$0.02 (Haiku), and make the 20× reroll attack ~3–5× cheaper to absorb.
- **Not having the dial *is itself* the cost.** Every day the curator path is Opus-only is a day the reroll hole (§2) and the abuse surface (§3) are 1.6–5× more expensive than they need to be. The dial isn't a Ch4 optimization; it's a Ch1 cost-control primitive.

---

## 5. fal AT MAX (owner-flagged) — and it's UNGATED

Two things, both verified in `lib/ports/image.ts`:

1. **It is NOT at max today.** The wired model is `fal-ai/flux/schnell`, `num_inference_steps: 4` — the *cheapest, fastest* Flux tier (~$0.003/image). "fal at max" (the owner flag) would mean flux-**pro**/ultra or image-to-image face-insert (flux dev/pro img2img), which run **~$0.04–$0.05/image** — a **10–15× jump**. At max, 2 images/peek goes from ~$0.008 to ~$0.10; not fatal per peek, but it changes the abuse math: an attacker hammering `generate_hero_image` at flux-pro rates burns ~$0.05/call with **no cap on images-per-session**.
2. **It is gated by NOTHING — and safety is explicitly OFF.** `enable_safety_checker: false` (line 33). Combined with **image moderation being ABSENT** (services-ops §1C — text moderation via Haiku exists, image path does not) and the recipient page being a **public shareable link**, this is a brand/legal landmine: a user (or attacker) can drive `generate_hero_image` to produce unsafe content with the provider's own safety checker disabled, then publish it on a public `/g/<slug>`. **`generate_hero_image` has no per-session/per-peek count limit and no content gate on either side (input prompt or output image).** Cost-wise it's cheap today; risk-wise it's a Ch3 blocker, not a Ch5 one.

---

## RANKED FINDINGS + MITIGATIONS

| # | Finding | Impact | Mitigation | Class |
|---|---|---|---|---|
| **1** | `/api/curator` is OPEN/unauthenticated; one scripted attacker burns **~$2,700–$90K/day** of Opus; bot-gate is parked at Ch5, 3 chapters after the first keyed deploy. | Catastrophic, unbounded, attributable to nobody. | **Move botGate+Turnstile and a per-IP/session rate-limit to Ch0/Ch1 — gate the route BEFORE the first keyed deploy.** Free. The Ch2 phone-demo gate forces a keyed deploy; protection must precede it. | **STRATEGIC** (sequencing) |
| **2** | Most COGS is on **unpaid drafts** — fee is charged at publish, compute spent at authoring, nothing ties them; live publish rate is 0%, so 100% of Opus spend to date earned $0. The reroll hole (20× "show me" ≈ $13) exceeds the $12 fee on a single draft. | The unit economics are negative on any non-publishing or indecisive session; the cheap-pencil thesis fails on the tail. | **(a)** Model-dial the refine/chat path to Sonnet/Haiku NOW (§4); **(b)** cache the prior `set_page` HTML as a prompt prefix so a reroll re-reads instead of re-pays input; **(c)** meter every hop to `usage_ledger` so a *data-derived* soft cap can land later (not a gut-feel one). | **STRATEGIC** (model) |
| **3** | Opus hardcoded (`turn.ts:14`); the promised dial doesn't exist. Build/test (esp. Ch2 prompt-tuning, hundreds of iterations) and all non-creative chat hops pay full Opus — burning $100s–$1000s avoidably and making #2/#1 1.6–5× more expensive. | Ongoing, compounding, self-inflicted burn during the most iteration-heavy chapter. | Introduce `LLMPort` + env model switch on the curator path in **Ch1**; route chat/extract → Haiku/Sonnet, reserve Opus 4.8 for `set_page` author only. Use a cheap model for prompt-tuning loops. | **TACTICAL** |
| **4** | `generate_hero_image` ungated both ways: `enable_safety_checker:false` + no image moderation + public `/g/<slug>` + no per-session image count cap. "fal at max" is a 10–15× cost jump with the same zero gating. | Brand/legal event on a public link; cost amplifier under abuse if dialed to flux-pro. | Re-enable the safety checker (or add image moderation — Hive/Rekognition) **before any public publish (Ch3, not Ch5)**; cap images/peek; keep schnell (not max) until there's a reason. | **TACTICAL** (cost) / **STRATEGIC** (risk timing) |
| **5** | Zero cost metering on the paid path — curator route writes no `usage_ledger`. Flying blind on spend; can't detect the attack in #1 or set the data-derived cap in #2. | You won't see the burn until the Anthropic bill. | Append a `usage_ledger` row per hop (input/cached/output tokens + model + curatorId + IP). Cheap, and it's the prerequisite for honoring "no cap without usage data." | **TACTICAL** |

---

## CHAT-RETURN SUMMARY

- **File:** `/home/user/grook-peekgift/_claude/prep/redteam-cost-abuse.md`
- **Per-peek $ estimate (real Opus 4.8 pricing):** a disciplined completed peek ≈ **$2.04** (margin ~83% on $12 — *fine on average*). But break-even is **~21 heavy re-authors**, and at the live **0% publish rate every dollar of Opus has earned $0** because COGS is incurred pre-paywall on drafts that never pay. A single 20× "show me" reroll ≈ **$13 — already underwater vs the $12 fee, on one unpaid draft.**
- **Top 3:** (1) **`/api/curator` is open + unauthenticated — bot-gate parked at Ch5 is 3 chapters too late; a script burns ~$2,700–$90K/day. Move it to Ch0/Ch1.** (2) **Fee charged at publish, COGS spent at authoring, nothing ties them — negative unit economics on the tail; the reroll hole exceeds the $12 fee on one draft.** (3) **Opus hardcoded — the promised dial doesn't exist, so build/test and all non-creative hops over-pay and amplify #1/#2.**
- **WORST:** the **open unauthenticated curator endpoint** (#1). It is live cost-burn the instant a key deploys, unbounded, un-metered, and the plan doesn't protect it until Ch5 — while the Ch2 gate *forces* a keyed deploy. This is the finding that kills "really good pencils, sold cheap": you can't sell cheap pencils if anyone can run your factory for free.
