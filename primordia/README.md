<div align="center">

# PRIMORDIA

### a universe in a single HTML file

Thousands of glowing particles. A handful of rules. **Nothing is scripted** —
the life self-organizes. GPU-accelerated artificial life in pure WebGL2, with
zero dependencies, zero build step, and zero network calls.

![gallery](stills/gallery.png)

*Six worlds, one engine. Each grown from the same one-line force law — only the
species-attraction matrix differs.*

</div>

---

## Run it

```
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

That's it. One file. No `npm install`, no server, no toolchain. Double-click works
(everything is inlined; no ES modules, no `fetch`). A WebGL2 browser with float
render targets is the only requirement (any recent Chrome / Edge / Firefox / Safari).

## What you're looking at

Every particle has a **species** (a color). Between any two species there's a
signed **attraction**. That's the entire model:

```
force(a, b) = matrix[species_a][species_b] · falloff(distance)
```

Run that across thousands of particles on the GPU, every frame, and lifelike
behavior *emerges*: membranes, predator/prey chases, pulsing cells, crystalline
lattices, migrating flocks, segmented worms. None of it is programmed. It's all
the matrix.

## How it works

The whole simulation lives in floating-point **textures** and runs as a fragment
shader, ping-ponging between two framebuffers each frame. That moves the O(N²)
particle interaction onto the GPU's thousands of cores in parallel, so it holds
**4k–16k particles at 60fps** with a real bloom pass on top.

| stage | what happens |
|-------|--------------|
| **sim** | fragment shader: for each particle, sum the species-matrix force from every other particle; integrate velocity + position; wrap toroidally |
| **draw** | one point per particle; vertex shader reads its texel, colors by species; additive blending → glow |
| **bloom** | bright-pass → separable Gaussian blur → ACES composite, for the luminous look |
| **god mode** | the mouse becomes a gravity well fed into the sim as a uniform |

## Controls

- **drag** — attract particles · **shift + drag** — repel
- **space** pause · **R** reseed · **N** new rules · **M** mutate · **H** hide UI · **F** fullscreen · **S** snapshot
- Tune the **attraction matrix** live by dragging its cells (cyan = attract, magenta = repel)
- Six presets: **Cells · Chase · Swarm · Crystal · Veins · Chaos**
- **Sound** sonifies the ecosystem; **Copy/Paste World DNA** shares a universe as a string

## The CPU twin (`tools/`)

The trickiest part of particle life is that it's invisible until it runs — and the
stable parameter regime is narrow (too hot a timestep and everything detonates
into noise). So before the GPU ever ran, the **exact same force law** was ported to
a dependency-free CPU simulator that renders real PNGs. It caught an exploding-`dt`
bug, then minted the proven-good defaults the GPU now ships with.

```
node tools/render.mjs          # one world: primordial soup → self-organized cells
node tools/preset.mjs Veins    # render a single preset to stills/
node tools/montage.mjs         # stitch the labeled gallery above
```

The CPU and GPU share one source of truth for the math, so the stills are an honest
preview of the live app — not a mockup.

---

<div align="center">
<sub>Built for the fun of it.</sub>
</div>
