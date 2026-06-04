import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Test harness for @peek/web. The `@/*` alias mirrors tsconfig so tests import the
// app's modules the same way the app does. Node environment — the suites here are
// pure logic (prompt assembly, sanitizer, extraction) with no DOM/Next runtime.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
