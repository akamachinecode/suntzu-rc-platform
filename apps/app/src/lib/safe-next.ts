// A placeholder origin: only used to read `next` the way a browser would.
const HERE = "https://here.invalid";

/**
 * Where to go after signing in: a path on this site, never another site.
 *
 * A prefix check isn't enough: browsers read `/\evil.com` and `/\t/evil.com` as `//evil.com`, so
 * `next` is parsed as a URL and kept only when it stays on this origin (modern web guidance,
 * `security/validate-origins`: "DO NOT validate origins or sites with `startsWith()`").
 */
export function safeNext(next: unknown, fallback = "/me"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  let url: URL;
  try {
    url = new URL(next, HERE);
  } catch {
    return fallback;
  }
  if (url.origin !== HERE) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
