import { expect, test } from "@playwright/test";
import { addEvent, inDays } from "./data.ts";
import { AN_EVENT, editEvent, floridaDate, structuredData, word } from "./public.ts";

// docs/bits/events.get.md: an event's page says what, when and where, who runs it, where the facts
// come from and what to do next; once it's over (where it happens) it asks whether it was right.
test.describe("events.get", () => {
  test("an event's page shows what it is, when, where, who runs it and where that comes from", async ({
    page,
    playwright,
  }) => {
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${word()} Scale Fly-in`,
      place: "dyer-park",
      startDate: "2031-03-14",
      endDate: "2031-03-16",
      summary: "Three days of scale planes, with a swap table on Saturday.",
      url: "https://example.com/e2e-scale-fly-in",
      beginnerFriendly: true,
    });

    await page.goto(`/events/${event.slug}`);
    await expect(page).toHaveTitle(`${event.name}, Mar 14–16, 2031 · SunTzu RC`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();
    await expect(page.getByText("Mar 14–16, 2031", { exact: true })).toBeVisible();
    for (const tag of ["Fly-in", "Planes and jets", "Beginners welcome"]) {
      await expect(
        page.getByRole("listitem").filter({ hasText: new RegExp(`^${tag}$`) }),
      ).toBeVisible();
    }
    await expect(
      page.getByText("Three days of scale planes, with a swap table on Saturday."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Organiser's page/ })).toHaveAttribute(
      "href",
      "https://example.com/e2e-scale-fly-in",
    );
    await expect(page.getByRole("link", { name: "Add to calendar" })).toHaveAttribute(
      "href",
      `/events/${event.slug}/calendar.ics`,
    );
    // Following and going need an account: signed out, both lead to sign-in and back here.
    await expect(page.getByRole("link", { name: "I'm going" })).toHaveAttribute(
      "href",
      `/sign-in?next=${encodeURIComponent(`/events/${event.slug}`)}`,
    );

    const where = page.getByRole("complementary", { name: "Where" });
    await expect(where.getByText("Dyer Park", { exact: true })).toBeVisible();
    await expect(where.getByText("7301 Haverhill Rd, West Palm Beach, FL")).toBeVisible();
    await expect(where.getByRole("link", { name: /RC Bush Pilots/ })).toHaveAttribute(
      "href",
      "https://rcbushpilots.com",
    );
    await expect(where.getByRole("link", { name: /Directions/ })).toBeVisible();

    const sources = page.getByRole("region", { name: "Where this comes from" });
    await expect(
      sources.getByText("Checked by the SunTzu RC crew against the organiser's page"),
    ).toBeVisible();
    await expect(sources.getByRole("link", { name: /example\.com/ })).toHaveAttribute(
      "href",
      "https://example.com/e2e-scale-fly-in",
    );

    // Search engines get the event too, with its exact dates and place.
    const data = await structuredData(page, "Event");
    expect(data).toMatchObject({
      name: event.name,
      startDate: "2031-03-14",
      endDate: "2031-03-16",
      eventStatus: "https://schema.org/EventScheduled",
      location: { name: "Dyer Park", address: { addressLocality: "West Palm Beach" } },
      organizer: { name: "RC Bush Pilots" },
    });

    await page.getByRole("link", { name: "All events" }).click();
    await expect(page).toHaveURL("/events");
  });

  test("a cancelled event says so, and offers no calendar", async ({ page, playwright }) => {
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${word()} Cancelled Fly`,
      startDate: inDays(30),
    });
    await editEvent(playwright, event.slug, { status: "cancelled" });

    await page.goto(`/events/${event.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Add to calendar" })).toHaveCount(0);
    // Nobody can say they're going to it, though they can still follow it.
    await expect(page.getByRole("link", { name: "Follow" })).toBeVisible();
    await expect(page.getByRole("link", { name: "I'm going" })).toHaveCount(0);
    expect(await structuredData(page, "Event")).toMatchObject({
      eventStatus: "https://schema.org/EventCancelled",
    });
  });

  test("an event is over once its last day has ended in Florida: then it asks whether it was right", async ({
    page,
    playwright,
  }) => {
    const find = word();
    // Today in Florida: still on, even after 8 pm when it's already tomorrow in UTC.
    const today = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Today Fly`,
      startDate: floridaDate(),
    });
    await page.goto(`/events/${today.slug}`);
    await expect(page.getByRole("link", { name: "Add to calendar" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "That was it" })).toHaveCount(0);

    // Last year's edition, and this year's: the old page points to the new one.
    const past = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Jet Rally`,
      startDate: floridaDate(-1),
    });
    const next = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Jet Rally`,
      startDate: floridaDate(60),
    });
    await page.goto(`/events/${past.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: past.name })).toBeVisible();
    const after = page.getByRole("region", { name: "That was it" });
    await expect(after.getByText("Were you there? Was this information right?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Add to calendar" })).toHaveCount(0);
    await after.getByRole("link").first().click();
    await expect(page).toHaveURL(`/events/${next.slug}`);
    await expect(
      page.getByRole("region", { name: "Other editions" }).getByRole("link"),
    ).toHaveAttribute("href", `/events/${past.slug}`);
  });

  test("an unknown event shows the 404 page, answers 404 and isn't indexed", async ({ page }) => {
    const response = await page.goto(`/events/${word("no-such-event-").toLowerCase()}`);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    // Search engines and link checkers read the status, not the page.
    expect(response?.status()).toBe(404);
  });
});
