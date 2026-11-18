import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, type Page, test } from "@playwright/test";
import { addEvent, inDays } from "./data.ts";
import { APP } from "./env.ts";
import { AN_EVENT, word } from "./public.ts";

// docs/bits/organiser.widget.md: a club pastes an iframe of /embed/clubs/<slug> on its own site and
// it shows the club's upcoming events: plain HTML, every text escaped, no scripts or forms, the one
// path any site may frame. Seeded clubs are read here, never changed.
test.describe("organiser.widget", () => {
  // A made-up club website that frames a path of SunTzu RC, served by the test on this machine (a
  // page Playwright made up would count as a public site, and Chrome won't let those frame
  // localhost). Its frame marks itself loaded, blocked or not.
  let clubSite: Server;
  test.beforeAll(async () => {
    clubSite = createServer((request, response) => {
      const path =
        new URL(request.url ?? "/", "http://club.invalid").searchParams.get("frame") ?? "/";
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><html lang="en"><head><title>Our club</title></head><body>
        <h1>Welcome to our club</h1>
        <iframe src="${APP}${path}" title="Our calendar" width="400" height="500"
          onload="this.dataset.loaded = 'yes'"></iframe>
      </body></html>`);
    });
    await new Promise<void>((resolve) => clubSite.listen(0, "127.0.0.1", resolve));
  });
  test.afterAll(() => new Promise<void>((resolve) => clubSite.close(() => resolve())));

  /** Opens the club's website with `path` in its frame, once the frame has loaded. */
  async function clubSiteFraming(page: Page, path: string) {
    const { port } = clubSite.address() as AddressInfo;
    await page.goto(`http://127.0.0.1:${port}/?frame=${encodeURIComponent(path)}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome to our club" }),
    ).toBeVisible();
    const frame = page.getByTitle("Our calendar");
    await expect(frame).toHaveAttribute("data-loaded", "yes");
    return frame.contentFrame();
  }

  test("a club's website frames the widget and it lists the club's upcoming events, escaped", async ({
    page,
    playwright,
  }) => {
    // A name with HTML in it must read as text, never become markup.
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      kind: "swap-meet",
      name: `${word()} <b>Swap</b> & "Meet"`,
      host: "imperial-rc-club",
      placeText: "Largo, FL",
      startDate: inDays(9),
    });

    const widget = await clubSiteFraming(page, "/embed/clubs/imperial-rc-club");
    await expect(
      widget.getByRole("heading", { level: 1, name: "Imperial R/C Club: upcoming" }),
    ).toBeVisible();
    const link = widget.getByRole("link", { name: event.name });
    await expect(link).toBeVisible();
    await expect(link).toContainText("Largo, FL");
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- test code: the pattern is built from the test's own data.
    await expect(link).toHaveAttribute("href", new RegExp(`^https?://[^/]+/events/${event.slug}$`));
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener");
    await expect(widget.locator("b")).toHaveCount(0);
    await expect(widget.getByRole("link", { name: "Follow on SunTzu RC" })).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/clubs\/imperial-rc-club$/,
    );
  });

  test("only the widget may be framed: its headers say so, and a club page won't show in a frame", async ({
    page,
    request,
  }) => {
    const response = await request.get("/embed/clubs/imperial-rc-club");
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(headers["cache-control"]).toBe("public, max-age=300");
    expect(headers["x-frame-options"]).toBeUndefined();
    const policy = headers["content-security-policy"]!.split(/;\s*/);
    expect(policy).toEqual(
      expect.arrayContaining([
        "default-src 'none'",
        "style-src 'unsafe-inline'",
        "form-action 'none'",
        "frame-ancestors *",
      ]),
    );
    // Plain HTML: nothing that runs, nothing to submit.
    const html = await response.text();
    expect(html).not.toMatch(/<script|<form|<iframe/i);
    for (const [, href] of html.matchAll(/<a href="([^"]*)"/g))
      expect(href).toMatch(/^https?:\/\/[^/]+\//);

    // Every other page refuses to be framed.
    expect((await request.get("/clubs/imperial-rc-club")).headers()["x-frame-options"]).toBe(
      "DENY",
    );
    const club = await clubSiteFraming(page, "/clubs/imperial-rc-club");
    await expect(club.getByRole("heading", { name: "Imperial R/C Club" })).toHaveCount(0);
    // The same club's widget, framed the same way, does show.
    const widget = await clubSiteFraming(page, "/embed/clubs/imperial-rc-club");
    await expect(
      widget.getByRole("heading", { name: "Imperial R/C Club: upcoming" }),
    ).toBeVisible();
  });

  test("an unknown club has no widget", async ({ request }) => {
    expect(
      (await request.get(`/embed/clubs/${word("no-such-club-").toLowerCase()}`)).status(),
    ).toBe(404);
    expect((await request.get("/embed/clubs/Not%20A%20Slug")).status()).toBe(404);
  });
});
