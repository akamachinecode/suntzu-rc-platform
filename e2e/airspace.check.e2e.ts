import { expect, test } from "@playwright/test";
import { API } from "./env.ts";

// docs/bits/airspace.check.md: "Can I fly here?" checks a point (your location, a tap on the map or
// a spot from search) against the FAA's airspace and airports and the FAA-recognised fields.
// The tests' database has the seeded fields but no airspace or airports (those come from the
// census), so the controlled and near-an-airport answers are left to the census's own tests; what
// is checked here is the FRIA answer, the fields nearby, the rules around them and Florida's edges.
test.describe("airspace.check", () => {
  // The centre of Markham Park's FRIA (seed-data.ts), and a degree of latitude in miles.
  const MARKHAM = { latitude: 26.12643, longitude: -80.34863 };
  const MILE = 1 / 69.09;

  test.describe("where I am", () => {
    test.use({ geolocation: MARKHAM, permissions: ["geolocation"] });

    test("at a FRIA field: an FAA-recognised area, with the field and the rules to check", async ({
      page,
    }) => {
      await page.goto("/places/can-i-fly-here");
      await expect(page.getByRole("heading", { level: 1, name: "Can I fly here?" })).toBeVisible();
      const result = page.getByRole("region", { name: "Result" });
      await expect(result).toContainText("Pick a point on the map, or use your location.");

      await page.getByRole("button", { name: "Check where I am" }).click();
      await expect(
        result.getByRole("heading", { name: "An FAA-recognised identification area" }),
      ).toBeVisible();
      await expect(result).toContainText("Models without Remote ID may fly here.");
      const fields = result
        .getByRole("listitem")
        .filter({ has: page.getByRole("link", { name: "Markham Park" }) });
      await expect(fields).toHaveText("Markham Park · 0 mi");
      await expect(fields.getByRole("link")).toHaveAttribute("href", "/places/markham-park");
      // Guidance only: it says so, and where to check before flying.
      await expect(result).toContainText(
        "This is guidance from the FAA's public data, not an authorisation.",
      );
      await expect(result.getByRole("link", { name: /B4UFLY/ })).toHaveAttribute(
        "href",
        "https://www.faa.gov/uas/getting_started/b4ufly",
      );
    });

    test("outside Florida: a plain message", async ({ page, context }) => {
      await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 });
      await page.goto("/places/can-i-fly-here");
      await page.getByRole("button", { name: "Check where I am" }).click();
      await expect(page.getByRole("region", { name: "Result" })).toContainText(
        "That point is outside Florida. SunTzu RC only covers Florida for now.",
      );
    });
  });

  test("a spot from a link (search's “Can I fly near…?”) is checked on arrival", async ({
    page,
  }) => {
    // Dyer Park's FRIA, West Palm Beach.
    await page.goto("/places/can-i-fly-here?at=26.78028,-80.1297");
    const result = page.getByRole("region", { name: "Result" });
    await expect(
      result.getByRole("heading", { name: "An FAA-recognised identification area" }),
    ).toBeVisible();
    await expect(result.getByRole("listitem").first()).toHaveText("Dyer Park · 0 mi");
  });

  test("the rules: a FRIA counts within a quarter mile of its centre; outside Florida is refused", async ({
    request,
  }) => {
    const check = (latitude: number, longitude = MARKHAM.longitude) =>
      request.get(`${API}/airspace/check?lat=${latitude}&lng=${longitude}`);

    const inside = await check(MARKHAM.latitude + 0.2 * MILE);
    expect(inside.status()).toBe(200);
    // The point is answered, never kept: not even a cache may hold it.
    expect(inside.headers()["cache-control"]).toBe("no-store");
    expect(await inside.json()).toMatchObject({
      verdict: "fria",
      fria: { slug: "markham-park", miles: 0.2 },
    });

    const outside = (await (await check(MARKHAM.latitude + 0.5 * MILE)).json()) as {
      verdict: string;
      fria: unknown;
      fields: { slug: string; miles: number }[];
    };
    expect(outside.fria).toBeNull();
    expect(outside.verdict).not.toBe("fria");
    expect(outside.fields[0]).toMatchObject({ slug: "markham-park", miles: 0.5 });

    // Florida only: New York, and a point in the Gulf west of Pensacola.
    expect((await check(40.7128, -74.006)).status()).toBe(400);
    expect((await check(30.4, -88.5)).status()).toBe(400);
  });
});
