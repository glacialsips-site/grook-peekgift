import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @peek/core ships TypeScript source (no build step); Next compiles it.
  transpilePackages: ["@peek/core"],
  // Keep these as runtime requires instead of bundling them into the serverless function.
  // Netlify's function bundler (esbuild, via @netlify/plugin-nextjs) chokes on packages that do
  // runtime feature-detection / dynamic requires, even though `next build` and `output:standalone`
  // bundle them fine — the symptom is the function 500ing on load while local/standalone return
  // 405/503. isomorphic-dompurify+jsdom read resource files from node_modules at runtime; the
  // @anthropic-ai/sdk swaps fetch/stream shims dynamically; node-html-parser rides along as cheap
  // insurance. Externalizing makes Netlify trace + require them at runtime, which it handles.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom", "@anthropic-ai/sdk", "node-html-parser"],
  // Pin file-tracing to the monorepo root (a stray parent lockfile otherwise misleads Next).
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
};

export default nextConfig;
