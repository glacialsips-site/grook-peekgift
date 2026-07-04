# Cold Curtain — Technical Annex (Rev 0.1)

Backing detail for the executive brief (DWG CC-100). Each section answers a
"where does that number come from" question. All figures engineering-estimate
class pending pilot validation.

---

## A. Corridor ranking methodology

Priority score = P(recurrence) × V(insured value at risk) ÷ C(build cost).
Proxy used at this stage: historical insured loss ÷ build estimate
("protection ratio"), since historical loss already embeds recurrence ×
value. Build estimate = defended length × $7M/km midpoint + interior spokes.

| # | Corridor | Line | Defended | Build est. | Hist. insured | Ratio |
|---|---|---|---|---|---|---|
| 1 | Palisades–Malibu CA | Southern Front | ~29 km | $200M | $25B | 125:1 |
| 2 | Paradise / Sierra foothills CA | Sierra Foothill | ~16 km | $110M | $12.5B | 114:1 |
| 3 | Santa Rosa / Sonoma–Napa CA | North Bay | ~21 km | $150M | $13B | 87:1 |
| 4 | Altadena / San Gabriel front CA | Southern Front | ~17 km | $120M | $9B | 75:1 |
| 5 | Oakland–Berkeley Hills CA | North Bay | ~13 km | $90M | $4B | 44:1 |
| 6 | San Diego backcountry CA | Southern Front | ~21 km | $150M | $4B | 27:1 |
| 7 | Boulder corridor CO | — | ~11 km | $75M | $2B | 27:1 |
| 8 | Ventura / Santa Barbara CA | Southern Front | ~16 km | $110M | $2.5B | 23:1 |
| 9 | Redding / Carr corridor CA | Sierra Foothill | ~11 km | $75M | $1.6B | 21:1 |
| 10 | Tahoe / Caldor corridor CA | Sierra Foothill | ~11 km | $75M | $1.2B | 16:1 |

End-state: segments close into three continuous lines (North Bay ~60 mi,
Sierra Foothill ~350 mi, Southern Front ~300 mi) ≈ 700 mi total, $6–10B.
Refinement task: replace proxy with modeled expected annual loss per
corridor (CAL FIRE perimeters × parcel values × FAIR Plan exposure).

## B. Design basis (pointer)

Full engineering design in `cold-curtain-design-v1.md`: 500 kW/m design /
2,000 kW/m ultimate surface fire behind the fuel break; 5 m head spacing at
1.25–5 kg/s; three lines at 100 ft; ~2 mi standoff; 600 t/km storage;
liquid-full ≥200 psi (75 psi triple-point plug rule); zero grid dependency;
dual-redundant activation (thermal fuse per head + addressable remote).

## C. Economics — sensitivity

Avoided/yr = annual corridor-relevant losses L × 65% corridor share ×
effectiveness E. Program cost = $2.5B build + $0.3B/yr O&M ($14.5B / 40 yr).
No loss escalation assumed (conservative; losses are trending up).

40-year benefit:cost ratio (payback in months in every cell):

| | E = 30% | E = 60% | E = 90% |
|---|---|---|---|
| **L = $30B/yr** | 16:1 | 32:1 | 48:1 |
| **L = $45B/yr** | 24:1 | 48:1 | 73:1 |
| **L = $60B/yr** | 32:1 | 65:1 | 97:1 |

Worst cell (30% effective in a quiet climate) still returns 16:1 and pays
back in ~5 months. Per protected home (~200k structures across 20
corridors): ~$72k over 40 years ≈ $150/month — below typical WUI insurance
surcharges. No sequestration tax credits are claimed anywhere in the model
(sprayed CO2 is released, not sequestered).

## D. Ember transport model

`ember_sim.py` — first-principles drag + Frössling-enhanced char burn,
calibrated to Tarifa wind-tunnel lifetimes; worst-case turbulence variant
(20% RMS gusts as pure slip). Findings: bulk ember flux dies <2 km;
sparse tail of low-terminal-velocity bark brands survives 4–8 km under
severe loft+wind; turbulence extends range (hang time beats burn
enhancement). Design consequence: 2-mile standoff kills the blizzard;
interior spokes handle the tail. Falsification protocol (charred-brand glow
test) on file; field data from pilot burns will re-calibrate r0.

## E. CO2 supply trade study (open)

Two source classes: (a) already-separated gas-processing streams
(concentrated, compressed — cheapest tap; the class feeding CA's first CCS
project in Kern County); (b) future data-center campus capture (permit
condition; ~1.5 Mt/yr per 500 MW campus vs ~120 kt total Phase-1 fill).
Open fork: Kern hub is 100+ mi from LA corridors — trucked supply
(~300 loads per community initial fill, trickle after) vs. localized
capture. Interim: merchant liquid CO2, $20–40M portfolio fill. No
pipelines crossed — moratorium not implicated (classification workstream
in §H). EOR framing excluded deliberately (CA politics, steam-based
recovery, undermines clean-agent narrative).

## F. Co-trenching lever (major cost opportunity — verified 2025-26 data)

The utilities are already digging in our corridors:
- **PG&E**: 1,000 mi of powerlines undergrounded as of Oct 2025 at
  **$3.1M/mi** (down from $4M); targeting 1,600 mi by end-2026 and
  1,077 more mi 2026–28.
- **SCE**: $6.2B 2026–28 wildfire mitigation plan incl. 260 circuit-miles
  of new underground distribution; in 2025 alone undergrounded 40 mi —
  **including 19.3 mi in Malibu and 3 mi in Altadena** — i.e., active
  trenching inside Phase-1 corridors #1 and #4 today.
Implication: sharing trench/right-of-way with funded undergrounding
programs could cut Cold Curtain civil cost (≈40–50% of the $5.5–8.5M/km
all-in) by a third to a half, and inherit environmental clearances.
Action: alignment-overlap study (SCE/PG&E undergrounding maps × curtain
alignments); approach utilities as co-trenching partners, not permittees.

## G. Ignition-origin stubs — justification

Utility infrastructure causes <10% of fire starts but roughly **half of
California's most destructive fires** and ~19% of acreage burned
(2016–2020). Ignition geography is therefore concentrated and mapped:
utility corridors, canyon mouths, roadsides. Stub lines to these points
(e.g., stub E-1 up Eaton Canyon covering the Jan 7, 2025 ignition site;
Camp Fire's Pulga ignition analog on the Sierra line) put suppression at
the birthplace of the worst fires, minutes after detection. Synergy: the
same utilities funding undergrounding (§F) own the ignition liability the
stubs retire.

## H. Regulatory & funding workstreams

1. Classification: on-site network as fire-protection system (NFPA-family)
   vs. CO2 pipeline (PHMSA/moratorium exposure). Highest-priority legal Q.
2. Supply mandate vehicle: CPUC SB 57 study docket (data-center grid
   impacts, report due 2027) + anticipated data-center energy-standards
   bill (Padilla) — insertion points for capture-and-supply condition;
   AB 222 reporting as a hook.
3. Funding stack: regulated emitters (permit conditions; protecting their
   own at-risk campuses) → insurers/FAIR Plan co-funding via premium
   reduction → public resilience funds as backstop only.
4. Fire-service integration: CAL FIRE exclusion-zone protocol; curtain
   service road as anchor line; autonomous activation interlocked to
   evacuation status.

## I. Pilot validation gates (from design-v1 §8)

Stop/no-stop envelope (intensity × discharge rate) · snow persistence vs
wind (5/10/20 m/s) · re-ignition behind the line · nozzle pattern in
45 mph crosswind · detection-to-discharge latency vs ROS · gas drainage
mapping + crew protocol drill. Pass gates → actuarial sign-off →
premium-reduction product → Phase 1 finance.

## J. Risk register (top 5)

| Risk | Exposure | Mitigation |
|---|---|---|
| Extreme-wind (60–100 mph) gas-phase performance | Effectiveness in worst events | Fuel-break + snow-in-fuel-bed pathway carries design; pilot must bound envelope; compartmentalization caps downside |
| Regulatory reclassification as CO2 pipeline | Schedule/feasibility in CA | §H.1 legal workstream first; truck supply keeps transmission out of scope |
| Firefighter co-location during discharge | Operational acceptance | Co-developed exclusion protocol; sectional discharge; visible/audible pre-discharge warning |
| Attic-scale & foam-mode options unvalidated | Scope creep | Held as options, not baseline; baseline is straight CO2 line |
| Cost estimate class (±50%) | Capital plan | Co-trenching lever (§F) biases risk downward; Class 3 estimate after pilot corridor survey |
