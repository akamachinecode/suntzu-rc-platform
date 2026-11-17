import type { NextConfig } from "next";

// Baseline security headers for every response. Cloudflare can add more at the edge.
// Geolocation is allowed for the site itself: "Near me" asks for it and keeps it in the browser;
// "Can I fly here?" sends the point to our API to check the airspace (traces don't keep it).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()",
  },
];

/**
 * Content-Security-Policy, in report-only mode (spec 0010): browsers report what it would block to
 * /api/csp-report and block nothing yet. Every origin the site uses is listed: the API, Cloudflare
 * Turnstile, OpenFreeMap's tiles; MapLibre's worker is same-origin (blob: covers its fallback).
 * Scripts still allow 'unsafe-inline': Next.js writes inline scripts, and nonces would turn every
 * static page (the guides) into a page rendered on each request. Enforcing comes later, once the
 * reports are clean (docs/DECISIONS.md, 2026-11-17). Production builds only: the dev server needs
 * eval and websockets.
 */
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").origin;
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com 'report-sample'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${api} https://tiles.openfreemap.org https://challenges.cloudflare.com`,
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "manifest-src 'self'",
  "report-uri /api/csp-report",
  "report-to csp",
].join("; ");
const reportOnlyPolicy =
  process.env.NODE_ENV === "production"
    ? [
        { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
        { key: "Reporting-Endpoints", value: `csp="${new URL("/api/csp-report", site)}"` },
      ]
    : [];

// No page may be framed by another site, except the clubs' widget (/embed), which exists for it
// and sends its own policy. Pop-ups this site opens can't reach back into it (COOP).
const noFraming = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...reportOnlyPolicy,
];

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
