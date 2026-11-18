import { expect, type Page, test } from "@playwright/test";
import { API } from "./env.ts";

// docs/bits/hosts.list.md: /clubs lists every club, track, shop and organiser, grouped by county
// (those without one last, "Across Florida"), each leading to its page. Read only.
test.describe("hosts.list", () => {
  type Host = {
    slug: string;
    name: string;
    kind: string;
    city: string | null;
    county: string | null;
    verified: boolean;
  };
  const card = (page: Page, name: string) =>
    page.getByRole("listitem").filter({ has: page.getByRole("link", { name, exact: true }) });

  test("every club and track is listed, by county, and each leads to its page", async ({
    page,
    request,
  }) => {
    const hosts = (await (await request.get(`${API}/hosts`)).json()) as Host[];
    expect(hosts.length).toBeGreaterThan(0);

    await page.goto("/places");
    await page.getByRole("main").getByRole("link", { name: "Clubs and tracks" }).click();
    await expect(page).toHaveURL("/clubs");
    await expect(page).toHaveTitle(/^RC clubs and tracks in Florida/);
    await expect(page.getByRole("heading", { level: 1, name: "Find your people." })).toBeVisible();

    const KIND: Record<string, string> = {
      club: "Club",
      track: "Track",
      shop: "Shop",
      "sanctioning-body": "Sanctioning body",
      organiser: "Organiser",
    };
    for (const host of hosts) {
      const each = card(page, host.name);
      await expect(each.getByRole("link")).toHaveAttribute("href", `/clubs/${host.slug}`);
      await expect(each).toContainText(`${KIND[host.kind]}${host.city ? ` · ${host.city}` : ""}`);
      // Verified once one of its organisers proved it.
      if (host.verified) await expect(each).toContainText("Verified on SunTzu RC");
    }

    // One heading per county, A–Z, and "Across Florida" last for those without one.
    const counties = [
      ...new Set(hosts.map((host) => host.county).filter((county) => county !== null)),
    ].sort();
    const groups = [
      ...counties.map((county) => `${county} County`),
      ...(hosts.some((host) => !host.county) ? ["Across Florida"] : []),
    ];
    await expect(
      page.getByRole("region", { name: "Clubs and tracks" }).getByRole("heading", { level: 2 }),
    ).toHaveText(groups);

    await card(page, "Coral Springs RC Track").getByRole("link").click();
    await expect(page).toHaveURL("/clubs/coral-springs-rc-track");
    await expect(
      page.getByRole("heading", { level: 1, name: "Coral Springs RC Track" }),
    ).toBeVisible();
  });

  test("GET /hosts answers every host to anyone, signed in or not", async ({ request }) => {
    const response = await request.get(`${API}/hosts`);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("public, max-age=300");
    const hosts = (await response.json()) as Host[];
    expect(hosts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "amps", name: "Aero Modelers of Perrine", kind: "club" }),
        expect.objectContaining({
          slug: "coral-springs-rc-track",
          name: "Coral Springs RC Track",
          kind: "track",
        }),
        expect.objectContaining({ slug: "ace-of-aces", name: "Ace of Aces", kind: "organiser" }),
      ]),
    );
  });
});
