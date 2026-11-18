import { type APIRequestContext, expect, test } from "@playwright/test";
import { becomeOrganiser } from "./data.ts";
import { API } from "./env.ts";
import { expectStatus, newMember, signedInOrganiser } from "./organisers.ts";
import { FROM_APP } from "./people.ts";

// docs/bits/places.confirm.md: a club's verified organiser confirms its field's details on the club
// dashboard; the place's page shows them, "last checked" today. Only the club's own places.
// Club: rc-bush-pilots, its field dyer-park; "another club's" place: coral-springs-rc-track (only
// read here).
const CLUB = "rc-bush-pilots";
const PLACE = "dyer-park";
const OTHER = "coral-springs-rc-track";
const ACCESS = { guests: "Guests welcome", members: "Members only" } as const;

type PublicPlace = { access: string; notes: string; verifiedAt: string | null };
const publicPlace = async (request: APIRequestContext, slug: string) => {
  const response = await request.get(`${API}/places/${slug}`);
  await expectStatus(response, 200);
  const { access, notes, verifiedAt } = (await response.json()) as PublicPlace;
  return { access, notes, verifiedAt };
};

test.describe("places.confirm", () => {
  test("an organiser confirms the field's details and its page shows them, checked today", async ({
    page,
    playwright,
    request,
  }) => {
    await signedInOrganiser(page, playwright, CLUB);
    // A different answer from the one saved, so the change shows on every run.
    const access = (await publicPlace(request, PLACE)).access === "guests" ? "members" : "guests";
    const notes = `Sign in at the shelter; gate opens at 8 (${Date.now().toString(36)}).`;

    await page.goto(`/organise/${CLUB}`);
    const field = page
      .getByRole("region", { name: "Your fields and tracks" })
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: "Dyer Park", exact: true }) });
    await field.getByLabel("Who can use it").selectOption({ label: ACCESS[access] });
    await field.getByLabel("Notes for visitors").fill(notes);
    await field.getByRole("button", { name: "Confirm details" }).click();
    await expect.poll(async () => (await publicPlace(request, PLACE)).notes).toBe(notes);
    // The dashboard keeps showing what was confirmed (soft, so the place page is checked too).
    await expect.soft(field.getByLabel("Who can use it")).toHaveValue(access);
    await expect(field.getByLabel("Notes for visitors")).toHaveValue(notes);

    await page.goto(`/places/${PLACE}`);
    await expect(page.getByRole("heading", { level: 1, name: "Dyer Park" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: `How to visit: ${ACCESS[access].toLowerCase()}` }),
    ).toBeVisible();
    await expect(page.getByText(notes)).toBeVisible();
    const today = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    }).format(new Date());
    await expect(page.getByRole("region", { name: "Where this comes from" })).toContainText(
      `last checked ${today}`,
    );
  });

  test("only the club's own places, and only its verified organisers", async ({
    playwright,
    request,
  }) => {
    const organiser = await newMember(playwright, "organiser");
    await becomeOrganiser(playwright, organiser.request, organiser.email, CLUB);
    const theirs = await publicPlace(request, OTHER);
    const ours = await publicPlace(request, PLACE);
    const confirm = { data: { access: "public", notes: "Taken over." }, headers: FROM_APP };

    // Another club's track through their own club: not one of its places. Through the other club: not theirs.
    await expectStatus(
      await organiser.request.post(`${API}/organise/${CLUB}/places/${OTHER}/confirm`, confirm),
      404,
    );
    await expectStatus(
      await organiser.request.post(`${API}/organise/${OTHER}/places/${OTHER}/confirm`, confirm),
      403,
    );
    // A place nobody runs, and one that doesn't exist.
    await expectStatus(
      await organiser.request.post(
        `${API}/organise/${CLUB}/places/west-delray-car-track/confirm`,
        confirm,
      ),
      404,
    );
    await expectStatus(
      await organiser.request.post(`${API}/organise/${CLUB}/places/no-such-place/confirm`, confirm),
      404,
    );
    // An answer that isn't one of the four.
    await expectStatus(
      await organiser.request.post(`${API}/organise/${CLUB}/places/${PLACE}/confirm`, {
        data: { access: "anyone" },
        headers: FROM_APP,
      }),
      400,
    );
    await organiser.request.dispose();

    // A member who doesn't run the club, and a visitor.
    const member = await newMember(playwright);
    await expectStatus(
      await member.request.post(`${API}/organise/${CLUB}/places/${PLACE}/confirm`, confirm),
      403,
    );
    await member.request.dispose();
    const visitor = await playwright.request.newContext();
    await expectStatus(
      await visitor.post(`${API}/organise/${CLUB}/places/${PLACE}/confirm`, confirm),
      401,
    );
    await visitor.dispose();

    expect(await publicPlace(request, OTHER)).toEqual(theirs);
    expect(await publicPlace(request, PLACE)).toEqual(ours);
  });
});
