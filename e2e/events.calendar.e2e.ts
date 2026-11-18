import { expect, test } from "@playwright/test";
import { addEvent, inDays } from "./data.ts";
import { API } from "./env.ts";
import { AN_EVENT, editEvent, floridaDate, vevent, word } from "./public.ts";

// docs/bits/events.calendar.md: anyone subscribes to /events/calendar.ics (all events or one
// discipline) on the site's own domain. The feed holds every upcoming event with announced dates;
// cancelled ones stay, marked, so subscribers find out.
test.describe("events.calendar", () => {
  test("the calendar on /events subscribes to the site's own feed, for everything or one discipline", async ({
    page,
    request,
  }) => {
    await page.goto("/events");
    const subscribe = page.getByRole("region", { name: "Put the calendar in your phone" });
    const apple = subscribe.getByRole("link", { name: "Apple or Outlook" });
    await expect(apple).toHaveAttribute("href", /^webcal:\/\/[^/]+\/events\/calendar\.ics$/);

    await subscribe.getByLabel("Which events").selectOption({ label: "Cars" });
    await expect(apple).toHaveAttribute(
      "href",
      /^webcal:\/\/[^/]+\/events\/calendar\.ics\?discipline=ground$/,
    );
    const webcal = (await apple.getAttribute("href"))!;
    await expect(subscribe.getByRole("link", { name: /Google Calendar/ })).toHaveAttribute(
      "href",
      `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    );

    // What the calendar app fetches: the same address over http(s), on this site.
    const feed = new URL(webcal.replace(/^webcal:/, "http:"));
    const response = await request.get(`${feed.pathname}${feed.search}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^text\/calendar/);
    expect(response.headers()["cache-control"]).toBe("public, max-age=300");
    const ics = await response.text();
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r?\n/);
    expect(ics).toContain("X-WR-CALNAME:SunTzu RC: RC events (cars)");

    // A filter the API refuses is refused here too (the API's status is passed through).
    expect((await request.get("/events/calendar.ics?discipline=boats")).status()).toBe(400);
  });

  test("the feed has upcoming events with announced dates, keeps cancelled ones marked, and filters", async ({
    request,
    playwright,
  }) => {
    const find = word();
    const plane = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Plane Fly-in`,
      startDate: inDays(14),
    });
    const car = await addEvent(playwright, {
      kind: "race",
      discipline: "ground",
      name: `${find} Car Race`,
      startDate: inDays(15),
    });
    const cancelled = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Rained Out`,
      startDate: inDays(16),
    });
    await editEvent(playwright, cancelled.slug, { status: "cancelled" });
    const someday = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Someday Fly`,
      startDate: inDays(40),
    });
    await editEvent(playwright, someday.slug, { datePrecision: "month" });
    const over = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Over Fly`,
      startDate: floridaDate(-2),
    });

    // The site's feed relays this one and keeps it for 5 minutes, so a new event is checked here.
    const all = await (await request.get(`${API}/events/calendar.ics`)).text();
    expect(vevent(all, `${plane.slug}@servo`)).toContain(`SUMMARY:${plane.name}`);
    expect(vevent(all, `${car.slug}@servo`)).toContain(`SUMMARY:${car.name}`);
    const off = vevent(all, `${cancelled.slug}@servo`);
    expect(off).toContain("STATUS:CANCELLED");
    expect(off).toContain(`SUMMARY:CANCELLED: ${cancelled.name}`);
    expect(
      vevent(all, `${someday.slug}@servo`),
      "only events with announced dates",
    ).toBeUndefined();
    expect(vevent(all, `${over.slug}@servo`), "only events from today on").toBeUndefined();

    const cars = await (await request.get(`${API}/events/calendar.ics?discipline=ground`)).text();
    expect(cars).toContain("X-WR-CALNAME:SunTzu RC: RC events (cars)");
    expect(vevent(cars, `${car.slug}@servo`)).toBeTruthy();
    expect(vevent(cars, `${plane.slug}@servo`)).toBeUndefined();
  });
});
