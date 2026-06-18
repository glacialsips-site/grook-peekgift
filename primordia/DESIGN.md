# PRIMORDIA

> A universe in a single HTML file.

Primordia is a GPU-accelerated **artificial life sandbox**. It has no build step,
no dependencies, no server requirement, and no network calls. You open one file
and a small cosmos of glowing particles comes alive — drifting, clustering,
hunting, dying, and self-organizing into structures nobody designed.

## The core idea: Particle Life

Every particle has a **species** (a color). Between any two species there is a
signed **attraction** — species A might chase species B while B flees A. With a
handful of species and a randomly seeded interaction matrix, startlingly lifelike
behavior emerges: cell membranes, predator/prey chases, pulsing organisms,
crystalline lattices, migrating flocks. None of it is scripted. It's all the
matrix.

```
force(a, b) = matrix[species_a][species_b] * falloff(distance)
```

That one line, run across thousands of particles every frame on the GPU, is the
whole engine.

## Why GPU

Particle Life is O(N²): every particle feels every other particle. On the CPU that
caps out around a couple thousand particles. We push the state into floating-point
**textures** and run the simulation as a fragment shader, ping-ponging between two
framebuffers each frame. That moves the whole N² interaction onto thousands of
shader cores in parallel, so we can run **4,096–16,384 particles at 60fps** with a
real bloom pass on top.

## Architecture (all in `index.html`)

- **State textures** — position (RG = xy, BA = velocity) packed into a float texture,
  one texel per particle. Two copies, ping-ponged.
- **Sim pass** — fragment shader. For each particle texel, loop over all particles,
  accumulate force from the species matrix, integrate velocity + position, wrap at
  edges. Writes the next state texture.
- **Render pass** — draw N points, each vertex shader reads its particle's texel,
  positions the point, colors it by species. Additive blending → glow.
- **Bloom** — bright-pass + separable Gaussian blur + composite, for that
  luminous, deep-space look.
- **God mode** — the mouse becomes a gravity well (attract / repel), fed into the
  sim shader as a uniform.
- **Evolution** — the species matrix can mutate over time; "interesting" worlds are
  kept, boring ones are reseeded. You can also breed two worlds together.
- **Sonification** — species populations and average velocity drive a small
  WebAudio drone, so the ecosystem has a voice.

## Design values

1. **It must actually run** by opening the file. One artifact, no toolchain.
2. **Emergence over scripting.** We tune rules, never behaviors.
3. **Beautiful by default.** Dark, luminous, cinematic. Bloom is not optional.
4. **Playable.** Knobs you can turn and immediately feel.

## Roadmap (living)

- [x] Project + manifesto
- [ ] WebGL2 boot + float-texture state
- [ ] Sim shader (N² particle life)
- [ ] Glow rendering
- [ ] Bloom post
- [ ] Control panel + presets
- [ ] God-mode mouse
- [ ] Evolution / mutation
- [ ] Sonification
- [ ] Title screen + polish

Built for the fun of it.
