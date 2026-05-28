/**
 * LINT-TEST (STACK-LOCK guardrail #2): renderer components + CSS use ONLY
 * `var(--vibe-*)` for color — never a literal color. This is the one safety the
 * compile-time CSS libs gave us that plain CSS vars forgo; we enforce it here.
 *
 * Scans the renderer's `.tsx` and `.module.css` for literal color tokens:
 *   - hex colors (#abc / #aabbcc / #aabbccdd)
 *   - rgb()/rgba()/hsl()/hsla() with NUMERIC args (a literal color)
 *   - CSS named colors used as a color value
 * and fails if any appear outside an allow-listed context.
 *
 * `hsl(var(--vibe-*) / α)` is ALLOWED — the hue/sat/light come from a var; only
 * the alpha is a literal, which can't change a color into an illegal one.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RENDERER_DIR = join(__dirname, '..', '..', 'components', 'renderer');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Strip `hsl(var(--…) [/ α])` / `var(--…)` occurrences — those are legal. */
function stripLegalVarColors(src: string): string {
  return (
    src
      // hsl(var(--x)) and hsl(var(--x) / 0.5) and hsl(var(--x, fallback) / .5)
      .replace(/hsla?\(\s*var\(--[^)]*\)[^)]*\)/gi, '__VARCOLOR__')
      // bare var(--x) tokens
      .replace(/var\(--[^)]*\)/gi, '__VAR__')
  );
}

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
// rgb/hsl with a leading DIGIT or %, i.e. a literal numeric color (not var()).
const NUMERIC_COLOR_RE = /\b(?:rgb|rgba|hsl|hsla)\(\s*[\d.]/i;
// A small set of CSS named colors that would be a real literal color value.
const NAMED_COLOR_RE =
  /:\s*(?:white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|silver|gold|navy|teal|maroon|olive|lime|aqua|fuchsia)\b/i;

/** Lines that are allowed to mention a color literal (comments, SVG data URIs). */
function isAllowedLine(line: string): boolean {
  const t = line.trim();
  if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return true;
  // The grain SVG data-URI is a noise texture (no color), allow the data: line.
  if (t.includes("url(\"data:image/svg+xml")) return true;
  return false;
}

describe('renderer uses only var(--…) for color (no literals)', () => {
  const files = walk(RENDERER_DIR).filter(
    (f) => f.endsWith('.tsx') || f.endsWith('.module.css'),
  );

  it('discovers the renderer source files', () => {
    expect(files.length).toBeGreaterThanOrEqual(3); // sections, slug-renderer, css
  });

  for (const file of files) {
    it(`no literal colors in ${file.split('/').slice(-2).join('/')}`, () => {
      const raw = readFileSync(file, 'utf8');
      const lines = raw.split('\n');
      const offenders: string[] = [];
      lines.forEach((line, i) => {
        if (isAllowedLine(line)) return;
        const stripped = stripLegalVarColors(line);
        if (
          HEX_RE.test(stripped) ||
          NUMERIC_COLOR_RE.test(stripped) ||
          NAMED_COLOR_RE.test(stripped)
        ) {
          offenders.push(`  L${i + 1}: ${line.trim()}`);
        }
      });
      expect(offenders, `literal color(s) found:\n${offenders.join('\n')}`).toHaveLength(0);
    });
  }
});
