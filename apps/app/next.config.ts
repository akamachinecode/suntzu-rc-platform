import type { NextConfig } from "next";

// Baseline security headers for every response. Cloudflare can add more at the edge.
// Geolocation is allowed for the site itself: "Near me" asks for it (and never sends it anywhere).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];
// No page may be framed by another site, except the clubs' widget (/embed), which exists for it.
const noFraming = [{ key: "X-Frame-Options", value: "DENY" }];

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker. Set by the Dockerfile (EC2 target) only.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  transpilePackages: ["@workspace/ui"],
  reactCompiler: true,
  // Cache Components stay off until the templates are adapted to them (Next.js 17 turns them on by default).
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
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/((?!embed/).*)", headers: noFraming },
    ];
  },
};

export default nextConfig;
