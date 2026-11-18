import { expect, type Page, test } from "@playwright/test";
import { addEvent, inDays } from "./data.ts";
import { API, APP } from "./env.ts";
import { AN_EVENT, floridaDate, weekendDay, word } from "./public.ts";

// docs/bits/events.list.md: /events lists published events from today on; the search field and
// the filters (discipline, kind, this weekend, beginners welcome, near me) work in the browser.
test.describe("events.list", () => {
  const results = (page: Page) =>
    page.getByRole("list", { name: /^Events, (soonest|closest) first$/ });
  const names = (page: Page) => results(page).getByRole("heading", { level: 3 });

  test("a new event is on the calendar, the search field finds it, and past ones aren't listed", async ({
    page,
    playwright,
  }) => {
    const find = word();
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Fun Fly`,
      placeText: "Ocala, FL",
    });
    await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Old Fly-in`,
      startDate: floridaDate(-3),
    });

    await page.goto("/events");
    await expect(
      page.getByRole("heading", { level: 1, name: "Where to be, and when." }),
    ).toBeVisible();
    await page.getByLabel("Search events, places and clubs").fill(find);
    // Only the upcoming one: the event from three days ago is over.
    await expect(names(page)).toHaveText([event.name]);
    await expect(results(page)).toContainText("Ocala, FL");

    await results(page).getByRole("link", { name: event.name }).click();
    await expect(page).toHaveURL(`/events/${event.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();
  });

  test("discipline, kind and beginners welcome narrow the list, from the page or its address", async ({
    page,
    playwright,
  }) => {
    const find = word();
    const plane = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Plane Day`,
      startDate: inDays(20),
      beginnerFriendly: true,
    });
    const cars = await addEvent(playwright, {
      kind: "race",
      discipline: "ground",
      name: `${find} Car Race`,
      startDate: inDays(21),
    });
    const helis = await addEvent(playwright, {
      kind: "competition",
      discipline: "rotor",
      name: `${find} Heli Cup`,
      startDate: inDays(22),
    });

    // A shared link keeps the search: soonest first.
    await page.goto(`/events?q=${find}`);
    await expect(page.getByLabel("Search events, places and clubs")).toHaveValue(find);
    await expect(names(page)).toHaveText([plane.name, cars.name, helis.name]);

    const disciplines = page.getByRole("group", { name: "Filter by discipline" });
    await disciplines.getByRole("button", { name: "Cars" }).click();
    await expect(disciplines.getByRole("button", { name: "Cars" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(names(page)).toHaveText([cars.name]);
    await disciplines.getByRole("button", { name: "All disciplines" }).click();

    const kinds = page.getByRole("group", { name: "Filter by kind of event" });
    await kinds.getByRole("button", { name: "Competitions" }).click();
    await expect(names(page)).toHaveText([helis.name]);
    await kinds.getByRole("button", { name: "Everything" }).click();
    await expect(names(page)).toHaveText([plane.name, cars.name, helis.name]);

    await page.getByRole("button", { name: "Beginners welcome" }).click();
    await expect(names(page)).toHaveText([plane.name]);

    // The same filters from the address (the home page and search link to them).
    await page.goto(`/events?discipline=ground&q=${find}`);
    await expect(names(page)).toHaveText([cars.name]);
    await page.goto(`/events?beginners=1&q=${find}`);
    await expect(page.getByRole("button", { name: "Beginners welcome" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(names(page)).toHaveText([plane.name]);
    await page.goto(`/events?kind=race&q=${find}`);
    await expect(names(page)).toHaveText([cars.name]);
  });

  test("this weekend shows only what runs from Friday to Sunday in Florida", async ({
    page,
    playwright,
  }) => {
    const find = word();
    const weekend = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Weekend Fly`,
      startDate: weekendDay(),
    });
    // Two weeks from today is never this weekend.
    const later = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Later Fly`,
      startDate: floridaDate(14),
    });

    await page.goto(`/events?when=weekend&q=${find}`);
    await expect(page.getByRole("button", { name: "This weekend" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(names(page)).toHaveText([weekend.name]);

    await page.getByRole("button", { name: "This weekend" }).click();
    await expect(names(page)).toHaveText([weekend.name, later.name]);
  });

  test.describe("near me", () => {
    // In Dyer Park, West Palm Beach.
    test.use({
      geolocation: { latitude: 26.7803, longitude: -80.1297 },
      permissions: ["geolocation"],
    });

    test("sorts the closest first, and the location never leaves the browser", async ({
      page,
      playwright,
    }) => {
      const find = word();
      const far = await addEvent(playwright, {
        ...AN_EVENT,
        name: `${find} Miami Jets`,
        place: "silver-field",
        startDate: inDays(15),
      });
      const near = await addEvent(playwright, {
        ...AN_EVENT,
        name: `${find} Dyer Fly-in`,
        place: "dyer-park",
        startDate: inDays(25),
      });

      await page.goto(`/events?q=${find}`);
      await expect(names(page)).toHaveText([far.name, near.name]);
      await expect(
        page.getByText("It stays on this device: SunTzu RC never receives it."),
      ).toBeVisible();

      const sent: string[] = [];
      page.on("request", (request) => {
        if (request.url().startsWith(APP) || request.url().startsWith(API)) {
          sent.push(`${request.url()} ${request.postData() ?? ""}`);
        }
      });
      await page.getByRole("button", { name: "Near me" }).click();
      await expect(page.getByRole("button", { name: "Back to dates" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(names(page)).toHaveText([near.name, far.name]);
      await expect(
        results(page).getByRole("listitem").first().getByText("0 mi", { exact: true }),
      ).toBeVisible();
      expect(sent.filter((line) => /26\.78|80\.12/.test(line))).toEqual([]);
    });
  });
});
