import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * packages/core is the durable, framework-agnostic asset. It must never import
 * React, Next, or any UI/runtime framework — that is what makes it liftable to
 * any surface. This test IS the guard: it fails the build the moment a
 * framework import sneaks into src.
 */
const FORBIDDEN =
  /\bfrom\s+['"](react|react-dom|next(\/[^'"]*)?|vue|svelte|solid-js|@angular\/[^'"]+)['"]/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory()
      ? walk(p)
      : p.endsWith(".ts")
        ? [p]
        : [];
  });
}

describe("packages/core stays framework-agnostic", () => {
  it("has no framework import anywhere in src", () => {
    const srcDir = join(process.cwd(), "src");
    const offenders = walk(srcDir).filter((f) =>
      FORBIDDEN.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
