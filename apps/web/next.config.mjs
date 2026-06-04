import path from "node:path";

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@peek/core"],
  serverExternalPackages: ["isomorphic-dompurify", "jsdom", "@anthropic-ai/sdk", "node-html-parser"],
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
};

export default nextConfig;
