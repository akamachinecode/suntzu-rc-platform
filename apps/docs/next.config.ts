import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

// A static site: `next build` writes plain HTML to out/, which GitHub Pages serves (spec 0007).
const nextConfig: NextConfig = {
  output: "export",
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@workspace/ui"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default createMDX()(nextConfig);
