import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

// A static site: `next build` writes plain HTML to out/, which GitHub Pages serves (spec 0007).
// On GitHub Pages the portal lives under the repository's name: the workflow sets DOCS_BASE_PATH
// (.github/workflows/docs.yml). Locally it's served from the root.
const basePath = process.env.DOCS_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // /bits/events-list/ is written as bits/events-list/index.html, which every static host serves.
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
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
