import type { Peek } from "@peek/site-ir";
import type { DesignTokens } from "@peek/design-tokens";
import type { Genome } from "@peek/vibe-genome";
import { buildCss, fontsUrl } from "./css";
import { renderBlock } from "./blocks";
import type { Effect } from "./effects";

/** Render a Peek (IR) + its resolved tokens into a complete, self-contained HTML document. */
export function renderPeek(peek: Peek, genome: Genome, tokens: DesignTokens): string {
  const effects: Effect[] = [];
  const body = peek.sections.map((b) => renderBlock(b, genome, effects)).join("\n");
  const effectCss = [...new Set(effects.map((e) => e.css))].join("\n");
  const css = `${buildCss(tokens, genome)}\n${effectCss}`;
  const fonts = fontsUrl(tokens.type.faces);

  return `<!DOCTYPE html>
<html lang="${peek.meta.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${peek.meta.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fonts}" rel="stylesheet">
<style>${css}</style>
</head>
<body>
${body}
</body>
</html>`;
}
