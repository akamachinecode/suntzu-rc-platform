import { expect, test } from "@playwright/test";
import { addEvent, inDays } from "./data.ts";
import { API } from "./env.ts";
import { AN_EVENT, floridaDate, word } from "./public.ts";

// docs/bits/search.query.md: the search box (on every page) and the results page /search?q= find
// published events, places, clubs and the guides. The index follows the database (triggers), so an
// event the crew just added is found by its name.
test.describe("search.query", () => {
  // Nothing on the site has this word, and it's no typo of one either.
  const NOTHING = "qzxvbnmkw";

  test("the results page finds a new event by name: upcoming first, the past one pointing to the next", async ({
    page,
    playwright,
  }) => {
    const find = word();
    const past = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Jet Rally`,
      startDate: floridaDate(-40),
    });
    const next = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Jet Rally`,
      startDate: inDays(30),
    });

    await page.goto(`/search?q=${find}`);
    await expect(
      page.getByRole("heading", { level: 1, name: `Results for “${find}”` }),
    ).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveValue(find);
    // Searches aren't pages for Google.
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    const events = page.getByRole("region", { name: "Events" });
    const items = events.getByRole("listitem");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0).getByRole("heading", { level: 3 }).getByRole("link")).toHaveAttribute(
      "href",
      `/events/${next.slug}`,
    );
    await expect(items.nth(0)).not.toContainText("Past");
    await expect(items.nth(1).getByRole("heading", { level: 3 }).getByRole("link")).toHaveAttribute(
      "href",
      `/events/${past.slug}`,
    );
    await expect(items.nth(1).getByText("Past", { exact: true })).toBeVisible();
    await expect(items.nth(1)).toContainText("Next edition:");
    await expect(items.nth(1).getByRole("link", { name: next.name }).last()).toHaveAttribute(
      "href",
      `/events/${next.slug}`,
    );

    // The tabs keep the search: only events, then clubs (none here).
    const tabs = page.getByRole("navigation", { name: "Kinds of result" });
    await tabs.getByRole("link", { name: "Events" }).click();
    await expect(page).toHaveURL(`/search?q=${find}&in=events`);
    await expect(tabs.getByRole("link", { name: "Events" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("region", { name: "Events" }).getByRole("listitem")).toHaveCount(2);
    await tabs.getByRole("link", { name: "Clubs" }).click();
    await expect(
      page.getByText(`Nothing found for “${find}” in clubs.`, { exact: false }),
    ).toBeVisible();
  });

  test("the search box finds it as you type and opens it; closing goes back to the Search link", async ({
    page,
    playwright,
  }) => {
    const find = word();
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${find} Night Fly`,
      startDate: inDays(12),
    });

    await page.goto("/places");
    const opener = page.getByRole("banner").getByRole("link", { name: "Search" });
    await opener.click();
    const box = page.getByRole("dialog", { name: "Search SunTzu RC" });
    await expect(box).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(box).toBeHidden();
    await expect(opener).toBeFocused();

    // "/" opens it from anywhere.
    await page.keyboard.press("/");
    const input = box.getByRole("combobox", { name: "Search SunTzu RC" });
    await input.fill(find);
    const option = box.getByRole("option", { name: new RegExp(event.name) });
    await expect(option).toBeVisible();
    await expect(box.getByRole("option", { name: `All results for “${find}”` })).toBeVisible();
    await input.press("ArrowDown");
    await expect(option).toHaveAttribute("aria-selected", "true");
    await input.press("Enter");
    await expect(page).toHaveURL(`/events/${event.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();
  });

  test("nothing found: the box and the page offer shortcuts, and Enter opens the results page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const box = page.getByRole("dialog", { name: "Search SunTzu RC" });
    await box.getByRole("combobox", { name: "Search SunTzu RC" }).fill(NOTHING);
    await expect(
      box.getByText(`Nothing found for “${NOTHING}”. Try fewer words, a town or a ZIP code.`),
    ).toBeVisible();
    await expect(box.getByRole("option", { name: "This weekend" })).toBeVisible();
    await expect(box.getByRole("option", { name: "Can I fly here?" })).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/search?q=${NOTHING}`);
    await expect(box).toBeHidden();
    const results = page.getByRole("region", { name: "Results" });
    await expect(
      results.getByText(`Nothing found for “${NOTHING}”.`, { exact: false }),
    ).toBeVisible();
    await expect(results.getByRole("link", { name: "This weekend" })).toHaveAttribute(
      "href",
      "/events?when=weekend",
    );
    await expect(results.getByRole("link", { name: "Can I fly here?" })).toHaveAttribute(
      "href",
      "/places/can-i-fly-here",
    );
  });

  test("a new event is found by its name at once, even when it looks like a word the site knows", async ({
    page,
    playwright,
  }) => {
    // "Palm" is on the site (Palm Beach); "Palm" and four new letters is a new name, not a typo.
    const name = `Palm${word().slice(0, 4).toLowerCase()}`;
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${name} Fun Fly`,
      startDate: inDays(33),
    });

    await page.goto(`/search?q=${name}`);
    const results = page.getByRole("region", { name: "Results" });
    await expect(results.getByRole("heading", { level: 3 }).first()).toHaveText(event.name);
  });

  test("places and clubs are found too; an empty or too long search is refused", async ({
    page,
    request,
  }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { level: 1, name: "Search SunTzu RC" })).toBeVisible();
    await page.getByRole("searchbox").fill("bush pilots");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL("/search?q=bush+pilots");
    // Events at their field match too: the tabs show the club and the field on their own.
    const tabs = page.getByRole("navigation", { name: "Kinds of result" });
    await tabs.getByRole("link", { name: "Clubs" }).click();
    await expect(
      page.getByRole("region", { name: "Clubs" }).getByRole("link", { name: "RC Bush Pilots" }),
    ).toHaveAttribute("href", "/clubs/rc-bush-pilots");
    await tabs.getByRole("link", { name: "Places" }).click();
    await expect(
      page.getByRole("region", { name: "Places" }).getByRole("link", { name: "Dyer Park" }),
    ).toHaveAttribute("href", "/places/dyer-park");

    expect((await request.get(`${API}/search?q=`)).status()).toBe(400);
    expect((await request.get(`${API}/search?q=${"a".repeat(101)}`)).status()).toBe(400);
  });
});
