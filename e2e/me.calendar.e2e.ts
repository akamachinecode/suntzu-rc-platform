import { type APIRequestContext, expect, test } from "@playwright/test";
import { API, APP } from "./env.ts";
import { addEvent, crewApi, inDays } from "./data.ts";
import { follow, go, newMember, profileOf, signedOut, summariesIn } from "./members.ts";
import { FROM_APP, signedIn } from "./people.ts";

// docs/bits/me.calendar.md: a member's calendar app reads their private feed from the secret link on
// My SunTzu RC: events they follow or go to, plus upcoming events of what they follow, only with
// announced dates. The secret is the only key: a wrong or old link gets no calendar.
test.describe("me.calendar", () => {
  /** What a calendar app gets from a link: no cookies, no session. */
  async function fetchCalendar(anyone: APIRequestContext, url: string) {
    const response = await anyone.get(url.replace(/^webcal:/, "http:"));
    return {
      status: response.status(),
      type: response.headers()["content-type"],
      body: await response.text(),
    };
  }

  test("a member's calendar app reads what they follow from the link on My SunTzu RC", async ({
    page,
    playwright,
  }) => {
    const followed = await addEvent(playwright, { kind: "fly-in" });
    const going = await addEvent(playwright, {
      kind: "competition",
      startDate: inDays(14),
      endDate: inDays(15),
    });
    const ofDiscipline = await addEvent(playwright, {
      kind: "race",
      discipline: "rotor",
      startDate: inDays(20),
    });
    const notFollowed = await addEvent(playwright, { kind: "fly-in" });
    const over = await addEvent(playwright, {
      kind: "fly-in",
      startDate: inDays(-5),
      endDate: inDays(-4),
    });
    const undated = await addEvent(playwright, { kind: "show", startDate: inDays(40) });
    // Its organiser hasn't announced the day yet: only the month is known.
    const crew = await crewApi(playwright);
    const patched = await crew.patch(`${API}/crew/events/${undated.slug}`, {
      data: { datePrecision: "month" },
      headers: FROM_APP,
    });
    expect(patched.status()).toBe(204);
    await crew.dispose();

    await signedIn(page, "calendar");
    for (const slug of [followed.slug, over.slug, undated.slug])
      await follow(page.request, "event", slug);
    await go(page.request, going.slug);
    await follow(page.request, "discipline", "rotor");

    await page.goto("/me");
    const link = await page.getByRole("link", { name: "Apple or Outlook" }).getAttribute("href");
    expect(link).toMatch(/^webcal:\/\//);

    const app = await signedOut(playwright);
    const feed = await fetchCalendar(app, link!);
    expect(feed.status).toBe(200);
    expect(feed.type).toContain("text/calendar");
    expect(feed.body).toContain("BEGIN:VCALENDAR");
    expect(feed.body).toContain("X-WR-CALNAME:SunTzu RC: my RC calendar");
    const names = summariesIn(feed.body);
    expect(names).toEqual(expect.arrayContaining([followed.name, going.name, ofDiscipline.name]));
    for (const left of [notFollowed.name, over.name, undated.name])
      expect(names).not.toContain(left);
    await app.dispose();
  });

  test("each member's link opens only their own calendar", async ({ playwright }) => {
    const first = await addEvent(playwright, { kind: "fly-in" });
    const second = await addEvent(playwright, { kind: "fly-in" });
    const one = await newMember(playwright, "calendar");
    const two = await newMember(playwright, "calendar-other");
    await follow(one.request, "event", first.slug);
    await follow(two.request, "event", second.slug);

    const app = await signedOut(playwright);
    const mine = summariesIn(
      (await fetchCalendar(app, (await profileOf(one.request)).calendarUrl)).body,
    );
    const theirs = summariesIn(
      (await fetchCalendar(app, (await profileOf(two.request)).calendarUrl)).body,
    );
    expect(mine).toContain(first.name);
    expect(mine).not.toContain(second.name);
    expect(theirs).toContain(second.name);
    expect(theirs).not.toContain(first.name);
    await Promise.all([app.dispose(), one.request.dispose(), two.request.dispose()]);
  });

  test("a wrong or old link gets no calendar", async ({ playwright }) => {
    const app = await signedOut(playwright);
    const madeUp = "e2eMadeUpCalendarToken0123456789";
    for (const url of [
      `${APP}/calendar/${madeUp}.ics`,
      `${API}/me/calendar/${madeUp}.ics`,
      `${APP}/calendar/short.ics`,
      `${APP}/calendar/${madeUp}`,
    ]) {
      const feed = await fetchCalendar(app, url);
      expect(feed.status, url).toBe(404);
      expect(feed.body, url).not.toContain("BEGIN:VCALENDAR");
    }

    // A deleted account's link stops working.
    const event = await addEvent(playwright, { kind: "fly-in" });
    const member = await newMember(playwright, "calendar");
    await follow(member.request, "event", event.slug);
    const { calendarUrl } = await profileOf(member.request);
    expect((await fetchCalendar(app, calendarUrl)).status).toBe(200);
    expect((await member.request.delete(`${API}/me`, { headers: FROM_APP })).status()).toBe(204);
    const old = await fetchCalendar(app, calendarUrl);
    expect(old.status).toBe(404);
    expect(old.body).not.toContain(event.name);
    await Promise.all([app.dispose(), member.request.dispose()]);
  });
});
