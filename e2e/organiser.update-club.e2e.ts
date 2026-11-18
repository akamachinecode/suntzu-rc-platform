import { expect, type Page, test } from "@playwright/test";
import { becomeOrganiser } from "./data.ts";
import { API } from "./env.ts";
import { expectStatus, newMember, signedInOrganiser } from "./organisers.ts";
import { FROM_APP } from "./people.ts";

// docs/bits/organiser.update-club.md: a verified organiser keeps the club's page current in "The
// club's page" on /organise/<club>: what it is, its website, what it flies, whether it welcomes
// newcomers. Club: sarasota-silent-flyers (no fields on SunTzu RC, so no newcomer is ever sent to
// it); "another club": ace-of-aces (only read here).
const CLUB = "sarasota-silent-flyers";
const NAME = "Sarasota Silent Flyers";
const OTHER = "ace-of-aces";

type PublicHost = {
  summary: string;
  url: string | null;
  disciplines: string[];
  acceptsNewcomers: boolean;
};
const publicHost = async (page: Page, slug: string) =>
  (await (await page.request.get(`${API}/hosts/${slug}`)).json()) as PublicHost;

test.describe("organiser.update-club", () => {
  test("an organiser updates the club's page and visitors see it", async ({ page, playwright }) => {
    await signedInOrganiser(page, playwright, CLUB);
    const summary = `Electric gliders and sailplanes over Sarasota (${Date.now().toString(36)}).`;
    const website = `https://www.sarasotasilentflyers.com/about-${Date.now().toString(36)}`;
    await page.goto(`/organise/${CLUB}`);
    const form = page.getByRole("region", { name: "The club's page" });
    await form.getByLabel("About the club, in a line or two").fill(summary);
    await form.getByLabel("Website").fill(website);
    const flies = form.getByRole("group", { name: "What you fly or drive" });
    await flies.getByRole("checkbox", { name: "Planes and jets" }).check();
    await flies.getByRole("checkbox", { name: "Helicopters" }).uncheck();
    await flies.getByRole("checkbox", { name: "Cars" }).uncheck();
    await flies.getByRole("checkbox", { name: "FPV drones" }).uncheck();
    await form.getByRole("checkbox", { name: /We welcome newcomers/ }).check();
    await form.getByRole("button", { name: "Save", exact: true }).click();
    await expect(form.getByRole("status")).toHaveText("Saved.");

    await page.goto(`/clubs/${CLUB}`);
    await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
    await expect(page.getByText(summary)).toBeVisible();
    await expect(page.getByRole("link", { name: /Their website/ })).toHaveAttribute(
      "href",
      website,
    );
    await expect(page.getByText("New to RC? This club welcomes newcomers.")).toBeVisible();
    expect(await publicHost(page, CLUB)).toMatchObject({
      summary,
      url: website,
      disciplines: ["air"],
      acceptsNewcomers: true,
    });

    // Not taking newcomers any more: the page stops saying so, and what they fly stays.
    await page.goto(`/organise/${CLUB}`);
    await expect(form.getByLabel("About the club, in a line or two")).toHaveValue(summary);
    await form.getByRole("checkbox", { name: /We welcome newcomers/ }).uncheck();
    await form.getByRole("button", { name: "Save", exact: true }).click();
    await expect(form.getByRole("status")).toHaveText("Saved.");
    await page.goto(`/clubs/${CLUB}`);
    await expect(page.getByText(summary)).toBeVisible();
    await expect(page.getByText("New to RC? This club welcomes newcomers.")).toHaveCount(0);
    expect(await publicHost(page, CLUB)).toMatchObject({
      disciplines: ["air"],
      acceptsNewcomers: false,
    });
  });

  test("a website that isn't a web link is refused, and what was typed stays", async ({
    page,
    playwright,
  }) => {
    await signedInOrganiser(page, playwright, CLUB);
    const before = await publicHost(page, CLUB);
    const summary = `Not saved (${Date.now().toString(36)}).`;
    await page.goto(`/organise/${CLUB}`);
    const form = page.getByRole("region", { name: "The club's page" });
    await form.getByLabel("About the club, in a line or two").fill(summary);
    await form.getByLabel("Website").fill("ftp://sarasotasilentflyers.com");
    await form.getByRole("button", { name: "Save", exact: true }).click();

    await expect(form.getByRole("status")).toHaveText("Check the website link.");
    expect(await publicHost(page, CLUB)).toMatchObject({
      summary: before.summary,
      url: before.url,
    });
    // Spec 0010: every form keeps what was typed after a mistake (soft, so both fields are checked).
    await expect.soft(form.getByLabel("Website")).toHaveValue("ftp://sarasotasilentflyers.com");
    await expect.soft(form.getByLabel("About the club, in a line or two")).toHaveValue(summary);
  });

  test("only this club's verified organisers change it", async ({ playwright, request }) => {
    const organiser = await newMember(playwright, "organiser");
    await becomeOrganiser(playwright, organiser.request, organiser.email, CLUB);
    const other = await (await request.get(`${API}/hosts/${OTHER}`)).json();
    const change = { data: { summary: "Taken over.", acceptsNewcomers: true }, headers: FROM_APP };

    // An organiser of this club, at another club: 403, and nothing changes there.
    await expectStatus(await organiser.request.patch(`${API}/organise/${OTHER}`, change), 403);
    await expectStatus(await organiser.request.patch(`${API}/organise/no-such-club`, change), 404);
    await expectStatus(
      await organiser.request.patch(`${API}/organise/${CLUB}`, {
        data: { url: "not a link" },
        headers: FROM_APP,
      }),
      400,
    );
    await organiser.request.dispose();
    // A member who doesn't run it, and a visitor.
    const member = await newMember(playwright);
    await expectStatus(await member.request.patch(`${API}/organise/${CLUB}`, change), 403);
    await member.request.dispose();
    const visitor = await playwright.request.newContext();
    await expectStatus(await visitor.patch(`${API}/organise/${CLUB}`, change), 401);
    await visitor.dispose();

    expect(await (await request.get(`${API}/hosts/${OTHER}`)).json()).toEqual(other);
    const mine = await (await request.get(`${API}/hosts/${CLUB}`)).json();
    expect(mine.summary).not.toBe("Taken over.");
  });
});
