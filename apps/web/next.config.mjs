import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @peek/core ships TypeScript source (no build step); Next compiles it.
  transpilePackages: ["@peek/core"],
  // isomorphic-dompurify (the custom-html sanitizer) loads jsdom server-side, which reads its own
  // resource files from node_modules at runtime — webpack-bundling it breaks those paths. Keep it
  // (and jsdom) a runtime require instead of bundling it into the route.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  // Pin file-tracing to the monorepo root (a stray parent lockfile otherwise misleads Next).
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
};

export default nextConfig;
