# Background — the science Primordia stands on

Primordia didn't invent anything. It's a GPU implementation of a well-trodden
idea in **artificial life**, dressed up with bloom, an evolutionary search, and a
self-curating autopilot. This page gives credit and context.

## The lineage

**Conway's Game of Life (1970).** The ancestor of all of this: a discrete
cellular automaton where a handful of birth/death rules on a grid produce
gliders, oscillators, and universal computation. The lesson — *complex behavior
from simple local rules* — is the whole genre.

**Ventrella's *Clusters* (2010s).** Jeffrey Ventrella built *Clusters*, an
**asymmetrical particle system with emergent patterns**: particles belong to
groups, and each ordered pair of groups gets its own attraction/repulsion rule
(range and strength). Crucially the rules are *asymmetric* — reds can chase
greens while greens flee reds — which is what makes the motion feel alive and
predatory rather than settling into equilibrium. People naturally personify the
result ("the yellow species likes to keep to itself"). This is the direct
ancestor of what's now widely called **Particle Life**.
([Ventrella](https://ventrella.com/Clusters/) ·
[Softology overview](https://softologyblog.wordpress.com/2018/11/08/clusters-and-particle-life/))

**Tom Mohr's *Particle Life* (2020s).** Mohr formalized and popularized the
modern, clean version: a single signed **attraction matrix** between species and
a compact **force function** parameterized by an inner repulsion radius `β`
(beta) and an outer interaction radius `rₘₐₓ`, with velocity **friction** as a
half-life. His Java framework adds space-partitioning and parallelism, and his
explainer video walks through the exact maths.
Primordia's force law is this formulation:
([video](https://www.youtube.com/watch?v=p4YirERTVF0) ·
[particle-life](https://github.com/tom-mohr/particle-life) ·
[particle-life-app](https://github.com/tom-mohr/particle-life-app))

```
                ⎧ r/β − 1                              for r < β     (hard repulsion)
 falloff(r,a) = ⎨ a · (1 − |2r − 1 − β| / (1 − β))     for β ≤ r < 1  (attraction band)
                ⎩ 0                                    for r ≥ 1     (out of range)
```

where `r` is distance normalized by `rₘₐₓ` and `a = matrix[selfSpecies][otherSpecies]`.
You can read this exact function in `index.html`'s sim shader and, identically,
in `tools/sim-core.mjs` — the CPU twin that lets the whole thing be tested
without a browser.

## The other branch: Lenia

Running in parallel to particle systems is **Lenia**, Bert Wang-Chak Chan's
**continuous cellular automaton** — a smooth generalization of Game of Life with
continuous space, time, and state. Lenia is famous for the sheer *diversity and
biological plausibility* of the creatures it produces: **400+ species across 18
families**, geometric and metameric and resilient, some self-replicating. It won
the ISAL outstanding-paper award in 2019. Later work generalized it to multiple
kernels/channels and even **Particle Lenia**, which brings the continuous-field
view back to discrete particles — closing the loop with the Clusters branch.
([Wikipedia](https://en.wikipedia.org/wiki/Lenia) ·
[Chan 2019, arXiv:1812.05433](https://arxiv.org/abs/1812.05433) ·
[ALife encyclopedia](https://alife.org/encyclopedia/software-platforms/lenia/))

The Lenia community also pioneered something Primordia borrows in spirit:
**searching** the rule space for interesting creatures instead of hand-designing
them, including "lazy filters" and intrinsic novelty metrics for finding lifelike
entities automatically.
([arXiv:2504.14774](https://arxiv.org/pdf/2504.14774))

## Where Primordia sits

Primordia is squarely in the **Particle Life** branch (Ventrella → Mohr), with a
few things that are its own:

1. **All on the GPU, O(N²), in one file.** State lives in float textures and the
   full N-body interaction runs as a fragment shader, ping-ponged each frame — no
   spatial partitioning, just brute parallelism, which is enough for 4k–16k
   particles at 60fps with bloom.
2. **An interestingness metric + evolutionary search** (`tools/evolve.mjs`). In
   the Lenia spirit, it scores *random* rule-sets for being "alive and
   structured" — using the **index of dispersion** of particle density to tell
   real structure from gas/explosion, and rewarding ongoing motion — then renders
   a hall of fame. The winners become the app's curated **Bestiary**.
3. **Genesis autopilot.** The same metric runs live: a thriving world is gently
   mutated, and a dead or exploded one is reborn — an endless, self-curating
   stream of life.

None of the underlying dynamics are novel. The fun was in making it run anywhere,
look beautiful, and *find its own creatures*.

## Read more

- Jeffrey Ventrella — *Clusters*: https://ventrella.com/Clusters/
- Tom Mohr — *Particle Life* code + talk: https://github.com/tom-mohr/particle-life
- Bert Wang-Chak Chan — *Lenia: Biology of Artificial Life*: https://arxiv.org/abs/1812.05433
- Softology — *Clusters and Particle Life*: https://softologyblog.wordpress.com/2018/11/08/clusters-and-particle-life/
- *Defining and finding lifelike entities with a lazy filter*: https://arxiv.org/pdf/2504.14774
