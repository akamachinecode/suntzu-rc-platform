import { describe, expect, it } from "vitest";
import { parseRobots } from "./robots.js";

const agent = "ServoBot/0.1 (+https://example.test)";

describe("parseRobots", () => {
  it("blocks Google Calendar feeds (calendar.google.com, 2026-10-22)", () => {
    const rules = parseRobots("User-agent: *\nAllow: /$\nDisallow: /", agent);
    expect(rules.allows("/")).toBe(true);
    expect(rules.allows("/calendar/ical/abc%40group.calendar.google.com/public/basic.ics")).toBe(
      false,
    );
  });

  it("follows the AMPS rules (Wix, 2026-10-22)", () => {
    const rules = parseRobots(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: *?lightbox=",
        "",
        "User-agent: PetalBot",
        "Disallow: /",
        "",
        "User-agent: dotbot",
        "Crawl-delay: 10",
      ].join("\n"),
      agent,
    );
    expect(rules.allows("/event-details-registration/aerofest-2")).toBe(true);
    expect(rules.allows("/gallery?lightbox=1")).toBe(false);
    expect(rules.crawlDelaySeconds).toBeUndefined();
  });

  it("uses our own group, with its crawl delay, over the * group", () => {
    const rules = parseRobots(
      "User-agent: *\nDisallow: /\n\nUser-agent: servobot\nDisallow: /private\nCrawl-delay: 10",
      agent,
    );
    expect(rules.allows("/events")).toBe(true);
    expect(rules.allows("/private/x")).toBe(false);
    expect(rules.crawlDelaySeconds).toBe(10);
  });

  it("lets the longest rule win, and Allow win a tie", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /events\nAllow: /events/public", agent);
    expect(rules.allows("/events/2026")).toBe(false);
    expect(rules.allows("/events/public/list")).toBe(true);
  });

  it("waits as long as Request-rate asks when it is slower than Crawl-delay (Wild Apricot)", () => {
    // RCACF's robots.txt (Wild Apricot, 2026-10-27): one request a minute.
    const rules = parseRobots(
      "User-agent: *\nDisallow: /Sys/Login\nRequest-rate: 1/60\nCrawl-delay: 10",
      agent,
    );
    expect(rules.allows("/events/RSS")).toBe(true);
    expect(rules.allows("/Sys/Login")).toBe(false);
    expect(rules.crawlDelaySeconds).toBe(60);
    expect(parseRobots("User-agent: *\nRequest-rate: 2/1m", agent).crawlDelaySeconds).toBe(30);
  });

  it("treats an empty Disallow as allow all", () => {
    expect(parseRobots("User-agent: *\nDisallow:", agent).allows("/anything")).toBe(true);
  });
});
