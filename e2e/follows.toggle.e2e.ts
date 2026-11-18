import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { addEvent } from "./data.ts";
import { follow, followingOf, newMember, peopleOf, signedOut } from "./members.ts";
import { FROM_APP, signedIn } from "./people.ts";

// docs/bits/follows.toggle.md: a member follows (the bell button on an event, club or place page)
// or stops following (the same button, or the ✕ on /me). Only their own follows change.
test.describe("follows.toggle", () => {
  test("a member follows an event from its page and stops from My SunTzu RC", async ({
    page,
    playwright,
  }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    await signedIn(page, "follows");
    await page.goto(`/events/${event.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();

    await page.getByRole("button", { name: "Follow", exact: true, pressed: false }).click();
    await expect(
      page.getByRole("button", { name: "Following", exact: true, pressed: true }),
    ).toBeVisible();
    // Following isn't going.
    await expect(page.getByRole("button", { name: "I'm going", pressed: false })).toBeVisible();

    await page.goto("/me");
    const followed = page.getByRole("region", { name: "What you follow" });
    await expect(followed.getByRole("link", { name: event.name })).toBeVisible();
    await followed.getByRole("button", { name: `Stop following ${event.name}` }).click();
    await expect(
      followed.getByText("Nothing yet. Look for the bell on events, clubs and fields."),
    ).toBeVisible();
    await expect(followed.getByRole("link", { name: event.name })).toHaveCount(0);

    await page.goto(`/events/${event.slug}`);
    await expect(
      page.getByRole("button", { name: "Follow", exact: true, pressed: false }),
    ).toBeEnabled();
  });

  test("a member follows a club and a field from their pages, and stops again", async ({
    page,
  }) => {
    await signedIn(page, "follows");
    for (const { path, label, name } of [
      { path: "/clubs/deland-rc", label: "Follow this club", name: "DeLand RC" },
      { path: "/places/silver-field", label: "Follow this place", name: "Silver Field" },
    ]) {
      await page.goto(path);
      await page.getByRole("button", { name: label, pressed: false }).click();
      await expect(
        page.getByRole("button", { name: "Following", exact: true, pressed: true }),
      ).toBeVisible();

      await page.goto("/me");
      await expect(
        page.getByRole("region", { name: "What you follow" }).getByRole("link", { name }),
      ).toBeVisible();

      await page.goto(path);
      await page.getByRole("button", { name: "Following", exact: true, pressed: true }).click();
      await expect(page.getByRole("button", { name: label, pressed: false })).toBeEnabled();
    }
    expect(await followingOf(page.request)).toMatchObject({ hosts: [], places: [] });
  });

  test("following twice counts once", async ({ playwright }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    const member = await newMember(playwright, "follows");
    expect(await follow(member.request, "event", event.slug)).toEqual({
      following: true,
      going: false,
    });
    expect(await follow(member.request, "event", event.slug)).toEqual({
      following: true,
      going: false,
    });
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 1, going: 0 });
    expect(await follow(member.request, "event", event.slug, false)).toEqual({
      following: false,
      going: false,
    });
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 0, going: 0 });
    await member.request.dispose();
  });

  test("another member can't stop someone else's follow", async ({ playwright }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    const owner = await newMember(playwright, "follows");
    await follow(owner.request, "event", event.slug);

    const other = await newMember(playwright, "follows-other");
    expect(await follow(other.request, "event", event.slug, false)).toEqual({
      following: false,
      going: false,
    });
    expect((await followingOf(owner.request)).events.map((item) => item.slug)).toEqual([
      event.slug,
    ]);
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 1, going: 0 });
    await Promise.all([owner.request.dispose(), other.request.dispose()]);
  });

  test("something that doesn't exist can't be followed", async ({ playwright }) => {
    const member = await newMember(playwright, "follows");
    for (const [path, status] of [
      ["event/no-such-event-e2e", 404],
      ["host/no-such-club-e2e", 404],
      ["place/no-such-field-e2e", 404],
      ["discipline/boats", 404],
      ["club/deland-rc", 400],
    ] as const) {
      const response = await member.request.put(`${API}/me/follows/${path}`, { headers: FROM_APP });
      expect(response.status(), path).toBe(status);
    }
    expect(await followingOf(member.request)).toEqual({
      events: [],
      going: [],
      hosts: [],
      places: [],
      disciplines: [],
    });
    await member.request.dispose();
  });

  test("signed out, the button asks to sign in and the API answers 401", async ({
    page,
    playwright,
  }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    await page.goto(`/events/${event.slug}`);
    await page.getByRole("link", { name: "Follow", exact: true }).click();
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- test code: the pattern is built from the test's own data.
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=%2Fevents%2F${event.slug}$`));

    const anyone = await signedOut(playwright);
    const url = `${API}/me/follows/event/${event.slug}`;
    expect((await anyone.put(url, { headers: FROM_APP })).status()).toBe(401);
    expect((await anyone.delete(url, { headers: FROM_APP })).status()).toBe(401);
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 0, going: 0 });
    await anyone.dispose();
  });
});
