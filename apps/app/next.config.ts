import type { NextConfig } from "next";

// Baseline security headers for every response. Cloudflare can add more at the edge.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker. Set by the Dockerfile (EC2 target) only.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  transpilePackages: ["@workspace/ui"],
  reactCompiler: true,
  // Cache Components stay off: AWS Amplify and OpenNext (SST) don't support them yet.
  // Use the caching model described in node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
