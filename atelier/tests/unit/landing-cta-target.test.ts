import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), 'utf8');
}

describe('landing CTAs route anon curators straight to /build', () => {
  it('hero "Make one" links to /build (no sign-up redirect)', () => {
    const src = read('components/landing/hero.tsx');
    expect(src).toContain('href="/build"');
    expect(src).not.toContain('sign-up?returnTo=/build');
  });

  it('final-cta "Make one" links to /build (no sign-up redirect)', () => {
    const src = read('components/landing/final-cta.tsx');
    expect(src).toContain('href="/build"');
    expect(src).not.toContain('sign-up?returnTo=/build');
  });

  it('preview-pane no longer renders the Sophie TeachingSurface sample on a fresh peek', () => {
    const src = read('components/build/preview-pane.tsx');
    expect(src).not.toContain('TeachingSurface');
    expect(src).not.toContain("from './teaching/teaching-surface'");
  });
});
