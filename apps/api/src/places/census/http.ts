import { USER_AGENT } from "../../events/engine/fetcher.js";

// The census's way out to the web: the FAA's open-data API and the Census Bureau's files. One
// request at a time, a pause between requests, the engine's User-Agent, and a couple of retries
// when a server is busy. These are public data services meant to be read by programs, so there
// is no robots.txt step here (both hosts allow it anyway).

export interface CensusHttpOptions {
  /** Pause between two requests. */
  pauseMs?: number;
  timeoutMs?: number;
  retries?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class CensusHttp {
  private readonly pauseMs: number;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private lastRequest = -Infinity;
  /** Requests made, for the run report. */
  requests = 0;

  constructor(options: CensusHttpOptions = {}) {
    this.pauseMs = options.pauseMs ?? 1000;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.retries = options.retries ?? 2;
    this.fetchImpl = options.fetch ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async json(url: string): Promise<unknown> {
    const response = await this.get(url);
    return response.json() as Promise<unknown>;
  }

  async bytes(url: string): Promise<Uint8Array> {
    const response = await this.get(url);
    return new Uint8Array(await response.arrayBuffer());
  }

  /** The status of a URL without downloading it (HEAD), or 0 if it can't be reached. */
  async status(url: string): Promise<number> {
    try {
      await this.wait();
      const response = await this.fetchImpl(url, {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return response.status;
    } catch {
      return 0;
    }
  }

  private async get(url: string): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      await this.wait();
      let response: Response | undefined;
      let failure: string;
      try {
        response = await this.fetchImpl(url, {
          headers: { "User-Agent": USER_AGENT, Accept: "application/json, */*" },
          redirect: "follow",
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (response.ok) return response;
        failure = `HTTP ${response.status}`;
      } catch (error) {
        failure = (error as Error).message;
      }
      const busy = !response || response.status === 429 || response.status >= 500;
      if (!busy || attempt >= this.retries) throw new Error(`${failure} for ${url}`);
      await this.sleep(this.pauseMs * 5 * (attempt + 1));
    }
  }

  /**
   * Waits longer each time before asking again: for a server that says "slow down" inside a normal
   * answer (ArcGIS answers HTTP 200 with a "Too many requests" error), 30 s, 60 s, 120 s…
   */
  async backoff(attempt: number): Promise<void> {
    await this.sleep(this.pauseMs * 30 * 2 ** attempt);
  }

  private async wait() {
    const wait = this.lastRequest + this.pauseMs - Date.now();
    if (wait > 0) await this.sleep(wait);
    this.lastRequest = Date.now();
    this.requests++;
  }
}
