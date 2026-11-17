import type { Span, SpanProcessor } from "@opentelemetry/sdk-trace";

/**
 * What a trace may not keep (spec 0010; modern web guidance, privacy: "scrub personally
 * identifiable information from application logs"): the values in a query string (a visitor's
 * coordinates from "Can I fly here?", what they searched for) and the secret in a member's
 * calendar feed URL. The parameter names stay, so a trace still shows what was asked.
 *
 * The same few lines live in apps/app/src/lib and apps/api/src/common: two apps, no shared
 * package for tracing.
 */
const URL_ATTRIBUTES = ["url.full", "url.path", "url.query", "http.url", "http.target"];

/** A URL, a path or a bare query string, without query values or calendar secrets. */
export function scrubUrl(value: string): string {
  const secretless = value.replace(/(\/calendar\/)[\w-]{20,64}(\.ics)/g, "$1[secret]$2");
  // `url.query` holds a bare query ("lat=1&lng=2"); the others hold a URL or a path.
  const at = secretless.indexOf("?");
  const query = at !== -1 ? at + 1 : /^[^/]*=/.test(secretless) ? 0 : -1;
  if (query === -1) return secretless;
  const scrubbed = secretless
    .slice(query)
    .replace(
      /(^|&)([^=&#]*)=[^&#]*/g,
      (_, start: string, name: string) => `${start}${name}=[redacted]`,
    );
  return secretless.slice(0, query) + scrubbed;
}

/** Cleans the URL attributes of every span before it's exported. Put it before the exporter. */
export class ScrubUrls implements SpanProcessor {
  onStart(): void {}
  onEnding(span: Span): void {
    for (const key of URL_ATTRIBUTES) {
      const value = span.attributes[key];
      if (typeof value === "string") span.setAttribute(key, scrubUrl(value));
    }
  }
  onEnd(): void {}
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
