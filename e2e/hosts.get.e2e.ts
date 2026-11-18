import { expect, test } from "@playwright/test";
import { addEvent, inDays } from "./data.ts";
import { API } from "./env.ts";
import { AN_EVENT, structuredData, vevent, word } from "./public.ts";

// docs/bits/hosts.get.md: a club's or track's page shows what's coming up, where they fly, how to
// follow it, claim it and subscribe to its calendar. Seeded clubs are read here, never changed.
test.describe("hosts.get", () => {
  test("a club's page shows its events, its fields, its website and its calendar", async ({
    page,
    request,
    playwright,
  }) => {
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${word()} Bush Plane Day`,
      host: "rc-bush-pilots",
      place: "dyer-park",
      startDate: inDays(24),
    });

    await page.goto("/clubs/rc-bush-pilots");
    await expect(page).toHaveTitle(/^RC Bush Pilots/);
    await expect(page.getByRole("heading", { level: 1, name: "RC Bush Pilots" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Their website/ })).toHaveAttribute(
      "href",
      "https://rcbushpilots.com",
    );
    await expect(page.getByRole("link", { name: "Follow this club" })).toHaveAttribute(
      "href",
      `/sign-in?next=${encodeURIComponent("/clubs/rc-bush-pilots")}`,
    );

    const coming = page.getByRole("region", { name: "Coming up" });
    await expect(coming.getByRole("link", { name: event.name })).toHaveAttribute(
      "href",
      `/events/${event.slug}`,
    );
    const fields = page.getByRole("complementary", { name: "Where they fly" });
    await expect(fields.getByRole("link", { name: "Dyer Park" })).toHaveAttribute(
      "href",
      "/places/dyer-park",
    );
    await expect(fields.getByRole("link", { name: "Claim it on SunTzu RC" })).toHaveAttribute(
      "href",
      "/organise?club=rc-bush-pilots",
    );
    expect(await structuredData(page, "SportsClub")).toMatchObject({
      name: "RC Bush Pilots",
      url: "https://rcbushpilots.com",
    });

    // The club's own calendar, on the site's domain.
    const calendar = page.getByRole("region", { name: "RC Bush Pilots's calendar" });
    const apple = calendar.getByRole("link", { name: "Apple or Outlook" });
    await expect(apple).toHaveAttribute(
      "href",
      /^webcal:\/\/[^/]+\/clubs\/rc-bush-pilots\/calendar\.ics$/,
    );
    const feed = await request.get("/clubs/rc-bush-pilots/calendar.ics");
    expect(feed.status()).toBe(200);
    expect(feed.headers()["content-type"]).toMatch(/^text\/calendar/);
    expect(await feed.text()).toMatch(/^BEGIN:VCALENDAR\r?\n/);
    // That feed relays this one for 5 minutes: a new event is checked at the source.
    const source = await (
      await request.get(`${API}/events/calendar.ics?host=rc-bush-pilots`)
    ).text();
    expect(vevent(source, `${event.slug}@servo`)).toContain(`SUMMARY:${event.name}`);
  });

  test("a club's events don't show on another club's page", async ({ page, playwright }) => {
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${word()} Glades Fly-in`,
      host: "palm-beach-rc",
      startDate: inDays(26),
    });
    await page.goto("/clubs/palm-beach-rc");
    await expect(
      page.getByRole("region", { name: "Coming up" }).getByRole("link", { name: event.name }),
    ).toBeVisible();
    await page.goto("/clubs/rc-bush-pilots");
    await expect(page.getByRole("heading", { level: 1, name: "RC Bush Pilots" })).toBeVisible();
    await expect(page.getByRole("link", { name: event.name })).toHaveCount(0);
  });

  test("an unknown club shows the 404 page and isn't indexed; the API answers 404", async ({
    page,
    request,
  }) => {
    const slug = word("no-such-club-").toLowerCase();
    await page.goto(`/clubs/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    // The page streams behind its loading screen (spec 0010), so its status is already 200 when
    // the API says there's no such club: Next.js marks it noindex instead (docs/DECISIONS.md,
    // 2026-11-18). The API itself answers 404.
    await expect(page.locator('head meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
    );
    expect((await request.get(`${API}/hosts/${slug}`)).status()).toBe(404);
  });
});
