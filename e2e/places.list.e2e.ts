import { expect, type Page, test } from "@playwright/test";
import { API, APP } from "./env.ts";

// docs/bits/places.list.md: /places lists every field and track, with a search (name, town,
// county, club), kind and FRIA filters and "near me", worked out in the browser. The seeded
// places (apps/api/src/events/seed-data.ts) are read here, never changed.
test.describe("places.list", () => {
  const cards = (page: Page) =>
    page.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 3 }) });
  const card = (page: Page, name: string) =>
    cards(page).filter({ has: page.getByRole("link", { name, exact: true }) });

  test("every field and track is listed, and the search finds one by name, town or club", async ({
    page,
    request,
  }) => {
    const places = (await (await request.get(`${API}/places`)).json()) as unknown[];
    expect(places.length).toBeGreaterThan(0);

    await page.goto("/places");
    await expect(
      page.getByRole("heading", { level: 1, name: "Where to fly and race." }),
    ).toBeVisible();
    await expect(page.getByText(`${places.length} places.`, { exact: false })).toBeVisible();

    const search = page.getByLabel("Search places, cities and clubs");
    await search.fill("markham");
    await expect(card(page, "Markham Park")).toContainText("Flying field · FRIA");
    await expect(card(page, "Markham Park")).toContainText("Sunrise, Broward County");
    await expect(card(page, "Coral Springs RC Track")).toHaveCount(0);

    await search.fill("coral springs");
    await expect(card(page, "Coral Springs RC Track")).toContainText("Car track");
    // By the club that runs it.
    await search.fill("bush pilots");
    await expect(cards(page).getByRole("link")).toHaveText(["Dyer Park"]);

    await cards(page).getByRole("link", { name: "Dyer Park" }).click();
    await expect(page).toHaveURL("/places/dyer-park");
    await expect(page.getByRole("heading", { level: 1, name: "Dyer Park" })).toBeVisible();
  });

  test("the kind and FRIA filters narrow the list", async ({ page }) => {
    await page.goto("/places");
    const kinds = page.getByRole("group", { name: "Kind of place" });

    await kinds.getByRole("button", { name: "Car tracks" }).click();
    await expect(card(page, "Coral Springs RC Track")).toBeVisible();
    await expect(card(page, "West Delray Regional Park car track")).toBeVisible();
    await expect(card(page, "Markham Park")).toHaveCount(0);
    for (const each of await cards(page).all()) await expect(each).toContainText("Car track");

    await kinds.getByRole("button", { name: "Everything" }).click();
    await kinds.getByRole("button", { name: "FAA-recognised (FRIA)" }).click();
    await expect(card(page, "Markham Park")).toBeVisible();
    await expect(card(page, "West Delray Regional Park car track")).toHaveCount(0);
    for (const each of await cards(page).all()) await expect(each).toContainText("FRIA");
  });

  test.describe("near me", () => {
    // At the Coral Springs track.
    test.use({
      geolocation: { latitude: 26.2455, longitude: -80.2595 },
      permissions: ["geolocation"],
    });

    test("sorts the closest first, and the location never leaves the browser", async ({ page }) => {
      await page.goto("/places");
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
      await expect(page.getByRole("button", { name: "Back to A–Z" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(
        page.getByRole("heading", { level: 2, name: "Places, closest first" }),
      ).toBeAttached();
      const first = cards(page).first();
      await expect(first.getByRole("link")).toHaveText("Coral Springs RC Track");
      await expect(first).toContainText("· 0 mi");
      expect(sent.filter((line) => /26\.24|80\.25/.test(line))).toEqual([]);

      await page.getByRole("button", { name: "Back to A–Z" }).click();
      await expect(page.getByRole("button", { name: "Near me" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });
});
