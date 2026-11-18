import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { addEvent, inDays } from "./data.ts";
import { follow, followingOf, go, newMember, signedOut } from "./members.ts";
import { signedIn } from "./people.ts";

// docs/bits/follows.list.md: My SunTzu RC lists what the member follows (events, clubs, places,
// disciplines) and where they're going. Only upcoming events, and only the member's own.
test.describe("follows.list", () => {
  test("My SunTzu RC lists everything the member follows and where they're going", async ({
    page,
    playwright,
  }) => {
    const followed = await addEvent(playwright, { kind: "fly-in" });
    const going = await addEvent(playwright, {
      kind: "competition",
      discipline: "ground",
      startDate: inDays(12),
    });
    await signedIn(page, "list");
    await follow(page.request, "event", followed.slug);
    await follow(page.request, "host", "deland-rc");
    await follow(page.request, "place", "silver-field");
    await follow(page.request, "discipline", "rotor");
    await go(page.request, going.slug);

    await page.goto("/me");
    const where = page.getByRole("region", { name: "Where you're going" });
    await expect(where.getByRole("link", { name: going.name })).toBeVisible();
    await expect(where.getByRole("link", { name: followed.name })).toHaveCount(0);

    const what = page.getByRole("region", { name: "What you follow" });
    const rows = what.getByRole("listitem");
    // Going also follows: both events are listed, then the club, the place and the discipline.
    await expect(rows).toHaveCount(5);
    for (const [kind, name] of [
      ["Event", followed.name],
      ["Event", going.name],
      ["Club", "DeLand RC"],
      ["Place", "Silver Field"],
      ["Every event", "Helicopters"],
    ]) {
      const row = rows.filter({ has: page.getByRole("link", { name, exact: true }) });
      await expect(row).toContainText(kind);
      await expect(row.getByRole("button", { name: `Stop following ${name}` })).toBeVisible();
    }

    expect(await followingOf(page.request)).toMatchObject({
      events: expect.arrayContaining([
        expect.objectContaining({ slug: followed.slug }),
        expect.objectContaining({ slug: going.slug }),
      ]),
      going: [expect.objectContaining({ slug: going.slug, name: going.name })],
      hosts: [expect.objectContaining({ slug: "deland-rc", name: "DeLand RC" })],
      places: [expect.objectContaining({ slug: "silver-field", name: "Silver Field" })],
      disciplines: ["rotor"],
    });
  });

  test("events that are over drop off the list", async ({ playwright }) => {
    const over = await addEvent(playwright, {
      kind: "fly-in",
      startDate: inDays(-5),
      endDate: inDays(-4),
    });
    const member = await newMember(playwright, "list");
    await follow(member.request, "event", over.slug);
    await go(member.request, over.slug);
    expect(await followingOf(member.request)).toMatchObject({ events: [], going: [] });
    await member.request.dispose();
  });

  test("another member never sees this member's list", async ({ page, playwright }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    const owner = await newMember(playwright, "list");
    await follow(owner.request, "event", event.slug);
    await go(owner.request, event.slug);
    await follow(owner.request, "host", "triple-creek-rc");

    await signedIn(page, "list-other");
    await page.goto("/me");
    await expect(page.getByText("Nothing yet. Open an event and tap “I'm going”.")).toBeVisible();
    await expect(
      page.getByText("Nothing yet. Look for the bell on events, clubs and fields."),
    ).toBeVisible();
    await expect(page.getByText(event.name)).toHaveCount(0);
    expect(await followingOf(page.request)).toEqual({
      events: [],
      going: [],
      hosts: [],
      places: [],
      disciplines: [],
    });
    await owner.request.dispose();
  });

  test("signed out, the API answers 401", async ({ playwright }) => {
    const anyone = await signedOut(playwright);
    expect((await anyone.get(`${API}/me/following`)).status()).toBe(401);
    await anyone.dispose();
  });
});
