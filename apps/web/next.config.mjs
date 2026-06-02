import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @peek/core ships TypeScript source (no build step); Next compiles it.
  transpilePackages: ["@peek/core"],
  // Pin file-tracing to the monorepo root (a stray parent lockfile otherwise misleads Next).
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
};

export default nextConfig;
