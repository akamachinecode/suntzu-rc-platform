import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { addEvent, inDays } from "./data.ts";
import { AN_EVENT, structuredData, word } from "./public.ts";

// docs/bits/places.get.md: a field's or track's page says how to visit, who runs it, what's coming
// up there, the rules that apply (FRIAs need no Remote ID) and where the facts come from. The
// seeded places are read here, never changed.
test.describe("places.get", () => {
  test("a club's FRIA field: who runs it, what's coming up there and the rules", async ({
    page,
    playwright,
  }) => {
    const event = await addEvent(playwright, {
      ...AN_EVENT,
      name: `${word()} 3D Fun Fly`,
      place: "west-delray-flying-field",
      startDate: inDays(18),
    });

    await page.goto("/places/west-delray-flying-field");
    await expect(page).toHaveTitle(
      /^West Delray Regional Park flying field, Delray Beach, Florida/,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "West Delray Regional Park flying field" }),
    ).toBeVisible();
    await expect(
      page.getByText("10875 W Atlantic Ave, Delray Beach, Palm Beach County"),
    ).toBeVisible();
    await expect(page.getByText("FAA-recognised area (FRIA)", { exact: true })).toBeVisible();

    const visit = page.getByRole("region", { name: /^How to visit: / });
    await expect(visit).toBeVisible();
    await visit.getByRole("link", { name: "Run by Palm Beach Radio Control Association" }).click();
    await expect(page).toHaveURL("/clubs/palm-beach-rc");
    await page.goBack();

    const upcoming = page.getByRole("region", { name: "Coming up here" });
    await expect(upcoming.getByRole("link", { name: event.name })).toHaveAttribute(
      "href",
      `/events/${event.slug}`,
    );

    const rules = page.getByRole("region", { name: "Rules that apply" });
    await expect(rules.getByText("No Remote ID needed here")).toBeVisible();
    await expect(rules.getByRole("link", { name: "Check the airspace" })).toHaveAttribute(
      "href",
      "/places/can-i-fly-here",
    );
    await expect(
      page
        .getByRole("region", { name: "Where this comes from" })
        .getByRole("link", { name: "Claim it to keep it current" }),
    ).toHaveAttribute("href", "/organise?club=palm-beach-rc");

    expect(await structuredData(page, "SportsActivityLocation")).toMatchObject({
      name: "West Delray Regional Park flying field",
      address: { streetAddress: "10875 W Atlantic Ave", addressLocality: "Delray Beach" },
      geo: { latitude: 26.4647 },
    });
  });

  test("a track nobody runs on SunTzu RC: ask first, no Remote ID exemption, tell us if it's wrong", async ({
    page,
  }) => {
    await page.goto("/places/west-delray-car-track");
    await expect(
      page.getByRole("heading", { level: 1, name: "West Delray Regional Park car track" }),
    ).toBeVisible();
    await expect(page.getByText("Car track", { exact: true })).toBeVisible();
    // Nobody has told us how to visit it: the default is to ask first.
    await expect(
      page.getByRole("heading", { level: 2, name: "How to visit: ask first" }),
    ).toBeVisible();
    await expect(page.getByText("FAA-recognised area (FRIA)", { exact: true })).toHaveCount(0);
    await expect(page.getByText("No Remote ID needed here")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Run by / })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Tell us" })).toHaveAttribute(
      "href",
      "/contact?topic=correction",
    );
    await expect(page.getByRole("link", { name: /Directions/ })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=26.45375,-80.21727",
    );
  });

  test("an unknown place shows the 404 page and isn't indexed; the API answers 404", async ({
    page,
    request,
  }) => {
    const slug = word("no-such-place-").toLowerCase();
    await page.goto(`/places/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    // The page streams behind its loading screen (spec 0010), so its status is already 200 when
    // the API says there's no such place: Next.js marks it noindex instead (docs/DECISIONS.md,
    // 2026-11-18). The API itself answers 404.
    await expect(page.locator('head meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
    );
    expect((await request.get(`${API}/places/${slug}`)).status()).toBe(404);
  });
});
