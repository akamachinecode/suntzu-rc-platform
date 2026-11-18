import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { addEvent } from "./data.ts";
import { follow, go, newMember, peopleOf, signedOut } from "./members.ts";

// docs/bits/follows.count.md: anyone can ask how many people follow something (and, for an event,
// how many are going). Only the numbers, never who.
test.describe("follows.count", () => {
  test("anyone sees how many follow and go to an event, never who", async ({ playwright }) => {
    const event = await addEvent(playwright, { kind: "fly-in" });
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 0, going: 0 });

    const follower = await newMember(playwright, "count");
    await follow(follower.request, "event", event.slug);
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 1, going: 0 });

    // Going also follows.
    const goer = await newMember(playwright, "count");
    await go(goer.request, event.slug);
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 2, going: 1 });

    const anyone = await signedOut(playwright);
    const response = await anyone.get(`${API}/people/event/${event.slug}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("public, max-age=60");
    const body = await response.text();
    expect(Object.keys(JSON.parse(body)).sort()).toEqual(["following", "going"]);
    for (const email of [follower.email, goer.email]) {
      expect(body).not.toContain(email);
      expect(body).not.toContain(email.split("@")[0]);
    }

    await go(goer.request, event.slug, false);
    await follow(follower.request, "event", event.slug, false);
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 1, going: 0 });
    await Promise.all([anyone.dispose(), follower.request.dispose(), goer.request.dispose()]);
  });

  test("clubs, places and disciplines have a following count and nobody goes to them", async ({
    playwright,
  }) => {
    const member = await newMember(playwright, "count");
    for (const [target, id] of [
      ["host", "triple-creek-rc"],
      ["place", "silver-field"],
      ["discipline", "fpv"],
    ] as const) {
      await follow(member.request, target, id);
      const counts = await peopleOf(playwright, target, id);
      expect(counts.following, `${target}/${id}`).toBeGreaterThanOrEqual(1);
      expect(counts.going, `${target}/${id}`).toBe(0);
    }
    await member.request.dispose();
  });

  test("something that doesn't exist answers 404, an unknown kind 400", async ({ playwright }) => {
    const anyone = await signedOut(playwright);
    expect((await anyone.get(`${API}/people/event/no-such-event-e2e`)).status()).toBe(404);
    expect((await anyone.get(`${API}/people/discipline/boats`)).status()).toBe(404);
    expect((await anyone.get(`${API}/people/club/deland-rc`)).status()).toBe(400);
    await anyone.dispose();
  });
});
