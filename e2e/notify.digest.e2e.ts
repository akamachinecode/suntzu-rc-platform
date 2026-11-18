import { expect, test } from "@playwright/test";
import { addEvent, runJob, unique, ZIP_CODES } from "./data.ts";
import { API, APP } from "./env.ts";
import {
  crewEdits,
  emailDates,
  member,
  OPEN_DAY,
  type Playwright,
  settings,
  weekendAhead,
} from "./jobs.ts";
import { inbox, waitForMail } from "./mail.ts";

// docs/bits/notify.digest.md: `pnpm notify digest` (Thursdays on its own) emails each member who
// asked for "this weekend near you" and gave a ZIP code the weekend's events within their distance
// and disciplines, nearest first, up to ten; nobody gets an empty one.
test.describe("notify.digest", () => {
  // The census loads ZIP codes from the Census Bureau; the tests load two of them (jobs.ts).

  // The digest lists ten events at most, and the database isn't emptied between runs: each test
  // cancels its events when it's done, so earlier runs never crowd this run's events out. Helicopter
  // events, which other tests don't add, keep the readers' lists to this file's events.
  const DISCIPLINE = "rotor";
  let added: string[] = [];
  test.afterEach(async ({ playwright }) => {
    for (const slug of added) await crewEdits(playwright, slug, { status: "cancelled" });
    added = [];
  });

  async function event(
    playwright: Playwright,
    name: string,
    place: string,
    startDate: string,
    discipline = DISCIPLINE,
  ) {
    const created = await addEvent(playwright, {
      kind: OPEN_DAY,
      name: unique(name),
      place,
      startDate,
      discipline,
    });
    added.push(created.slug);
    return created;
  }

  const digestsTo = (email: string) =>
    inbox(email).filter((mail) => mail.subject.startsWith("This weekend near you"));

  test("a member hears about this weekend's events near them, nearest first, in their disciplines", async ({
    playwright,
  }) => {
    const { friday, saturday, sunday } = weekendAhead();
    // From Coconut Grove (ZIP 33133): Silver Field is 20 miles, Markham Park 28, West Delray 51.
    const near = await event(playwright, "E2E Digest Silver", "silver-field", saturday);
    const further = await event(playwright, "E2E Digest Markham", "markham-park", sunday);
    const tooFar = await event(
      playwright,
      "E2E Digest Delray",
      "west-delray-flying-field",
      saturday,
    );
    const otherDiscipline = await event(
      playwright,
      "E2E Digest FPV",
      "silver-field",
      saturday,
      "fpv",
    );
    const nextWeek = await event(
      playwright,
      "E2E Digest Next Week",
      "silver-field",
      weekAfter(friday),
    );
    const cancelled = await event(playwright, "E2E Digest Cancelled", "silver-field", saturday);
    await crewEdits(playwright, cancelled.slug, { status: "cancelled" });

    // The member asks for it last, so whichever run sends their digest sees every event above.
    const reader = await member(playwright, "digest");
    const since = new Date();
    await settings(reader.request, {
      name: "Dana Tester",
      zip: ZIP_CODES.miami.zip,
      radiusMiles: 30,
      disciplines: [DISCIPLINE],
      weeklyDigest: true,
    });
    runJob("notify", ["digest"]);

    const mail = await waitForMail(reader.email, "This weekend near you", since);
    expect(mail.subject).toBe(`This weekend near you: ${near.name} and 1 more`);
    expect(mail.text).toContain("Dana, here's what's on this weekend");
    const line = (item: { name: string; slug: string }, where: string, date: string) =>
      `${item.name} · ${emailDates(date)} · ${where} · ${APP}/events/${item.slug}`;
    const silver = mail.text.indexOf(line(near, "Silver Field, Miami (20 mi)", saturday));
    const markham = mail.text.indexOf(line(further, "Markham Park, Sunrise (28 mi)", sunday));
    expect(silver, mail.text).toBeGreaterThan(-1);
    expect(markham, mail.text).toBeGreaterThan(silver);
    for (const left of [tooFar, otherDiscipline, nextWeek, cancelled]) {
      expect(mail.text).not.toContain(left.name);
    }
    expect(mail.text).toContain(`The whole weekend: ${APP}/events?when=weekend`);
    expect(mail.text).toContain(`Every Thursday, within 30 miles of ${ZIP_CODES.miami.zip}`);
    expect(mail.text).toMatch(
      new RegExp(`stop it: ${APP}/unsubscribe\\?token=[\\w-]+&what=digest`),
    );
    expect(mail.unsubscribeUrl).toMatch(
      new RegExp(`^${API}/unsubscribe\\?token=[\\w-]+&what=digest$`),
    );

    // One per weekend: the next run doesn't send it again.
    runJob("notify", ["digest"]);
    expect(digestsTo(reader.email)).toHaveLength(1);
    await reader.request.dispose();
  });

  test("nothing for members with nothing near, or who didn't ask for it", async ({
    playwright,
  }) => {
    const { saturday } = weekendAhead();
    const { name } = await event(playwright, "E2E Digest Saturday", "silver-field", saturday);
    const nearby = await member(playwright, "digest-near");
    const farAway = await member(playwright, "digest-far");
    const notAsked = await member(playwright, "digest-off");
    const since = new Date();
    const wants = { disciplines: [DISCIPLINE] };
    await settings(nearby.request, { ...wants, zip: ZIP_CODES.miami.zip, weeklyDigest: true });
    // Naples is more than 85 miles from every field and track: nothing within the default 60.
    await settings(farAway.request, { ...wants, zip: ZIP_CODES.naples.zip, weeklyDigest: true });
    await settings(notAsked.request, { ...wants, zip: ZIP_CODES.miami.zip });
    runJob("notify", ["digest"]);

    // The same run sends one to the member nearby, so it did look at the others.
    expect((await waitForMail(nearby.email, "This weekend near you", since)).text).toContain(name);
    expect(digestsTo(farAway.email)).toHaveLength(0);
    expect(digestsTo(notAsked.email)).toHaveLength(0);
    for (const person of [nearby, farAway, notAsked]) await person.request.dispose();
  });
});

/** The Wednesday after the weekend: outside it. */
function weekAfter(friday: string): string {
  const date = new Date(`${friday}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 5);
  return date.toISOString().slice(0, 10);
}
