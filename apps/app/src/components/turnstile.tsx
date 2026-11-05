"use client";

import Script from "next/script";

/**
 * Cloudflare Turnstile (spec 0004): proves a person sends a public form, without a puzzle. It adds
 * a hidden `cf-turnstile-response` field to the form it's in; the API checks it. Renders nothing
 * when NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set (local development).
 */
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-theme="light"
        data-size="flexible"
      />
    </>
  );
}
