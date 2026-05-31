import type { Genome } from "@peek/vibe-genome";

/**
 * armory/select — the selection layer (first slice). Maps a genome's vibe to the armory element
 * that FITS it, so we never apply one treatment uniformly (the "HUD corners on a fairytale" bug).
 * Heuristic for now; the /design "selection logic" catalog + Claude will deepen this into the full
 * input -> coherent-choice-set function. This is the seam; the rules grow behind it.
 */
export function pickFrame(g: Genome, role: "hero" | "card"): string {
  const k = g.knobs;
  const techy =
    k.type.displayClass === "techno-mono" ||
    k.layout.archetype === "dashboard-hud" ||
    k.texture.surfaceShadow === "neon-glow";
  const soft = k.shape.edgeTreatment === "round" || k.type.useScript || g.meta.playfulness > 0.65;

  if (techy) return "hud-panel";
  if (soft) return role === "card" ? "medallion" : "arched";
  return "panel";
}
