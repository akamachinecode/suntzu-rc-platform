import { describe, expect, it } from "vitest";
import { PoliteFetcher } from "./fetcher.js";

/** A fake web: robots.txt and pages by URL, and a log of every request with its headers. */
function fakeWeb(
  pages: Record<string, { status?: number; body?: string; headers?: Record<string, string> }>,
) {
  const requests: { url: string; headers: Record<string, string> }[] = [];
  const fetchImpl = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = input.toString();
    requests.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const page = pages[url];
    if (!page) return new Response("not found", { status: 404 });
    return new Response(page.status === 304 ? null : (page.body ?? ""), {
      status: page.status ?? 200,
      headers: page.headers,
    });
  }) as typeof fetch;
  return { fetchImpl, requests };
}

describe("PoliteFetcher", () => {
  it("does not fetch what robots.txt disallows", async () => {
    const web = fakeWeb({
      "https://calendar.test/robots.txt": { body: "User-agent: *\nDisallow: /" },
    });
    const fetcher = new PoliteFetcher({ fetch: web.fetchImpl, minDelayMs: 0 });
    const outcome = await fetcher.get("https://calendar.test/feed.ics");
    expect(outcome).toMatchObject({ ok: false, reason: "robots" });
    expect(web.requests.map((r) => r.url)).toEqual(["https://calendar.test/robots.txt"]);
  });

  it("identifies itself, sends cache headers and reads robots.txt once per site", async () => {
    const web = fakeWeb({
      "https://club.test/robots.txt": { body: "User-agent: *\nAllow: /" },
      "https://club.test/a": { body: "page a", headers: { etag: '"v1"' } },
      "https://club.test/b": { status: 304 },
    });
    const fetcher = new PoliteFetcher({ fetch: web.fetchImpl, minDelayMs: 0 });
    const first = await fetcher.get("https://club.test/a");
    const second = await fetcher.get("https://club.test/b", { etag: '"v1"' });

    expect(first).toMatchObject({ ok: true, page: { status: 200, body: "page a", etag: '"v1"' } });
    expect(second).toMatchObject({ ok: true, page: { status: 304, body: "" } });
    expect(web.requests.map((r) => r.url)).toEqual([
      "https://club.test/robots.txt",
      "https://club.test/a",
      "https://club.test/b",
    ]);
    expect(web.requests[2]!.headers).toMatchObject({
      "User-Agent": expect.stringMatching(/^ServoBot\//),
      "If-None-Match": '"v1"',
    });
  });

  it("waits between requests to the same site, longer if robots.txt asks", async () => {
    const waits: number[] = [];
    const web = fakeWeb({
      "https://slow.test/robots.txt": { body: "User-agent: *\nCrawl-delay: 10" },
      "https://slow.test/a": { body: "a" },
      "https://slow.test/b": { body: "b" },
    });
    const fetcher = new PoliteFetcher({
      fetch: web.fetchImpl,
      minDelayMs: 2000,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    await fetcher.get("https://slow.test/a");
    await fetcher.get("https://slow.test/b");
    // robots.txt → a: the 2 s minimum; a → b: the 10 s the site asks for.
    expect(waits).toHaveLength(2);
    expect(waits[0]).toBeGreaterThan(1900);
    expect(waits[1]).toBeGreaterThan(9900);
  });

  it("stops at a bot wall shown instead of robots.txt, without asking for the page", async () => {
    // What every DualRates club site answered from outside its allowed regions (2026-10-27).
    const sentry =
      "<!DOCTYPE html><html><head><title>DualRates Security Protection Sentry</title></head>" +
      "<body>Access to this page is currently limited to specific regions</body></html>";
    const web = fakeWeb({
      "https://club.test/robots.txt": { body: sentry, headers: { "content-type": "text/html" } },
      "https://club.test/events": { body: sentry },
    });
    const fetcher = new PoliteFetcher({ fetch: web.fetchImpl, minDelayMs: 0 });
    expect(await fetcher.get("https://club.test/events")).toMatchObject({
      ok: false,
      reason: "bot-wall",
      error: expect.stringContaining("DualRates region block"),
    });
    expect(web.requests.map((r) => r.url)).toEqual(["https://club.test/robots.txt"]);
  });

  it("reports a captcha page as a bot wall, not as the page", async () => {
    const web = fakeWeb({
      "https://club.test/robots.txt": { body: "User-agent: *\nAllow: /" },
      "https://club.test/": {
        status: 202,
        body: '<html><head><meta http-equiv="refresh" content="0;/.well-known/sgcaptcha/?r=%2F"></head></html>',
      },
    });
    const fetcher = new PoliteFetcher({ fetch: web.fetchImpl, minDelayMs: 0 });
    expect(await fetcher.get("https://club.test/")).toMatchObject({
      ok: false,
      reason: "bot-wall",
      status: 202,
    });
  });

  it("reports HTTP errors without throwing", async () => {
    const web = fakeWeb({ "https://club.test/robots.txt": { status: 404 } });
    const fetcher = new PoliteFetcher({ fetch: web.fetchImpl, minDelayMs: 0 });
    expect(await fetcher.get("https://club.test/missing")).toMatchObject({
      ok: false,
      reason: "error",
      status: 404,
    });
  });
});
