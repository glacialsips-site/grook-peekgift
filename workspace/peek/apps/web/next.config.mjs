import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: resolve(here, "../.."),
  transpilePackages: [
    "@peek/site-ir",
    "@peek/design-tokens",
    "@peek/vibe-genome",
    "@peek/vibe-harmony",
    "@peek/vibe-resolve",
    "@peek/ir-render-web",
  ],
};

export default nextConfig;
