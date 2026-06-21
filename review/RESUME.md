# RESUME HERE — Session Handoff (read this FIRST)

> Purpose of this file: a fresh agent reads **only this file + the two review docs** and is
> instantly at full speed — no `git log` forensics, no re-reading the 2,500-line transcription,
> no token waste. Context gets summarized/reset often; this file is the durable memory.

## THE JOB
Seller-side, line-by-line legal pre-review of a **buyers' offer** on **115 Browns Dock Rd,
Atlantic Highlands, NJ 07716** (a 33-page packet: survey, 2 proof-of-funds, MLS sheet,
NJ Form 140 disclosure, and the Form 118 Statewide Contract of Sale).
- **Our client = the SELLERS:** Frank DeAndino (sole titleholder; himself a licensed NJ RE
  salesperson) and his wife Dorothy ("Dory") DeAndino.
- **Buyers:** Keith Cardona & Danielle Puopolo Cardona (280 River Rd, Red Bank NJ 07701),
  e-signed via dotloop 06/19/26. Buyers' agent: Colleen Antoon (Resources Real Estate).
- **Goal:** (1) lock a 100%-accurate transcription — *one wrong digit can poison a conclusion*;
  (2) produce a tight, bare-bones, seller-protective markup to hand the attorney a strong first turn.

## FRANK'S DIRECTIVES (the lens)
- **Strict, just-the-facts markup.** Nothing in the doc that doesn't need to be there.
- **Insulate Dorothy** from all unnecessary exposure (she owns nothing; bought pre-marriage).
  DECISION = Option A: strike her as a named "Seller," add §43 provision so she joins the deed
  *only* to release her N.J.S.A. 3B:28-3 right of joint possession, with no reps/warranties.
- **Negotiate from strength.** Buyers want THIS house and can pay; $750k is a tactical lowball
  ($144,900 / 16.2% under the $894,900 list). Danielle is the decision-maker (signed first).
- **Accuracy is paramount** — Frank explicitly authorized unlimited subagent spend to re-rip the
  whole packet twice and reconcile until provably clean. Do not cut that corner.

## ⚠️ CRITICAL WARNINGS
1. **`/tmp` IS EPHEMERAL.** Source images (`/tmp/pages_full/`), per-page passes (`/tmp/trans/`),
   and the text export (`/tmp/full.txt`) DIE on container reclaim. Everything needed has been
   copied into the repo (see File Map). If `/tmp` is empty on resume, work from the repo copies.
2. **Page 20 trips the output content filter.** Two subagents got "output blocked by content
   filtering policy" transcribing it (it's just the anodyne attorney-review NOTICE page). The
   orchestrator (me) was likely reset from eating repeated blocked-output events. **Do NOT send a
   subagent to transcribe page 20** — read `p-20.png` yourself and/or use the committed
   `review/passes/p20_FINAL.txt` (if present). Page 20 material content: Item 1 agency box =
   "the buyer, not the seller"; buyers e-signed (Keith 6:25 PM / Danielle 6:22 PM 06/19/26);
   seller lines blank; prepared by Colleen Antoon.
3. **Name resolved:** §1/p21 = **"DeAndino"** (correct, deed spelling). §32/p32 typo = "DiAndino."
   Markup: correct §32 to DeAndino. Don't re-litigate.

## STATUS — WHERE WE ARE
> ✅ CONVERGED 2026-06-21: **TRANSCRIPTION LOCKED & VERIFIED — 3 independent diff/audit rounds, discrepancies 20→3→0.** Waves 4 (reconcile A-vs-B) + 5 (independent
> falsification audit) + convergence re-verify COMPLETE across all 32 pages. Authoritative source =
> the 32 `review/passes/pNN_FINAL.txt` + rebuilt `review/full-packet-transcription.md`. The old A/B
> pass files remain for provenance. **NEXT PHASE:** finish line-by-line legal markup (pp.23-33 detail
> still thin in `contract-line-by-line.md`; pp.20-22 + key findings done).
- **Re-rip COMPLETE.** Every page (1–33; p3 blank) has TWO independent transcription passes
  `_A` + `_B` in `review/passes/`. Page 20 done by hand (filter issue above).
- **Pending = RECONCILIATION (the step that actually catches errors).** For each page: diff
  `pNN_A.txt` vs `pNN_B.txt`, plus `source-text-export.txt` (machine text of all *printed* text)
  and the source image for handwriting/checkboxes; resolve every MATERIAL token disagreement
  (numbers, $, names, dates, checkbox states, fill-ins) by zooming; write a locked
  `pNN_FINAL.txt`; then rebuild `review/full-packet-transcription.md` from the FINALs.
- After transcription is locked, finish the line-by-line markup (pages 23–33 detail still thin
  in `contract-line-by-line.md`; pages 20–22 + key findings are done).

## HOW TO RESUME (keeps orchestrator context lean)
Run ONE subagent per page. Each reads `review/passes/pNN_A.txt`, `pNN_B.txt`, the matching slice
of `review/source-text-export.txt`, and the source image; returns **only** the material
disagreements + how each resolved (NO prose dumps). Orchestrator adjudicates leftovers by zoom,
then writes `pNN_FINAL.txt`. Batch ≤18 subagents per message.

## KNOWN OPEN DISCREPANCIES (resolve during reconciliation)
- **p4 High School:** pass-A "Rumsey School" vs conclusions-doc "Rumson" vs text-export
  **"Ranney School"** → text export is authoritative for printed text; verify = Ranney.
- **p4 Pool field:** MLS body says "Pool: No" in tax block but "Pool: In Ground; Vinyl" in
  features — reconcile (the No is the *tax-assessment* pool flag; physical pool exists, confirmed
  by disclosure p11 in-ground pool + survey). Note both, don't treat as contradiction.
- Sweep every `_A` vs `_B` for digit/checkbox drift; agents flagged minor uncertain tokens in
  their summaries (footer revision dates 03/2025.2 vs 05/2025.2 vary by page — verify per page).

## FILE MAP (all in repo, branch `claude/line-by-line-review-7we3qa`)
- `review/RESUME.md` — this file.
- `review/contract-line-by-line.md` — legal markup + KEY FINDINGS + POF reconciliation (conclusions).
- `review/full-packet-transcription.md` — assembled transcription (currently pass-A based; to be
  rebuilt from FINALs after reconciliation).
- `review/passes/pNN_A.txt` / `pNN_B.txt` — the two independent passes per page (ground truth input).
- `review/source-text-export.txt` — machine text export of the packet (authoritative for PRINTED text;
  blank for handwriting/checkboxes/signatures).
- Source images: `/tmp/pages_full/p-NN.png` (+ `hi-1-01`, `hi-2-02`, `hi-19-19` hi-res). **Ephemeral**
  unless committed — check `review/images/` first on resume.

## KEY FACTS ALREADY LOCKED (don't re-derive)
- Survey: Block 840, **Lot 97**, **47,205 sq ft / 1.08 ac** (vs misleading MLS "90×125").
- §2 Price: Total **$750,000** | Initial deposit $35,000 (thin, 4.67%) | Balance $715,000. Cash deal.
- §3 Mortgage contingency: **entirely blank** = all-cash, no financing contingency (good for seller;
  make explicit per markup 3a).
- §43 (negotiation core): cash/no-mortgage; **buyer obtains CO**; **buyer cancel-rights** if oil tank /
  soil contamination / septic non-permittable / fix > **$65,000** (= biggest seller risk); buyer does
  yard-debris/shed removal; offer conditioned on seller completing + signing Disclosure + Lead Paint.
- **Form 140 disclosure (pp5–18) is UNSIGNED** — all seller signature/date blocks blank. To-do for Frank.
- POF: #1 Capital One ...6202 = **$135,671.44** (Apr 2026, "page 1 of 3"); #2 Synchrony ...1021 =
  **$488,178.21** (stmt end 06/07/2026, "page 1 of 4"). BOTH names "**Puopolo**" not "Cardona"
  (Danielle = Danielle Puopolo Cardona; $488k likely her father's acct). Documented total
  **$623,849.65 → ~$126k SHORT of the $750k offer.** → demand POF for full price in buyers' own names.
