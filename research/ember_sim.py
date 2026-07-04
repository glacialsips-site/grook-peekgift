#!/usr/bin/env python3
"""
Ember (firebrand) flight range simulator - first principles.

Question under test: can a small glowing char particle survive multi-km
wind transport, WITH burn rate fully adjusted for relative airspeed?

Model:
- Spherical char particle, diameter d, particle density rho_p.
- Equations of motion with quadratic drag in a uniform horizontal wind U.
  The particle starts at height H with zero velocity (worst-case "dropped
  into the wind" — maximum initial slip, maximum initial burn enhancement).
- Char surface regression (glowing/smoldering oxidation), diffusion-limited,
  enhanced by convection via the Frossling/Ranz-Marshall factor:
      dr/dt = -r0 * (1 + 0.276 * Re^0.5 * Sc^(1/3))
  where Re is based on INSTANTANEOUS relative velocity |v - wind| and
  current diameter. This is exactly the "does wind speed up the burn"
  adjustment: at high slip the burn rate is 10-20x the still-air rate.
- r0 (quiescent-air regression rate) calibrated against classic wind-tunnel
  data (Tarifa 1965): ~10 mm brands in a constant 10 m/s blast survive
  ~300 s. That calibration point itself already includes heavy convective
  enhancement, so it is conservative.
- Ember counts as "still dangerous" on landing if remaining diameter
  >= 2 mm (enough glowing char mass to ignite dry fine fuel).

Deliberately conservative (anti-long-range) choices:
- No protective plume ride: real brands ascend inside hot, oxygen-poor
  plume gas moving with them (suppressed burn during lofting). Here the
  ember burns at full Frossling-enhanced rate from t=0.
- Sphere, not bark plate: plates have lower terminal velocity (longer
  hang time per meter of altitude) - spheres land sooner.
- No updraft after release: altitude only decays.

Usage: python3 ember_sim.py
"""

import math

RHO_AIR = 1.10       # kg/m3 (warm fire environment)
NU_AIR = 1.7e-5      # m2/s kinematic viscosity (warm air)
SC_THIRD = 0.9       # Sc^(1/3) for air
CD = 0.45            # sphere drag coefficient (subcritical Re)
G = 9.81
R0 = 1.0e-6          # m/s quiescent char regression rate (calibrated below)
DT = 0.005           # s
MIN_GLOW_DIAM = 2e-3 # m: below this, treat as burned out / harmless


def frossling(re):
    return 1.0 + 0.276 * math.sqrt(max(re, 0.0)) * SC_THIRD


def simulate_fixed_blast(d0, rho_p, airspeed):
    """User's experiment: hold the ember in a constant wind blast.
    Returns lifetime in seconds until burned below MIN_GLOW_DIAM."""
    r = d0 / 2.0
    t = 0.0
    while 2 * r > MIN_GLOW_DIAM and t < 3600:
        re = airspeed * (2 * r) / NU_AIR
        r -= R0 * frossling(re) * DT
        t += DT
    return t


def simulate_flight(d0, rho_p, wind, height):
    """Drop ember at rest into uniform wind at given height.
    Returns (ground_distance_km, landing_diameter_mm, flight_time_s,
             max_relative_airspeed, relative_airspeed_at_5s)."""
    r = d0 / 2.0
    x, z = 0.0, height
    vx, vz = 0.0, 0.0
    t = 0.0
    vrel5 = None
    max_vrel = 0.0
    while z > 0 and t < 3600:
        if 2 * r <= MIN_GLOW_DIAM:
            # burned out in flight: keep flying ballistically but dead
            pass
        m = rho_p * (4.0 / 3.0) * math.pi * r ** 3
        if m <= 0:
            break
        area = math.pi * r ** 2
        rvx = wind - vx          # air-relative velocity components
        rvz = -vz
        vrel = math.hypot(rvx, rvz)
        max_vrel = max(max_vrel, vrel)
        if vrel5 is None and t >= 5.0:
            vrel5 = vrel
        # drag force
        fd = 0.5 * RHO_AIR * CD * area * vrel
        ax = fd * rvx / m
        az = fd * rvz / m - G
        vx += ax * DT
        vz += az * DT
        x += vx * DT
        z += vz * DT
        # burn (only if still glowing)
        if 2 * r > MIN_GLOW_DIAM:
            re = vrel * (2 * r) / NU_AIR
            r -= R0 * frossling(re) * DT
        t += DT
    return x / 1000.0, max(2 * r, 0) * 1000.0, t, max_vrel, vrel5 or 0.0


def main():
    print("=" * 78)
    print("CALIBRATION CHECK vs Tarifa wind-tunnel data")
    print("(10 mm pine brand held in constant 10 m/s blast: observed ~300 s)")
    t = simulate_fixed_blast(10e-3, 300, 10.0)
    print(f"  model lifetime: {t:.0f} s  (target ~300 s)")
    print()
    print("THE USER'S EXPERIMENT: hold ember in a constant blast")
    for d0, label in [(5e-3, "5 mm / ~0.02 g fleck"), (10e-3, "10 mm / ~0.16 g chunk")]:
        for blast in [20.0, 30.0]:
            t = simulate_fixed_blast(d0, 300, blast)
            print(f"  {label:24s} in {blast*2.237:4.0f} mph blast: "
                  f"burned out in {t:6.0f} s")
    print()
    print("=" * 78)
    print("FLIGHT: dropped at rest into wind (worst-case slip), full")
    print("Frossling burn enhancement at instantaneous relative airspeed")
    print("=" * 78)
    hdr = (f"{'d0':>5} {'rho':>4} {'wind':>5} {'H':>5} | {'range':>7} "
           f"{'land d':>7} {'time':>6} {'vrel max':>8} {'vrel@5s':>8} verdict")
    print(hdr)
    print("-" * len(hdr))
    for rho_p in [150, 300]:                    # bark-like, twig char
        for d0_mm in [3, 5, 8, 12]:
            for wind in [10, 20, 30]:           # 22, 45, 67 mph
                for height in [300, 800, 1500]:
                    km, dl, t, vmax, v5 = simulate_flight(
                        d0_mm * 1e-3, rho_p, float(wind), float(height))
                    alive = "STILL GLOWING" if dl >= MIN_GLOW_DIAM * 1000 else "dead"
                    print(f"{d0_mm:4.0f}mm {rho_p:4.0f} {wind:4.0f}m/s "
                          f"{height:4.0f}m | {km:6.2f}km {dl:5.1f}mm "
                          f"{t:5.0f}s {vmax:6.1f}m/s {v5:6.1f}m/s  {alive}")
    print()
    print("Note vrel@5s: the airspeed the ember actually feels after the")
    print("first seconds of flight - compare with the wind speed itself.")


if __name__ == "__main__":
    main()
