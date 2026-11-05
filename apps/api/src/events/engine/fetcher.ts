import { ALLOW_ALL, DISALLOW_ALL, parseRobots, type RobotsRules } from "./robots.js";

// The engine's only way out to the web. It says who it is, reads robots.txt before touching a
// site and obeys it, waits between requests to the same site, and asks for a page only if it
// changed (ETag / Last-Modified). There is no switch to skip robots.txt: a source that needs
// it gets the organiser's permission another way (a feed they give us, a partnership).

// The contact URL becomes Servo's own page once the domain exists (roadmap C3).
export const USER_AGENT = "ServoBot/0.1 (+https://github.com/ITACA-TECHNOLOGIES/rc-landing)";

export interface Page {
  url: string;
  status: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
  body: string;
  durationMs: number;
}

export type FetchOutcome =
  | { ok: true; page: Page }
  | { ok: false; reason: "robots" | "error"; url: string; error: string; status?: number };

export interface FetcherOptions {
  userAgent?: string;
  /** Pause between two requests to the same host, unless robots.txt asks for more. */
  minDelayMs?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class PoliteFetcher {
  private readonly userAgent: string;
  private readonly minDelayMs: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly robots = new Map<string, Promise<RobotsRules>>();
  private readonly lastRequest = new Map<string, number>();

  constructor(options: FetcherOptions = {}) {
    this.userAgent = options.userAgent ?? USER_AGENT;
    this.minDelayMs = options.minDelayMs ?? 2000;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetch ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async get(
    url: string,
    cache: { etag?: string; lastModified?: string } = {},
  ): Promise<FetchOutcome> {
    const target = new URL(url);
    const rules = await this.rulesFor(target);
    if (!rules.allows(target.pathname + target.search)) {
      return {
        ok: false,
        reason: "robots",
        url,
        error: `robots.txt of ${target.host} disallows it`,
      };
    }
    const headers: Record<string, string> = {};
    if (cache.etag) headers["If-None-Match"] = cache.etag;
    if (cache.lastModified) headers["If-Modified-Since"] = cache.lastModified;
    try {
      const started = Date.now();
      const response = await this.request(target, rules, headers);
      const page: Page = {
        url: response.url || url,
        status: response.status,
        body: response.status === 304 ? "" : await response.text(),
        durationMs: Date.now() - started,
        ...optional("contentType", response.headers.get("content-type")),
        ...optional("etag", response.headers.get("etag")),
        ...optional("lastModified", response.headers.get("last-modified")),
      };
      if (response.status !== 304 && !response.ok) {
        return {
          ok: false,
          reason: "error",
          url,
          status: response.status,
          error: `HTTP ${response.status}`,
        };
      }
      return { ok: true, page };
    } catch (error) {
      return { ok: false, reason: "error", url, error: (error as Error).message };
    }
  }

  private rulesFor(target: URL): Promise<RobotsRules> {
    let rules = this.robots.get(target.origin);
    if (!rules) {
      rules = this.request(new URL("/robots.txt", target.origin), ALLOW_ALL, {})
        .then(async (response) => {
          if (response.ok) return parseRobots(await response.text(), this.userAgent);
          // RFC 9309: no robots.txt (4xx) allows everything; a server error allows nothing.
          return response.status >= 500 ? DISALLOW_ALL : ALLOW_ALL;
        })
        .catch(() => DISALLOW_ALL);
      this.robots.set(target.origin, rules);
    }
    return rules;
  }

  private async request(target: URL, rules: RobotsRules, headers: Record<string, string>) {
    const delay = Math.max(this.minDelayMs, (rules.crawlDelaySeconds ?? 0) * 1000);
    const wait = (this.lastRequest.get(target.host) ?? -Infinity) + delay - Date.now();
    if (wait > 0) await this.sleep(wait);
    this.lastRequest.set(target.host, Date.now());
    return this.fetchImpl(target, {
      headers: { "User-Agent": this.userAgent, ...headers },
      redirect: "follow",
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }
}

function optional<K extends string>(key: K, value: string | null) {
  return (value ? { [key]: value } : {}) as Partial<Record<K, string>>;
}
