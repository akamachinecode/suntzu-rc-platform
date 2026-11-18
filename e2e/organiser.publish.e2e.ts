import { expect, type Page, test } from "@playwright/test";
import { becomeOrganiser, inDays, unique } from "./data.ts";
import { API } from "./env.ts";
import {
  addOpenDay,
  addressAt,
  expectStatus,
  longDate,
  newMember,
  publicEvent,
  signedInOrganiser,
} from "./organisers.ts";
import { FROM_APP, signedIn } from "./people.ts";

// docs/bits/organiser.publish.md: a club's verified organiser publishes an event on /organise/<club>
// (live at once, as the club) and makes the quick changes on it. Nobody else can, for this club or
// any other. Club: palm-beach-rc; "another club": coral-springs-rc-track (only read here).
const CLUB = "palm-beach-rc";
const NAME = "Palm Beach Radio Control Association";
const FIELD = "West Delray Regional Park flying field";
const OTHER = "coral-springs-rc-track";

/** The organiser on `page` publishes an event through the API, as the dashboard's form does. */
async function publish(page: Page, event: Record<string, unknown>): Promise<string> {
  const response = await page.request.post(`${API}/organise/${CLUB}/events`, {
    data: { kind: "open-day", discipline: "air", startDate: inDays(26), ...event },
    headers: FROM_APP,
  });
  await expectStatus(response, 201);
  return ((await response.json()) as { slug: string }).slug;
}

test.describe("organiser.publish", () => {
  test("a verified organiser publishes an event and it's live at once, as the club's", async ({
    page,
    playwright,
    request,
  }) => {
    await signedInOrganiser(page, playwright, CLUB);
    const name = unique("E2E Club Open Day");
    const day = inDays(25);
    await page.goto(`/organise/${CLUB}`);
    await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
    const form = page.getByRole("region", { name: "Publish an event" });
    await form.getByLabel("Name").fill(name);
    await form.getByLabel("Kind").selectOption({ label: "Open day" });
    await form.getByLabel("First day").fill(day);
    await form.getByLabel("Place on SunTzu RC").selectOption({ label: `${FIELD}, Delray Beach` });
    await form.getByLabel("One line about it").fill("Come and fly with the club.");
    await form.getByRole("button", { name: "Publish event" }).click();
    await expect(form.getByRole("status")).toContainText("Published.");

    // In the club's own list, with nobody going yet.
    const row = page
      .getByRole("region", { name: "Your events" })
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name, exact: true }) });
    await expect(row).toContainText("0 going · 0 following");
    await expect(row.getByText("Found on the web by the engine")).toHaveCount(0);

    await row.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText(longDate(day), { exact: true }).first()).toBeVisible();
    const where = page.getByRole("complementary", { name: "Where" });
    await expect(where.getByText(FIELD, { exact: true })).toBeVisible();
    await expect(where.getByText(`Hosted by ${NAME}`)).toBeVisible();
    // Where it comes from: the club itself, with organiser trust, not the crew (soft, so the rest runs).
    const sources = page.getByRole("region", { name: "Where this comes from" });
    await expect.soft(sources.getByText(`${NAME} (on SunTzu RC) (organiser)`)).toBeVisible();

    const slug = new URL(page.url()).pathname.split("/").at(-1)!;
    const event = await publicEvent(request, slug);
    expect(event).toMatchObject({
      name,
      startDate: day,
      status: "confirmed",
      host: { slug: CLUB },
    });
    expect(event.place?.slug).toBe("west-delray-flying-field");
    await page.goto(`/clubs/${CLUB}`);
    await expect(
      page.getByRole("region", { name: "Coming up" }).getByRole("link", { name }),
    ).toBeVisible();
  });

  test("the quick changes: beginners welcome, results link, cancel and undo", async ({
    page,
    playwright,
    request,
  }) => {
    await signedInOrganiser(page, playwright, CLUB);
    const name = unique("E2E Club Quick Changes");
    const slug = await publish(page, { name });
    await page.goto(`/organise/${CLUB}`);
    const row = page
      .getByRole("region", { name: "Your events" })
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name, exact: true }) });

    const beginners = row.getByRole("button", { name: `Beginners welcome at ${name}` });
    await expect(beginners).toHaveAttribute("aria-pressed", "false");
    await beginners.click();
    await expect(beginners).toHaveAttribute("aria-pressed", "true");

    await row.getByLabel("Results link").fill("https://example.com/club-results");
    await row.getByRole("button", { name: `Save the results link for ${name}` }).click();
    await expect
      .poll(async () => (await publicEvent(request, slug)).resultsUrl)
      .toBe("https://example.com/club-results");

    await row.getByRole("button", { name: /^Cancel it\s?:/ }).click();
    await expect(row.getByRole("button", { name: /^Not cancelled after all\s?:/ })).toBeVisible();

    await page.goto(`/events/${slug}`);
    await expect(page.getByText("Beginners welcome", { exact: true })).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Results/ })).toHaveAttribute(
      "href",
      "https://example.com/club-results",
    );

    // Changed their mind: back on.
    await page.goto(`/organise/${CLUB}`);
    await row.getByRole("button", { name: /^Not cancelled after all\s?:/ }).click();
    await expect(row.getByRole("button", { name: /^Cancel it\s?:/ })).toBeVisible();
    expect((await publicEvent(request, slug)).status).toBe("confirmed");
  });

  test("organisers keep the event's name, and another club's field is named in words", async ({
    page,
    playwright,
    request,
  }) => {
    await signedInOrganiser(page, playwright, CLUB);
    const name = unique("E2E Club Keeps Name");
    const slug = await publish(page, { name, place: OTHER });
    // Held at another club's track: fine, but it isn't linked to that club's place.
    expect(await publicEvent(request, slug)).toMatchObject({
      place: null,
      placeText: "Coral Springs RC Track",
      host: { slug: CLUB },
    });

    const changed = await page.request.patch(`${API}/organise/${CLUB}/events/${slug}`, {
      data: { name: "Renamed by an organiser", summary: "Now with a swap meet." },
      headers: FROM_APP,
    });
    await expectStatus(changed, 204);
    expect(await publicEvent(request, slug)).toMatchObject({
      name,
      summary: "Now with a swap meet.",
    });
  });

  test("an organiser can't publish or change another club's events", async ({
    playwright,
    request,
  }) => {
    const organiser = await newMember(playwright, "organiser");
    await becomeOrganiser(playwright, organiser.request, organiser.email, CLUB);
    const theirs = await addOpenDay(playwright, {
      name: unique("E2E Other Club Day"),
      host: OTHER,
    });
    const change = { data: { beginnerFriendly: true, status: "cancelled" }, headers: FROM_APP };

    // Through their own club's address: not one of its events.
    await expectStatus(
      await organiser.request.patch(`${API}/organise/${CLUB}/events/${theirs.slug}`, change),
      404,
    );
    // Through the other club's address: not their club.
    await expectStatus(
      await organiser.request.patch(`${API}/organise/${OTHER}/events/${theirs.slug}`, change),
      403,
    );
    const published = await organiser.request.post(`${API}/organise/${OTHER}/events`, {
      data: {
        name: unique("E2E Not My Club"),
        kind: "open-day",
        discipline: "ground",
        startDate: inDays(27),
      },
      headers: FROM_APP,
    });
    await expectStatus(published, 403);
    expect(await publicEvent(request, theirs.slug)).toMatchObject({
      beginnerFriendly: false,
      status: "announced",
      host: { slug: OTHER },
    });
    await organiser.request.dispose();
  });

  test("an unverified claimant can't publish, and the dashboard says so", async ({
    page,
    playwright,
  }) => {
    await signedIn(page, "claimant");
    await expectStatus(
      await page.request.post(`${API}/organise/claims`, {
        data: { host: CLUB, method: "domain-email", email: addressAt("palmbeachrc.com") },
        headers: FROM_APP,
      }),
      201,
    );
    const event = {
      name: unique("E2E Too Early"),
      kind: "open-day",
      discipline: "air",
      startDate: inDays(28),
    };
    const refused = await page.request.post(`${API}/organise/${CLUB}/events`, {
      data: event,
      headers: FROM_APP,
    });
    await expectStatus(refused, 403);
    expect(await refused.text()).toContain("Only this club's verified organisers can do that.");

    await page.goto(`/organise/${CLUB}`);
    await expect(page.getByRole("heading", { level: 1, name: "Not yet" })).toBeVisible();
    await expect(
      page.getByText("Only this club's verified organisers can open its dashboard."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Claim it" })).toHaveAttribute(
      "href",
      `/organise?club=${CLUB}`,
    );
    await expect(page.getByRole("region", { name: "Publish an event" })).toHaveCount(0);

    const visitor = await playwright.request.newContext();
    await expectStatus(
      await visitor.post(`${API}/organise/${CLUB}/events`, { data: event, headers: FROM_APP }),
      401,
    );
    await visitor.dispose();
  });
});
