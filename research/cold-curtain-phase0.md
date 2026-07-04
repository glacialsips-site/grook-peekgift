# Cold Curtain — Phase 0 Research Grid

Working record for the Cold Curtain concept: fixed perimeter suppression
infrastructure defending high-value WUI (wildland-urban interface)
developments. This doc tracks damage data, engineering math, the
for/against debate, and open questions. Updated as research progresses.

---

## 1. Damage grid — worst-loss WUI fire events (US)

| Event | Year | Insured loss | Total economic loss | Structures lost/damaged | Notes |
|---|---|---|---|---|---|
| Palisades + Eaton (LA) | 2025 | $28–35B (Verisk); $35–45B (CoreLogic) | $250–275B (AccuWeather) | 18,000+ | Costliest wildfire event in US history; ~37k acres combined — loss density is the story |
| Camp Fire (Paradise) | 2018 | ~$12.5B (2024$) | ~$16.5B | 18,804 | 85 deaths; town effectively destroyed |
| Tubbs (Santa Rosa) | 2017 | ~$11.1B | — | 5,636 | Jumped Hwy 101 into dense suburbia |
| Woolsey (Malibu) | 2018 | ~$5.3B | — | 1,643 | |
| Lahaina (Maui) | 2023 | ~$3.2–4.4B | $5.5B+ | ~2,200 | Large uninsured share |
| Marshall (CO) | 2021 | ~$2B | — | 1,084 | Grass fire into suburbs, December |

Context stats:
- 18 of the 20 costliest US fires occurred in the last 25 years (NFPA).
- 60–90% of structure ignitions in WUI fires are ember-driven (IBHS/NIST).
- Joint Economic Committee (2023): total annual US wildfire burden
  $394–893B/yr (~2–4% GDP) — broad measure incl. health, smoke, real
  estate, watershed. Direct property-loss spikes are narrower but rising.

## 2. 40-year loss projection (order of magnitude)

- Narrow measure (direct property/insured-type losses, CA-centric trend
  ~$50B/yr average post-2017, escalating ~5%/yr):
  cumulative 40-yr ≈ **$5–7T**.
- Broad measure (JEC full economic burden $394–893B/yr, held flat):
  cumulative 40-yr ≈ **$16–36T**.
- Verdict on "double-digit trillions over 40 years": **defensible** on
  the broad measure; single-digit trillions on strict property damage.
  Either number dwarfs any plausible perimeter-infrastructure cost.

## 3. Engineering math — CO2 curtain

### v1 (naive: curtain vs. full crown-fire front) — FAILS
- Fireline intensity, wind-driven WUI front: 20,000–100,000 kW/m.
- Released supercritical CO2 (~1,200–2,200 psi) flashes to ~50/50 gas +
  dry-ice snow at −109°F; usable heat absorption ≈ 1.2 MJ/kg to flame temp.
- At 30 MW/m, absorbing half: ~12.5 kg/s per meter → 12.5 t/s per km of
  active front → ~22,000 t per km per 30 min ≈ 4.5× the Satartia MS
  release (31,405 bbl ≈ ~5,000 t; 45 hospitalized, cars stalled 1 mi away).
- Also fails on: 34% design concentration (NFPA 12) unreachable in
  open fire-driven turbulence; dwell time of seconds; no fuel conditioning.

### v2 (forced-to-work redesign: fuel break + trench + sectionalized) — SURVIVES IN PART
Design changes:
1. Curtain sits inside a maintained fuel-modification band (mowed/irrigated,
   100–300 ft). Crown fire must drop to surface fire to cross → intensity
   at the line ~100–1,000 kW/m (take 500).
2. Discharge into a gravel trench/swale at the fuel bed, not into the plume.
   CO2 is heavier than air → pools in trench; dry-ice snow banks → dwell
   becomes minutes, not seconds.
3. Sectionalized release — only segments with fire contact fire off.
4. Interlocks: release only under mandatory-evacuation status; terrain-graded
   discharge so gas drains away from homes/roads; CO2 sensors along line.

Revised math at 500 kW/m, absorbing half:
- ~0.2 kg/s per meter → 200 kg/s per active km → **~360 t per km per 30 min**
  (~7% of Satartia per km). ~100× better than v1. Storage: ~7× 50 t tanks
  per km — large but real-world (rail-car scale).

### What v2 still cannot fix
- **Extreme-wind events (Santa Ana 60–100 mph)**: pooled gas blanket strips
  away in seconds; these are precisely the events producing the top-grid
  losses. v2 works in the moderate envelope, which is not where the money is.
- **Embers**: launch from wherever the fire is; fly avg ~2 km, extreme
  30–40 km. A line cannot intercept a parabola. Any curtain (CO2 or water)
  needs a parcel-level structure-protection layer for the 60–90%.
- **Firefighter co-location**: crews make their stand on exactly the
  perimeter line the curtain gasses. Requires exclusion protocol; major
  permitting friction.
- **Head-to-head vs water/gel**: water absorbs 3–4× more heat per kg,
  stores at atmospheric pressure (cheap tanks), conditions fuel for hours
  (pre-wet), is safe around people, and permits easily. CO2's residual
  advantages (no water draw, no residue, freeze-proof) are neutralized by
  dedicated recycled-water tanks + fluorine-free gel.

## 4. Cost skeleton (rough, per mile of perimeter)

| Item | CO2 v2 | Water/gel version |
|---|---|---|
| Buried pipe (8", steel, ~$100k/inch-mile) | ~$0.8M | ~$0.5M (lower pressure, HDPE possible) |
| Heads/nozzles/trench media | ~$0.5M | ~$0.5M |
| Storage (~580 t/mi CO2 pressure vessels vs water tanks) | ~$2–3M | ~$0.3–0.6M |
| Controls, sensors, interlocks | ~$0.5M | ~$0.5M |
| **All-in ballpark** | **~$4–5M/mi** | **~$1.8–2.5M/mi** |

Benefit anchor: Eaton fire entered Altadena along a front of order 5–10 km;
event total $250B+. A 10-mile perimeter at even $5M/mi = $50M. If it
prevents 1% of one such event, BCR > 50:1. **Implication: BCR is so large
that fluid choice doesn't decide viability — safety, permitting, and
extreme-wind performance decide it. That comparison favors water.**

## 5. Debate ledger

| # | Objection | Attack on the objection | Status |
|---|---|---|---|
| 1 | No CO2 pipelines near CA fires; CA moratorium | Data-center/capture buildout could source CO2 locally; gov mandate angle | Sourcing not binding — physics/safety bind first. OPEN as politics |
| 2 | Water scarcity + PFAS/retardant pollution | Real (Palisades hydrants); but hydrant failure was distribution, not supply; curtain needs only ~2–20 acre-ft; fix = dedicated recycled-water tanks + fluorine-free gel | RESOLVED in water version's favor |
| 3 | Flow rate absurd (4.5 Satartias/km) | v2 fuel-break integration cuts requirement ~100× to 360 t/km | PARTIALLY REFUTED — works in moderate winds only |
| 4 | Open-air concentration unreachable | Trench pooling + fuel-bed-level discharge in low-fuel band | PARTIALLY REFUTED — fails in extreme wind |
| 5 | No dwell/fuel conditioning | Sustained discharge + snow banking gives minutes | PARTIALLY REFUTED — still no pre-treatment capability |
| 6 | Safety (Satartia-scale release near evacuating public) | Sectionalized 360 t/km in evacuated zone, terrain-graded drainage, interlocks | IMPROVED, NOT CLOSED — firefighter co-location unresolved |
| 7 | Embers fly over any line (60–90% of losses) | Move curtain out past ember range | REFUTED — embers launch from the fire's position, not the stopped line; needs structure-level layer regardless |
| 8 | CO2 loses head-to-head to water/gel on cost, physics, permitting | — | STANDING. Strongest surviving role for CO2: **propellant** (gas-pressurized water delivery → zero grid-power dependence) |

## 6. Open questions / next steps
- [ ] Model a reference community (e.g., 500-home WUI edge, 4-mile perimeter): full BOM and cost both versions
- [ ] Extreme-wind performance: what DOES hold a line at 60+ mph? (Nothing line-based; quantify honestly)
- [ ] Parcel-level layer: integrate structure wetting (the ember answer) into the same buried network
- [ ] Insurance economics: premium reduction / insurability restoration as the revenue model; CA FAIR Plan exposure data
- [ ] Regulatory map: who permits a community perimeter system (CAL FIRE, county fire marshal, CPUC?), NFPA 1144/Firewise hooks
- [ ] Cross-check AccuWeather $250–275B (methodology criticized as high; UCLA Anderson lower) — grid uses range, flag variance
- [ ] Drone/aerial cost comparison (deferred per discussion)

## Sources
- Verisk insured-loss estimate, LA 2025: https://www.verisk.com/company/newsroom/verisk-estimates-industry-insured-losses-for-the-palisades-and-eaton-fires-will-fall-between-usd-28-billion-and-usd-35-billion/
- AccuWeather total-loss estimate: via https://www.preventionweb.net/news/economic-impact-los-angeles-wildfires
- UCLA Anderson economic impact: https://www.anderson.ucla.edu/about/centers/ucla-anderson-forecast/economic-impact-los-angeles-wildfires
- III wildfire facts/statistics: https://www.iii.org/fact-statistic/facts-statistics-wildfires
- JEC annual wildfire burden: https://www.jec.senate.gov/public/index.cfm/democrats/2023/10/climate-exacerbated-wildfires-cost-the-u-s-between-394-to-893-billion-each-year-in-economic-costs-and-damages
- PHMSA Satartia investigation: https://www.phmsa.dot.gov/news/phmsa-announces-new-safety-measures-protect-americans-carbon-dioxide-pipeline-failures
- NWCG spotting behavior: https://www.nwcg.gov/publications/pms437/crown-fire/spotting-fire-behavior
- USFA ember-driven ignition: https://www.usfa.fema.gov/blog/protecting-structures-from-wildfire-embers-and-fire-exposures/
- Fuel break function/limits: http://www.qlg.org/pub/miscdoc/agee.htm ; https://www.fire.ca.gov/dspace
- Pipeline cost rule of thumb (~$100k/inch-mile): https://www.pipetechservice.com/what-is-the-current-price-per-mile-foot-for-installing-a-12-inch-natural-gas-pipeline/
- EPA CO2 suppression risks: https://www.epa.gov/sites/default/files/2015-06/documents/co2report.pdf
