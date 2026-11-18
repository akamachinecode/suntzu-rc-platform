import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { addEvent, inDays } from "./data.ts";
import { followingOf, go, newMember, peopleOf, signedOut } from "./members.ts";
import { FROM_APP, signedIn } from "./people.ts";

// docs/bits/rsvp.toggle.md: a member says "I'm going" on an event page (which also follows it) and
// can change their mind. Only the count is public, never who.
test.describe("rsvp.toggle", () => {
  test("a member says they're going from the event page, and changes their mind", async ({
    page,
    playwright,
  }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    await signedIn(page, "rsvp");
    await page.goto(`/events/${event.slug}`);

    await page.getByRole("button", { name: "I'm going", exact: true, pressed: false }).click();
    await expect(
      page.getByRole("button", { name: "Going", exact: true, pressed: true }),
    ).toBeEnabled();
    // Going means following: changes to the event reach them.
    await expect(
      page.getByRole("button", { name: "Following", exact: true, pressed: true }),
    ).toBeVisible();
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 1, going: 1 });

    await page.goto("/me");
    await expect(
      page
        .getByRole("region", { name: "Where you're going" })
        .getByRole("link", { name: event.name }),
    ).toBeVisible();

    await page.goto(`/events/${event.slug}`);
    await page.getByRole("button", { name: "Going", exact: true, pressed: true }).click();
    await expect(
      page.getByRole("button", { name: "I'm going", exact: true, pressed: false }),
    ).toBeEnabled();
    // They still follow it.
    await expect(
      page.getByRole("button", { name: "Following", exact: true, pressed: true }),
    ).toBeVisible();
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 1, going: 0 });

    await page.goto("/me");
    await expect(page.getByText("Nothing yet. Open an event and tap “I'm going”.")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "What you follow" }).getByRole("link", { name: event.name }),
    ).toBeVisible();
  });

  test("an event that's over doesn't offer “I'm going”", async ({ page, playwright }) => {
    const over = await addEvent(playwright, {
      kind: "fly-in",
      startDate: inDays(-5),
      endDate: inDays(-4),
    });
    await signedIn(page, "rsvp");
    await page.goto(`/events/${over.slug}`);
    await expect(page.getByRole("button", { name: "Follow", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "I'm going" })).toHaveCount(0);
  });

  test("another member can't take someone else's “going” back", async ({ playwright }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    const owner = await newMember(playwright, "rsvp");
    await go(owner.request, event.slug);

    const other = await newMember(playwright, "rsvp-other");
    expect(await go(other.request, event.slug, false)).toEqual({ following: false, going: false });
    expect((await followingOf(owner.request)).going.map((item) => item.slug)).toEqual([event.slug]);
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 1, going: 1 });
    await Promise.all([owner.request.dispose(), other.request.dispose()]);
  });

  test("going twice counts once, and an unknown event answers 404", async ({ playwright }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    const member = await newMember(playwright, "rsvp");
    await go(member.request, event.slug);
    await go(member.request, event.slug);
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 1, going: 1 });
    const unknown = await member.request.put(`${API}/me/going/no-such-event-e2e`, {
      headers: FROM_APP,
    });
    expect(unknown.status()).toBe(404);
    await member.request.dispose();
  });

  test("signed out, the button asks to sign in and the API answers 401", async ({
    page,
    playwright,
  }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    await page.goto(`/events/${event.slug}`);
    await page.getByRole("link", { name: "I'm going", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=%2Fevents%2F${event.slug}$`));

    const anyone = await signedOut(playwright);
    const url = `${API}/me/going/${event.slug}`;
    expect((await anyone.put(url, { headers: FROM_APP })).status()).toBe(401);
    expect((await anyone.delete(url, { headers: FROM_APP })).status()).toBe(401);
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 0, going: 0 });
    await anyone.dispose();
  });
});
