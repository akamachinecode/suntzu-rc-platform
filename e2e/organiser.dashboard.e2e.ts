import { expect, test } from "@playwright/test";
import { inDays, unique } from "./data.ts";
import { API } from "./env.ts";
import { addOpenDay, expectStatus, newMember, signedInOrganiser } from "./organisers.ts";
import { FROM_APP, signedIn } from "./people.ts";

// docs/bits/organiser.dashboard.md: a verified organiser opens /organise/<club> from My SunTzu RC and
// sees the club's events with who follows and goes, its fields, and its widget. Nobody else opens
// it, for this club or another. Club: markham-park-pilots; "another club": coral-springs-rc-track
// (only read here).
const CLUB = "markham-park-pilots";
const NAME = "Markham Park Pilots Association";
const OTHER = "coral-springs-rc-track";

test.describe("organiser.dashboard", () => {
  test("an organiser opens the dashboard from My SunTzu RC", async ({ page, playwright }) => {
    await signedInOrganiser(page, playwright, CLUB);
    await page.goto("/me");
    await page.getByRole("link", { name: "Your clubs" }).click();
    const claim = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: NAME }) });
    await expect(claim.getByText("Verified", { exact: true })).toBeVisible();
    await claim.getByRole("link", { name: "Open the club dashboard" }).click();

    await expect(page).toHaveURL(new RegExp(`/organise/${CLUB}$`));
    await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
    await expect(page.getByText(/^\d+ follow the club$/)).toBeVisible();
    await expect(page.getByText(/^\d+ going to upcoming events$/)).toBeVisible();
    await expect(page.getByText(/^\d+ events$/)).toBeVisible();
    await expect(page.getByRole("link", { name: "See the public page" })).toHaveAttribute(
      "href",
      `/clubs/${CLUB}`,
    );
    // The club's field, ready to confirm, and the widget to paste on its website.
    const fields = page.getByRole("region", { name: "Your fields and tracks" });
    await expect(fields.getByRole("link", { name: "Markham Park", exact: true })).toBeVisible();
    const widget = page.getByRole("region", { name: "Your calendar on your website" });
    await expect(widget.getByRole("code")).toContainText(`/embed/clubs/${CLUB}`);
    await expect(widget.getByRole("link", { name: "Preview the widget" })).toHaveAttribute(
      "href",
      `/embed/clubs/${CLUB}`,
    );
  });

  test("it counts who follows the club and who is going to each event", async ({
    page,
    playwright,
  }) => {
    await signedInOrganiser(page, playwright, CLUB);
    const name = unique("E2E Dashboard Open Day");
    const published = await page.request.post(`${API}/organise/${CLUB}/events`, {
      data: {
        name,
        kind: "open-day",
        discipline: "air",
        startDate: inDays(33),
        place: "markham-park",
      },
      headers: FROM_APP,
    });
    await expectStatus(published, 201);
    const { slug } = (await published.json()) as { slug: string };
    const before = (await (await page.request.get(`${API}/organise/${CLUB}`)).json()) as {
      followers: number;
      goingTotal: number;
    };

    // A pilot follows the club and says they're going (going also follows the event).
    const pilot = await newMember(playwright, "pilot");
    await expectStatus(
      await pilot.request.put(`${API}/me/follows/host/${CLUB}`, { headers: FROM_APP }),
      200,
    );
    await expectStatus(
      await pilot.request.put(`${API}/me/going/${slug}`, { headers: FROM_APP }),
      200,
    );
    await pilot.request.dispose();

    await page.goto(`/organise/${CLUB}`);
    await expect(
      page.getByText(`${before.followers + 1} follow the club`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`${before.goingTotal + 1} going to upcoming events`, { exact: true }),
    ).toBeVisible();
    const row = page
      .getByRole("region", { name: "Your events" })
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name, exact: true }) });
    await expect(row).toContainText("1 going · 1 following");
  });

  test("only this club's events, and only its verified organisers", async ({
    page,
    playwright,
  }) => {
    await signedInOrganiser(page, playwright, CLUB);
    // Another club's event never shows here.
    const theirs = await addOpenDay(playwright, { name: unique("E2E Not Markham"), host: OTHER });
    await page.goto(`/organise/${CLUB}`);
    await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
    await expect(page.getByRole("link", { name: theirs.name })).toHaveCount(0);

    // Another club's dashboard is closed to them: the page says so, the API answers 403.
    await page.goto(`/organise/${OTHER}`);
    await expect(page.getByRole("heading", { level: 1, name: "Not yet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Claim it" })).toHaveAttribute(
      "href",
      `/organise?club=${OTHER}`,
    );
    await expect(page.getByText("Coral Springs RC Track")).toHaveCount(0);
    await expectStatus(await page.request.get(`${API}/organise/${OTHER}`), 403);
    await expectStatus(await page.request.get(`${API}/organise/no-such-club`), 404);
  });

  test("a visitor is asked to sign in, and a member who doesn't run the club gets “Not yet”", async ({
    page,
    playwright,
  }) => {
    await page.goto(`/organise/${CLUB}`);
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=%2Forganise%2F${CLUB}$`));
    const visitor = await playwright.request.newContext();
    await expectStatus(await visitor.get(`${API}/organise/${CLUB}`), 401);
    await visitor.dispose();

    await signedIn(page);
    await page.goto(`/organise/${CLUB}`);
    await expect(page.getByRole("heading", { level: 1, name: "Not yet" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Your events" })).toHaveCount(0);
    await expectStatus(await page.request.get(`${API}/organise/${CLUB}`), 403);
  });
});
