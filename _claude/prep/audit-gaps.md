# AUDIT-GAPS — what the 11-agent discovery wave MISSED

> **For the CTO.** READ-ONLY pass over the shared tree (current branch `claude/tender-babbage-ukn6Q`)
> + `git show`/`ls-tree`/`grep` across all 150 refs. Cross-checks md-census's full doc list + the
> "high-value docs" index against what the 11 consolidations (`transcripts, requirements, vision-design,
> mechanics-ir, services-ops, decisions-bugs, zips-deep, provenance-weed, future-roadmap, pantry-tokens,
> md-census`) actually covered. Every claim below is backed by a `branch:path` + a verified fact.
> Nothing was checked out, edited, or committed except this file.

---

## 0. VERDICT (read first)

**MISSING — two material, uncovered source families + three smaller items. The corpus is ~90% complete on
content but has a real structural blind spot: it only enumerated `_packets/**` on ONE branch
(`atelier-integration`) and never enumerated the working-tree `_claude/notes/**` + `_claude/docs/**`
that several of its own agents treat as #1 sources.**

The two brief "hint" targets turned out to be NON-gaps (proof in §4): `DESIGN_ENGINE_TOOLKIT.md` (62,509 B)
was thoroughly mined by `pantry-tokens`; `RECON_RAW.md` (3,586 lines) is a verbatim *code* bundle correctly
classified by `transcripts`/`mechanics`; and there is genuinely **no raw chat transcript anywhere** (re-confirmed).

**MISSING list:**
1. **`_packets/LIEUTENANT/**` (~30 docs) on `claude/bold-ride-Li5zK`** — an entire parallel build-orchestration
   system + **6 research REPORTs** (curator-prompt, curator-tools, cinematic-reveal, grammar-presets,
   depth-layer-ux, landing) carrying unique design rationale. **Not enumerated by md-census; not mined by any agent.**
2. **The working-tree `_claude/notes/{ASSET-MAP,RECON-FINDINGS,SESSION-HANDOFF}.md` + `_claude/README.md`
   + `_claude/docs/{PEEK_GIFT_BUILD,peekgift_product_intent_source_orientation}.md`** — **absent from md-census's
   census** even though `services-ops`, `provenance-weed`, and `requirements` cite them as their top trust source.
3. **The `worktree-agent-a89c9d…:prototypes/mobile-vibe-gallery/`** rendered-on-phone design proof — flagged
   "preserve" by ASSET-MAP, covered by NO prep doc as a design/vision artifact.
4. **`SESSION-HANDOFF §10` operational tells** (e.g. "Ultracode silently flips OFF… tell Frank when you notice")
   — unique, in no consolidation.
5. **The full studio-vnext curator tool DESCRIPTIONS** (`set_page`/`edit_region`/`resolve_card`/…) — partially
   captured by `mechanics-ir` but the **load-bearing verbatim prose** + the prompt-design *rationale* (in the
   LIEUTENANT research) was not. Lower severity; see §3.

---

## 1. THE MISSED LIST (concrete — branch:path · why it matters · which prep doc should own it)

### MISS-1 — `_packets/LIEUTENANT/**` on `claude/bold-ride-Li5zK` (HIGHEST VALUE)

**~30 documents, enumerated by NO agent.** md-census's coverage table lists exactly five branches
(`atelier-integration, studio-vnext, gallant-planck, bold-feynman, peek-clean`). `bold-ride-Li5zK` is not one
of them — `provenance-weed` lists it only as a "DEAD-once-absorbed feeder," and `pantry-tokens` mined its `.ts`
grammar files but **not its `_packets/LIEUTENANT/` doc tree.** Verified `LIEUTENANT` does **not** exist on
`atelier-integration` (`git ls-tree` empty), so the census branch genuinely never carried it.

What it is (all `claude/bold-ride-Li5zK:_packets/LIEUTENANT/...`):
- **`PROTOCOL.md` (24L), `SESSION-PLAYBOOK.md` (131L), `BLAST-PHASE-PRIORITIES.md` (113L)** — the lean/studio-line
  build-orchestration model (a different orchestration regime than atelier's `_packets/PROTOCOL.md`/`MEMORY.md`).
  `BLAST-PHASE-PRIORITIES.md` is a **dated priority/sequencing ledger** ("Source of truth for the order in which
  the orchestrator fires lieutenant briefs once Frank's back") naming what's merged vs. fire-when-ready.
- **21 numbered packet `BRIEF.md`** (`01-spine-thread` … `21-renderer-mobile-fits`) + several `RETURN.md` — the
  forward build queue for the lean line (spine-thread, edge-plumbing, mutation-tools, curator-prompt,
  depth-layer-ui, grammar-presets, mutation-log-schema, cinematic-reveal, landing, auth/checkout bolt-ons,
  canonical-cutover, image-gen, scrape-wired, meter, product-graph-v1, diff-state-sse, history-persist).
- **`_research/{curator-prompt,curator-tools,cinematic-reveal,grammar-presets,depth-layer-ux,landing}/REPORT.md`
  (6 reports, 151/287/143/173/100/118 lines)** — the **design rationale** behind the studio curator brain. These
  are the highest-value uncovered content:
  - `curator-prompt/REPORT.md` — a researched **BASE_PROMPT proposal (~485 words)** with patterns lifted from the
    leaked-system-prompt corpus (Cursor/v0/Bolt/Claude Code): *"Identity is a sentence, not a paragraph,"
    "long 'never say X' lists are an anti-pattern past ~5 items… the ban becomes a menu," "structure earns its
    tokens (1,500–6,000 main budget, load the rest conditionally)," "confirm only on irreversible/expensive moves."*
    This is the *why* behind the deployed SEAT prompt that `vision-design`/`zips-deep` document only as a finished artifact.
  - `curator-tools/REPORT.md` — a **22-tool canonical spec** with design principles (`set_*`/`add_*`/`update_*`
    idempotency, "tools NEVER validate grammar invariants — auto-repair fires before render," "every mutation
    returns enough metadata for a `MutationLogEntry`," "no payment tools — hand off via `mark_ready_to_publish`").
    `mechanics-ir` documents the *final* 7 studio-vnext tools but not this 22-tool design lineage.
  - `depth-layer-ux/REPORT.md` — production K↔L (keyboard↔layer) UX: gestures, haptics, diff-mark vocab, and an
    **iOS 26 `visualViewport` bug warning** — operational detail in no consolidation.
  - `cinematic-reveal/REPORT.md` — confirms the reveal is "rebase onto `--vibe-` tokens, NOT a full rebuild."
  - `landing/REPORT.md`, `grammar-presets/REPORT.md` — chat-as-hero landing concept; the 40-vibe/22-occasion
    ranked map as a research artifact.

**Why it matters:** this is the *missing middle* between the atelier `_packets/SPINE/skills/*` (the pantry,
covered) and the deployed SEAT prompt (covered) — it is the explicit, researched reasoning for the curator
prompt + tool surface, which the CTO will want when ratifying the prompt/tool design. A subset also lives on
`research/depth-layer-ux` (partial: 01/02 + PROTOCOL + the depth-layer REPORT) and feeder refs `lt/*`.
- **Owners:** `mechanics-ir` (the 22-tool spec + mutation-log shape), `vision-design` (the curator-prompt
  rationale + reveal), `future-roadmap` (the 21-brief forward queue + BLAST-PHASE priorities).

### MISS-2 — the working-tree `_claude/notes/**` + `_claude/docs/**` + `_claude/README.md` (CENSUS BLIND SPOT)

These six files are **tracked on the current branch `claude/tender-babbage-ukn6Q`** and are **absent from
md-census's enumeration entirely** (md-census scoped itself to "the five doc-rich branches" and never listed the
workspace branch's own `_claude/` docs). Yet three agents lean on them as primary truth:
- `_claude/notes/RECON-FINDINGS.md` (119L) — **NOT the same file** as `gallant-planck:RECON_FINDINGS.md`
  (1,801L); it is a distinct, condensed "7-agent recon" doc. `services-ops` opens by declaring
  `_claude/notes/{RECON-FINDINGS,ASSET-MAP,SESSION-HANDOFF}.md` its **#1 trust tier**.
- `_claude/notes/ASSET-MAP.md` (125L) — the by-capability `branch:path` harvest map (chat/streaming, rules engine,
  security, ingestion, reveal, checkout, etc.) + the **HORSE RECOMMENDATION** ("ride the atelier frontier:
  `intelligent-brahmagupta` + `peek-clean`… first dollar in days; fold freeform-HTML as v2 AFTER cash"). Cited by
  `provenance-weed` as a source-of-truth. Its capability→source mapping is finer-grained than any consolidation.
- `_claude/notes/SESSION-HANDOFF.md` (138L) — how-to-work-with-Frank + the open horse-pick + **unique operational
  tells** (§10: "Ultracode silently flips OFF… Frank watches a 6pt corner indicator and wants to be told";
  "Develop on `claude/tender-babbage-ukn6Q`"). The Citi/fintech bio detail ("ran systems behind NAM/EMEA mortgage
  flow at Citi") is here in cleaner form than the atelier handoffs.
- `_claude/README.md` (34L), `_claude/docs/PEEK_GIFT_BUILD.md` (522L), `_claude/docs/peekgift_product_intent_source_orientation.md`
  (727L) — `requirements` (S20) and `transcripts` (D5) **do** cite the two `_claude/docs/*` files, so their *content*
  is covered; the **gap is purely the census omission** (the index doesn't list them, so a future agent reading only
  md-census wouldn't know they exist on the live branch).

**Why it matters:** md-census is the master index every downstream agent is told to trust. It silently excludes
the very branch the work is happening on. Anyone re-deriving "what docs exist" from md-census alone misses the
recon notes that two consolidations call canonical.
- **Owner:** `md-census` (must add a Table 6 for the `tender-babbage` `_claude/**` working-tree docs).

### MISS-3 — `worktree-agent-a89c9d578439ebfef:prototypes/mobile-vibe-gallery/`

A real, self-contained design proof: `NOTES.md` + `app-fonts.css` + a `fetch-fonts.mjs` + **self-hosted woff2
font files** (Abril Fatface, Anton, Bowlby One, Caveat, …) — the 40 vibe presets rendered on an actual phone with
self-hosted fonts + a contrast manifest. `ASSET-MAP.md` explicitly says **"Preserve… honest mobile design proof."**
No prep doc covers it: `vision-design`'s mockup census is the 15 hand mockups; `pantry-tokens` cites the 40 presets
from `presets.ts` code, not this rendered artifact. The only `worktree-agent-*` content anyone flagged.
- **Owner:** `vision-design` (rendered-caliber proof) and/or `pantry-tokens` (the presets, realized).

### MISS-4 — `SESSION-HANDOFF.md §10` operational tells (subset of MISS-2, called out)
"Ultracode silently flips OFF" indicator-watching, the push-branch instruction, "`_claude/` is the isolated
workspace." Pure operating-context, in no consolidation. **Owner:** `decisions-bugs` (§3 working-rules).

### MISS-5 — the studio-vnext curator tool DESCRIPTIONS, verbatim (LOWER severity — PARTIAL coverage)
Brief point (3) asked specifically for "the actual `set_page`/`edit_region` tool descriptions." `mechanics-ir`
§2.3 **does** list the 7 tools and paraphrases them, but the load-bearing verbatim prose is only lightly quoted.
For the record, the actual text (`claude/studio-vnext:apps/web/lib/curator/tools.ts`):
- `set_page`: *"Author the WHOLE page as one freeform HTML document and show it. Call this FIRST so the page
  appears whole; it streams… Include your own fonts (a Google Fonts <link>), a <style> block, bespoke CSS +
  CSS/SVG animation. Tag every interactive/claimable thing with the data-peek-* contract. Decoration is CSS/SVG
  only — never emit a <script>."*
- `edit_region`: *"Replace exactly one matched node's markup — the smallest surgical edit that honors the object.
  Use for a tweak ('add the soup', 'change the headline'); never re-author the whole page for a small note."*
- `resolve_card`, `set_style`, `set_media`, `generate_hero_image`, `publish` — all carry similarly load-bearing
  prose (publish: *"Flag the page ready → triggers the $12 checkout. Call when the page is useful… not perfect."*).
- This is **covered enough to not block**, but the *design rationale* for these (the 22-tool research) is MISS-1.
- **Owner:** `mechanics-ir` (already owns the tools; add the verbatim descriptions + the MISS-1 lineage).

---

## 2. RAW TRANSCRIPT — re-confirmed ABSENT (brief point 2)

The brief asked to confirm-or-find a verbatim transcript. **Re-confirmed: none exists.** Evidence:
- `git ls-tree` across all 150 refs for `transcript|monologue|*.vtt|*.srt` → **0 files** (only `prep/transcripts.md` itself).
- Every `gabagool` hit across all branches is the **system-prompt safeword definition**, not speech — e.g.
  `atelier-integration:atelier/lib/anthropic/system-prompt.ts:178` and `_packets/40-prompt-caching/prompt.md:161`
  are byte-identical guardrail-escape blocks, not monologue.
- `2026-05-29` mentions resolve to the processed vision docs (`REQUIREMENTS_SPEC.md`, `BACKEND_SERVICES.md`,
  `backendservices-revised.md`) + `RECON_FINDINGS.md` — all derived/recompiled, none verbatim dialogue.
- `transcripts.md` already nailed this (BRAIN-DUMP is the rawest voice; Citi stories gone with the lost 05-29 raw).
  **No correction needed.** The only *new* raw-ish voice surfaced is `SESSION-HANDOFF.md`'s cleaner Citi line (MISS-2/4).

---

## 3. CODE-ONLY SIGNAL — checked (brief point 3)

`mechanics-ir` **did** mine the studio-vnext code (`apps/web/lib/curator/{tools,system-prompt,extract,pantry,
exemplar,prompt,turn,draft,page-html}.ts`), `pantry-tokens` mined the grammar/IR code, `zips-deep` mined the
SEAT prototype JS, and `decisions-bugs`/`ASSET-MAP` mined the atelier `lib/anthropic/*`. The curator prompt +
tools that the brief worried "live only in code" **are captured at the artifact level.** The genuinely-uncovered
code-adjacent signal is the **rationale** (MISS-1's `_research/` REPORTs) and the verbatim tool prose (MISS-5).

---

## 4. NON-GAPS — the brief's hints that proved FALSE (proof, so they aren't re-chased)

| Brief hint | Reality | Evidence |
|---|---|---|
| `DESIGN_ENGINE_TOOLKIT.md` "62KB, unread" | **READ thoroughly** | File = **62,509 B**. `pantry-tokens` §1–§6 quotes it verbatim (17 font groups, 10 pairing presets, 20 palettes, 10 WORLDS, type-art CSS, scenes/motifs/frames, §10 resolver). Cited as "the single richest pantry document." |
| `RECON_RAW.md` (unread) | **Classified, not a transcript** | 3,586L; its own header: *"verbatim file dumps… every file `cat`'d from `bold-feynman`."* It's a **code** bundle (lib/ir, system-prompt.ts) `mechanics-ir`/`pantry` covered from source. `transcripts.md §1e` already filed it correctly. |
| "any `BRAIN-DUMP*` not captured" | **Captured** | `transcripts.md` S1 is `_packets/BRAIN-DUMP.md` (rawest voice, 2026-05-26), quoted verbatim. |
| "`CURATOR-FLOW-AUDIT` not captured" | **Captured** | `decisions-bugs` cites `atelier:_packets/SPINE/CURATOR-FLOW-AUDIT-2026-05-28.md` (INFRA-3/INFRA-6 anon-wall findings). |
| "`MEMORY.md` addenda not captured" | **Captured** | `decisions-bugs` quotes MEMORY Addenda XIII/XVII (the framework flip-flop), §0 rules, Z-addenda. |
| in-site-chat-buildout docs as unique | **Dup of studio-vnext** | `in-site:BUILDOUT-STATUS.md` byte-identical to `studio-vnext`'s (verified `diff`); only its `WAKEUP` differs and `provenance-weed` covers that. |
| `wave2-prompt-rewrite-proposal` as a unique prompt proposal | **Old packet snapshot** | Carries pre-archive `_packets/{AUDIT,COMMENTS,ORCHESTRATOR-NOTES,CONCEPT-V2}.md` + numbered packet prompts; its `NOTES.md` is the Clerk auth rip-out note (= `atelier:NOTES.md` family). No unique prompt. |

---

## 5. CROSS-CHECK METHOD (so the CTO can re-run)

- Enumerated all **150 refs** (`git for-each-ref refs/remotes`); 2 local (`tender-babbage`, `youthful-ramanujan`).
- Diffed md-census's branch list (5) against branches carrying unique `_packets/**` or top-level doc families →
  found `bold-ride-Li5zK` (LIEUTENANT) + `research/depth-layer-ux` (partial LIEUTENANT) + `lt/*` +
  `worktree-agent-a89c9d` carry doc content md-census never enumerated.
- `git ls-files _claude/` on the current branch → found 6 working-tree docs absent from md-census's tables.
- Verified each "high-value docs" index entry in md-census is owned by a consolidation (all are, except the
  census's own omission of the workspace `_claude/**`).
- Raw-transcript sweep: filename match + `gabagool`/`2026-05-29` content grep across all 150 refs → confirmed absent.
- Confirmed brief hints (toolkit size, RECON_RAW nature, tool descriptions) by direct `git show`.

---

## 6. SEVERITY-RANKED ACTION FOR THE CTO

1. **Mine `bold-ride-Li5zK:_packets/LIEUTENANT/_research/*/REPORT.md` (6 files)** — the curator-prompt + curator-tools
   design rationale is the one body of *reasoning* the corpus is missing; it directly informs ratifying the
   prompt/tool surface. (MISS-1)
2. **Have `md-census` add the working-tree `_claude/notes/**` + `_claude/docs/**` + `README.md` to its index** so the
   master doc list is honest; tag `_claude/notes/RECON-FINDINGS.md` as DISTINCT from gallant's 1,801-line file. (MISS-2)
3. **Capture the `mobile-vibe-gallery` prototype as the realized-on-phone caliber proof** (MISS-3) and the
   `SESSION-HANDOFF §10` operational tells (MISS-4) — both small, both unique.
4. Tool-description verbatim (MISS-5) is a nice-to-have; the tools are already documented.

**FINAL VERDICT: MISSING — [`bold-ride-Li5zK:_packets/LIEUTENANT/**` (esp. the 6 `_research/*/REPORT.md`);
working-tree `_claude/notes/{ASSET-MAP,RECON-FINDINGS,SESSION-HANDOFF}.md` + `_claude/README.md` + `_claude/docs/*`
(census omission); `worktree-agent-a89c9d…:prototypes/mobile-vibe-gallery/`; `SESSION-HANDOFF §10` tells].**
Everything else in the brief's hint list is a NON-gap (proven §4). Raw transcript: confirmed absent (§2).
Code-level curator prompt/tools: captured at artifact level, rationale missing (§1/§3).
