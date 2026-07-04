# Cold Curtain — Engineering Design v1 (CO2 suppression line)

The machine: a buried high-pressure liquid CO2 distribution system with
sectionalized arrays of automated discharge nozzles ("a pipe with a line of
automated fire extinguishers"), deployed in depth across a defended band at
the wildland edge of high-value, high-recurrence communities. This document
sizes it from thermodynamics and fluid dynamics.

---

## 1. Design basis

| Parameter | Value | Basis |
|---|---|---|
| Design fire at the line | Surface fire, 500 kW/m (design), 2,000 kW/m (ultimate) | Line sits behind a fuel-modified strip; crown fire must transition to surface fire to cross it |
| Front passage time per point | 10–15 min | Surface fire ROS 1–3 m/min through treated strip |
| Design wind | 20 m/s (45 mph) sustained | Santa Ana/Diablo event |
| Suppression agent | Liquid CO2, flashing at nozzle to ~45% dry-ice snow + 55% gas at −78.5 °C | Extinguisher physics, scaled |
| Usable heat absorption | ~1.2 MJ/kg (snow sublimation + gas heat-up to flame temp) | Thermo tables |
| Mission | STOP fire spread across the line (not extinguish the landscape) | Curtain doctrine |

## 2. Band geometry — "how wide is the band"

Defense in depth, from wildland inward:

```
 FIRE SIDE
 ─────────────────────────────────────────────────────
 (A) Fuel-modified approach strip ... 100 ft  (mowed/grazed/thinned:
     forces crown → surface transition, caps intensity at the line)
 (B) SUPPRESSION LINE 1 ............. nozzle row + gravel discharge swale
 (C) Gap ............................ 100 ft (treated)
 (D) SUPPRESSION LINE 2 ............. second nozzle row (catches breaches)
 (E) Gap ............................ 100 ft (treated)
 (F) SUPPRESSION LINE 3 ............. final row + service road (doubles as
                                      firebreak + maintenance/firefighter access)
 ─────────────────────────────────────────────────────
 (G) Standoff to first structures ... balance of ~2 mi total, ordinary
     managed wildland (ember-flux decay distance; spokes cover interior)
 COMMUNITY SIDE
```

- Active hardware band (A–F): **~500 ft deep**, three independent lines.
- Total standoff (A–G): **~2 mi** from line 1 to first structure where
  terrain allows (ember flux at homes falls ~100× vs. fence-line contact).
  Where terrain doesn't allow, compensate with denser interior spokes.
- Line length: follows the threat arc, not a closed ring — prevailing-wind
  fire corridors (e.g., N/NE approaches for Santa Ana-driven fires) get the
  full triple line; low-threat arcs get single line + patrol access.

## 3. Nozzle system — "how do we set up the nozzles"

**Head spec ("automated fire extinguisher node"):**
- Horn-type flashing nozzle on a 0.75 m riser, pop-up or fixed with
  frangible weather cap; stainless; aimed 15–30° downward, fanning the
  fuel bed and its own gravel swale (low discharge — gas is heavy, keep it
  in the fuel layer where the fire lives, not in the plume).
- **Spacing: 5 m along each line** (throw pattern ~6–8 m fan, overlap 20%).
- **Discharge rate: 1.25–5 kg/s per nozzle** (two-stage: knockdown stage
  full rate, hold stage 25% rate to maintain the cold blanket while the
  front dies against the line).
- Per meter of active front: **0.25 kg/s·m design / 1 kg/s·m ultimate**
  (energy balance: absorb ≥50% of 500–2,000 kW/m at 1.2 MJ/kg; the
  remainder is starved by the treated strip and the snow-chilled fuel bed).
- Each nozzle tees off the lateral through a pilot-operated valve; heads
  open in **50 m sections** (10 nozzles), commanded by the controller.

**Detection & aiming:**
- Dual-band IR cameras on 15 m masts every 200 m (flame detection +
  direction) + linear heat-detection cable along line A edge.
- Controller opens the sections facing fire contact ±1 section each side;
  "aiming" is achieved by WHICH sections fire, not by moving parts —
  solid-state, nothing to jam under radiant heat. (Oscillating CO2 monitors
  only at hub stations as operator-controlled reserves.)
- Fully autonomous activation permitted when evacuation order is in effect
  (interlock); manual/remote override at all times.

**Activation quantities:**
- One 50 m section, knockdown 15 min: 10 nozzles × 5 kg/s × 900 s ≈ **45 t**.
- Design event: front walks along 1 km of line over ~2 h, max 300 m
  simultaneously active: peak flow **75–300 kg/s per km**, total consumption
  **400–800 t per attacked km** (matches storage sizing below).

## 4. Hydraulics & thermodynamics of distribution

The one rule that shapes everything: **CO2 triple point = 75 psia / −70 °F.
If line pressure ever falls below ~75 psi with liquid present, dry ice
forms IN THE PIPE and plugs it.** Therefore:

- Store and distribute as **refrigerated liquid at 300 psi / −18 °C**
  (standard industrial practice; denser than ambient-temp storage, cheaper
  vessels than 850 psi ambient).
- Keep the entire pipe network liquid-full and padded above 200 psi at all
  times (vapor-pad from storage boil-off compressor). Flashing happens at
  the nozzle orifice ONLY — the last inch.
- Trunk (spine): 8" sch 80 carbon steel, buried below frost/plow depth.
  At peak 300 kg/s·km: velocity ~9 m/s, ΔP acceptable over ≤1 mi laterals.
- Laterals (spokes to lines 1–3): 4", hubs every 500 m with sectional
  valves, relief, and vent-to-safe-area risers.
- Storage: **~600 t per defended km** (covers design event + one re-attack).
  Modular: 12 × 50 t vacuum-jacketed horizontal vessels per km, sited on
  the wildland side of the band, pad graded so vented/spilled gas drains
  AWAY from community and evacuation routes. Boil-off: re-liquefied by a
  small refrigeration skid (solar + battery + backup genset — no grid
  dependence).
- Annual standby losses (boil-off makeup): ~1–2%/month with reliquefaction
  ≈ negligible tonnage cost.

## 5. Sourcing — "where do we get it" (the data-center play)

The arithmetic that makes this free-ish:
- A 500 MW gas-fired data-center energy campus emits ≈ **1.6–1.8 Mt
  CO2/yr**; with 90% post-combustion capture ≈ **1.5 Mt/yr captured**.
- Phase 1 portfolio (20 communities × avg 10 km defended line × 600 t/km)
  needs **~120 kt** for initial fill — **less than one month** of one
  campus's captured output. Annual makeup (activations + losses): ~10–30 kt
  — a rounding error.
- **Mechanism:** permitting condition on new gas-fired data-center
  generation (CUP/CEQA mitigation or state statute): capture and deliver
  X kt/yr liquid CO2 to the regional wildfire-resilience reserve, F.O.B.
  plant gate. Developer cost is small vs. a $100B campus; community gets
  the agent for free; developer gets a public-benefit story for siting
  fights and potentially 45Q utilization credit (legal review needed).
- **Logistics: truck and rail, not pipelines.** Standard 20 t cryo tankers;
  initial fill of a community = ~300 truckloads over a season, makeup = a
  few trucks/month. This SIDESTEPS California's CO2-pipeline moratorium —
  the on-site distribution network is a fire-protection system on local
  easements, not a transmission pipeline (regulatory classification to be
  confirmed — flagged as key legal workstream).
- Interim supply before campuses come online: merchant liquid CO2
  (~$150–300/t delivered) — initial fill ~$20–40M for the whole Phase 1
  portfolio; still noise vs. capex.

## 6. Cost per defended km (CO2 system, all-in rough order of magnitude)

| Item | Per km |
|---|---|
| 3 nozzle lines: pipe, heads, valves (600 nozzles) | $1.5–2.5M |
| Trunk + laterals + trenching | $1.0–1.5M |
| Storage (12 × 50 t vessels + reliquefaction skid) | $2.0–3.0M |
| Detection, controls, power (solar+battery), comms | $0.5–1.0M |
| Fuel-strip establishment + service road | $0.3–0.5M |
| **Total** | **~$5.5–8.5M/km** (~$9–14M/mi) |

10 km defended line per community → **$55–85M** + interior spokes/hubs →
consistent with the $75–150M/community figure in the phase plan.
O&M: fuel-strip maintenance (mow/graze), annual head inspection, boil-off
power ≈ **$0.5–1M/km/yr** — the dominant recurring cost is vegetation, not CO2.

## 7. Average annual damage takedown

- CA-centric WUI direct losses, trend average: **$30–60B/yr** (spiky:
  2017 ~$20B, 2018 ~$25B, 2025 ~$250B+, quiet years ~$1–5B).
- Phase 1's 20 corridors historically host **~60–70%** of dollar losses
  (loss density concentrates exactly where value meets recurrent fire).
- Takedown scenarios (applied to corridor share):
  - Conservative (40% effective): **~$8–17B/yr avoided**
  - Base (70%): **~$15–29B/yr avoided**
  - Optimistic (90%): **~$19–38B/yr avoided**
- Against $2–3B capex + ~$0.3B/yr O&M: expected payback **< 1 year**;
  40-yr NPV in the **hundreds of billions to ~$1T** range at any discount
  rate anyone uses. Plus non-monetized: fatalities (85 Camp, ~30 LA 2025),
  smoke-health burden, insurance-market stabilization.
- Even in the ember-pessimist case (line stops the front but interior spot
  fires still cause some loss), the front + first-row-ignition channel and
  the structure-to-structure chain reaction are where the majority of
  dollar loss concentrates — stopping the wall of fire is the big lever.

## 8. Pilot test matrix (what prescribed burns must verify)

1. Snow-fraction ground persistence vs. wind speed (5/10/20 m/s) — how long
   does the −78 °C blanket hold in the swale and fuel bed?
2. Stop/no-stop envelope: fireline intensity × discharge rate matrix →
   validate 0.25 and 1 kg/s·m design points.
3. Re-ignition behind the line: residual smolder behavior in chilled fuel.
4. Nozzle pattern under 45 mph crosswind: effective fan width, overlap.
5. Sectional logic: detection-to-discharge latency vs. fire ROS.
6. Safety: downslope gas drainage mapping, sensor grid verification,
   firefighter exclusion-zone protocol drill with CAL FIRE.

## 9. Open engineering items

- [ ] Regulatory classification of on-site network (fire system vs. CO2
      pipeline) — determines moratorium exposure. Highest-priority legal Q.
- [ ] Nozzle orifice design for max snow fraction (pre-cooling loop?)
- [ ] Trench/swale geometry optimization (gas pooling CFD)
- [ ] Hybrid option kept open: same network can drive CO2-energized
      bio-foam through the same heads for pre-blanket mode (dual-agent
      hubs) — foam for the hours-ahead phase, straight CO2 for the
      minutes-of-contact phase. Best of both, one pipe.
- [ ] Site selection: overlay of loss-density grid × terrain × water
      scarcity → ranked 20-corridor list with maps.
