import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { addEvent } from "./data.ts";
import { follow, go, newMember, signedOut } from "./members.ts";
import { signedIn } from "./people.ts";

// docs/bits/follows.state.md: when an event, club or place page opens, the buttons ask the API
// whether this member follows it (and, for events, is going), so they show it at once.
test.describe("follows.state", () => {
  test("the buttons show what the member already does when they open a page", async ({
    page,
    browser,
    playwright,
  }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    await signedIn(page, "state");
    await go(page.request, event.slug);
    await follow(page.request, "host", "triple-creek-rc");

    await page.goto(`/events/${event.slug}`);
    await expect(
      page.getByRole("button", { name: "Following", exact: true, pressed: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Going", exact: true, pressed: true }),
    ).toBeEnabled();
    await page.goto("/clubs/triple-creek-rc");
    await expect(
      page.getByRole("button", { name: "Following", exact: true, pressed: true }),
    ).toBeEnabled();

    // Another member opening the same pages sees their own state: nothing yet.
    const other = await browser.newPage();
    await signedIn(other, "state-other");
    await other.goto(`/events/${event.slug}`);
    await expect(
      other.getByRole("button", { name: "Follow", exact: true, pressed: false }),
    ).toBeEnabled();
    await expect(
      other.getByRole("button", { name: "I'm going", exact: true, pressed: false }),
    ).toBeEnabled();
    await other.goto("/clubs/triple-creek-rc");
    await expect(
      other.getByRole("button", { name: "Follow this club", pressed: false }),
    ).toBeEnabled();
    await other.context().close();
  });

  test("the API answers following and going for the caller only", async ({ playwright }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    const member = await newMember(playwright, "state");
    const other = await newMember(playwright, "state-other");
    const state = async (request: typeof member.request, path: string) => {
      const response = await request.get(`${API}/me/state/${path}`);
      expect(response.status(), path).toBe(200);
      return response.json();
    };

    expect(await state(member.request, `event/${event.slug}`)).toEqual({
      following: false,
      going: false,
    });
    await follow(member.request, "event", event.slug);
    expect(await state(member.request, `event/${event.slug}`)).toEqual({
      following: true,
      going: false,
    });
    await go(member.request, event.slug);
    expect(await state(member.request, `event/${event.slug}`)).toEqual({
      following: true,
      going: true,
    });
    await follow(member.request, "discipline", "rotor");
    expect(await state(member.request, "discipline/rotor")).toEqual({
      following: true,
      going: false,
    });
    expect(await state(member.request, "place/silver-field")).toEqual({
      following: false,
      going: false,
    });

    // Someone else's follows and "going" are never in another member's answer.
    expect(await state(other.request, `event/${event.slug}`)).toEqual({
      following: false,
      going: false,
    });
    expect(await state(other.request, "discipline/rotor")).toEqual({
      following: false,
      going: false,
    });
    await Promise.all([member.request.dispose(), other.request.dispose()]);
  });

  test("something that doesn't exist answers 404, an unknown kind 400", async ({ playwright }) => {
    const member = await newMember(playwright, "state");
    expect((await member.request.get(`${API}/me/state/event/no-such-event-e2e`)).status()).toBe(
      404,
    );
    expect((await member.request.get(`${API}/me/state/discipline/boats`)).status()).toBe(404);
    expect((await member.request.get(`${API}/me/state/club/deland-rc`)).status()).toBe(400);
    await member.request.dispose();
  });

  test("signed out, the API answers 401 and the buttons ask to sign in", async ({
    page,
    playwright,
  }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    const anyone = await signedOut(playwright);
    expect((await anyone.get(`${API}/me/state/event/${event.slug}`)).status()).toBe(401);
    await anyone.dispose();

    await page.goto(`/events/${event.slug}`);
    const next = `/sign-in?next=${encodeURIComponent(`/events/${event.slug}`)}`;
    await expect(page.getByRole("link", { name: "Follow", exact: true })).toHaveAttribute(
      "href",
      next,
    );
    await expect(page.getByRole("link", { name: "I'm going", exact: true })).toHaveAttribute(
      "href",
      next,
    );
  });
});
