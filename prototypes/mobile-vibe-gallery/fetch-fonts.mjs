#!/usr/bin/env node
/**
 * Fetch Google Fonts CSS + woff2 binaries, rewrite to local /fonts/ paths.
 *
 * Why: the SSR vibe demos shipped to Frank were ugly because the sandbox can't
 * load Google Fonts at render time and the font stacks fell to system Georgia /
 * system-ui. This script self-hosts every family the grammar's FONT_STACK
 * references, so the gallery renders with the *actual* type the grammar picks.
 *
 * Strategy:
 *   1. Pull the @font-face declarations from `fonts.googleapis.com/css2?...`
 *      with a real-browser UA (Google returns woff2-only CSS for modern UAs).
 *   2. For each "latin" / "latin-ext" subset block, download the woff2 and
 *      rewrite the URL to `./fonts/<basename>`. (Non-latin subsets dropped to
 *      keep the bundle small — this is an English demo.)
 *   3. Concatenate all CSS into `app-fonts.css` for inlining in the gallery.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(HERE, 'fonts');

const FAMILIES = [
  'inter',
  'fraunces',
  'playfair_display',
  'bowlby_one',
  'anton',
  'abril_fatface',
  'jetbrains_mono',
  'ibm_plex_mono',
  'caveat',
  'dancing_script',
];

function parseAndPickLatin(cssText) {
  const blocks = [];
  const segments = cssText.split(/\/\*\s*([^*]+?)\s*\*\//).slice(1);
  for (let i = 0; i < segments.length; i += 2) {
    const subset = (segments[i] ?? '').trim().toLowerCase();
    const body = segments[i + 1] ?? '';
    if (!body.includes('@font-face')) continue;
    if (subset === 'latin' || subset === 'latin-ext') {
      blocks.push({ subset, body });
    }
  }
  return blocks;
}

async function downloadWoff(url, filename) {
  const dst = join(FONTS_DIR, filename);
  if (existsSync(dst)) return;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`woff fetch failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dst, buf);
  process.stdout.write(`  ${filename} (${(buf.length / 1024).toFixed(1)} KB)\n`);
}

async function main() {
  const allCss = [];
  for (const fam of FAMILIES) {
    const path = join(HERE, `css_${fam}.css`);
    if (!existsSync(path)) {
      console.warn(`  SKIP ${fam} — missing ${path}`);
      continue;
    }
    const css = readFileSync(path, 'utf8');
    const blocks = parseAndPickLatin(css);
    process.stdout.write(`[${fam}] latin blocks: ${blocks.length}\n`);
    for (const { subset, body } of blocks) {
      const urlMatches = [...body.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)];
      let rewritten = body;
      for (const m of urlMatches) {
        const full = m[1];
        const basename = full.split('/').pop();
        const local = `${fam}_${subset}_${basename}`;
        await downloadWoff(full, local);
        rewritten = rewritten.replace(full, `./fonts/${local}`);
      }
      allCss.push(`/* ${fam} — ${subset} */\n${rewritten.trim()}`);
    }
  }

  const combined = allCss.join('\n\n');
  writeFileSync(join(HERE, 'app-fonts.css'), combined, 'utf8');
  console.log(`\nWrote ${join(HERE, 'app-fonts.css')} (${combined.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
