import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { addEvent, inDays } from "./data.ts";
import { AN_EVENT, editEvent, vevent, word } from "./public.ts";

// docs/bits/events.event-calendar.md: "Add to calendar" on an event's page downloads that one event
// as an .ics file; only events with announced dates have one.
test.describe("events.event-calendar", () => {
  test("Add to calendar downloads the event, with its days, place and page", async ({
    page,
    playwright,
  }) => {
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${word()} Warbird Weekend`,
      place: "markham-park",
      startDate: "2031-05-09",
      endDate: "2031-05-10",
      url: "https://example.com/e2e-warbirds",
    });

    await page.goto(`/events/${event.slug}`);
    const downloading = page.waitForEvent("download");
    await page.getByRole("link", { name: "Add to calendar" }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(`${event.slug}.ics`);

    const ics = readFileSync(await download.path(), "utf8");
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r?\n/);
    expect(ics).toContain(`X-WR-CALNAME:${event.name}`);
    const entry = vevent(ics, `${event.slug}@servo`);
    expect(entry, `no VEVENT for ${event.slug}`).toBeTruthy();
    expect(entry).toContain(`SUMMARY:${event.name}`);
    // All-day dates; the end is the day after the last one, as calendars expect.
    expect(entry).toContain("DTSTART;VALUE=DATE:20310509");
    expect(entry).toContain("DTEND;VALUE=DATE:20310511");
    expect(entry).toContain("LOCATION:Markham Park\\, 16001 W State Road 84\\, Sunrise\\, FL");
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- test code: the pattern is built from the test's own data.
    expect(entry).toMatch(new RegExp(`\\nURL:https?://[^/]+/events/${event.slug}\\r?\\n`));
    expect(entry).toContain("Organiser: https://example.com/e2e-warbirds");
    expect(entry).not.toContain("STATUS:CANCELLED");
  });

  test("an event without announced dates has no calendar file", async ({
    page,
    request,
    playwright,
  }) => {
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${word()} Spring Fun Fly`,
      startDate: inDays(60),
    });
    await editEvent(playwright, event.slug, { datePrecision: "month" });

    await page.goto(`/events/${event.slug}`);
    await expect(page.getByText("The organiser hasn't announced dates yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Add to calendar" })).toHaveCount(0);
    expect((await request.get(`/events/${event.slug}/calendar.ics`)).status()).toBe(404);
  });

  test("an unknown event has no calendar file", async ({ request }) => {
    const response = await request.get(
      `/events/${word("no-such-event-").toLowerCase()}/calendar.ics`,
    );
    expect(response.status()).toBe(404);
  });
});
