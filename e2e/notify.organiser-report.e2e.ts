import { expect, test } from "@playwright/test";
import { addEvent, becomeOrganiser, runJob, unique } from "./data.ts";
import { API, APP } from "./env.ts";
import { crewEdits, emailDates, floridaDate, member, OPEN_DAY, put } from "./jobs.ts";
import { inbox, waitForMail } from "./mail.ts";
import { FROM_APP } from "./people.ts";

// docs/bits/notify.organiser-report.md: `pnpm notify report` (on the 1st on its own) sends each
// verified organiser their club's month: how many follow it and what's coming up, with how many
// are going. Once per organiser, club and month; never to an organiser who stopped it.
// Martin County Modelers and Sarasota R/C Squadron are reserved for these tests.
test.describe("notify.organiser-report", () => {
  const MARTIN = { slug: "martin-county-modelers", name: "Martin County Modelers" };
  const SARASOTA = { slug: "sarasota-rc-squadron", name: "Sarasota R/C Squadron" };

  const reportsTo = (email: string, club: string) =>
    inbox(email).filter((mail) => mail.subject.startsWith(`${club} on SunTzu RC`));

  test("an organiser gets their club's report: followers, what's coming up and who's going", async ({
    playwright,
  }) => {
    const date = floridaDate(3);
    const event = await addEvent(playwright, {
      kind: OPEN_DAY,
      name: unique("E2E Report Open Day"),
      host: MARTIN.slug,
      placeText: "Stuart, FL",
      startDate: date,
    });
    try {
      // Everything the report counts is in place before the organiser is verified, so whichever
      // run sends their report (this test's or another's) sends this one.
      const fan = await member(playwright, "club-fan");
      await put(fan.request, `/me/follows/host/${MARTIN.slug}`);
      await put(fan.request, `/me/going/${event.slug}`);
      await fan.request.dispose();
      const people = await playwright.request.newContext();
      const { following } = (await (
        await people.get(`${API}/people/host/${MARTIN.slug}`)
      ).json()) as {
        following: number;
      };
      await people.dispose();
      expect(following).toBeGreaterThan(0);

      const organiser = await member(playwright, "organiser");
      const since = new Date();
      await becomeOrganiser(playwright, organiser.request, organiser.email, MARTIN.slug);
      runJob("notify", ["report"]);

      const mail = await waitForMail(organiser.email, `${MARTIN.name} on SunTzu RC`, since);
      expect(mail.subject).toBe(`${MARTIN.name} on SunTzu RC: ${following} following`);
      expect(mail.text).toContain(`${MARTIN.name} this month`);
      expect(mail.text).toContain(`${following} people follow the club on SunTzu RC.`);
      expect(mail.text).toContain(`${event.name} (${emailDates(date)}, 1 going)`);
      expect(mail.text).toContain(`Open the club dashboard: ${APP}/organise/${MARTIN.slug}`);
      expect(mail.text).toMatch(
        new RegExp(`Stop monthly reports: ${APP}/unsubscribe\\?token=[\\w-]+&what=report`),
      );
      expect(mail.unsubscribeUrl).toMatch(
        new RegExp(`^${API}/unsubscribe\\?token=[\\w-]+&what=report$`),
      );

      // Once a month: the next run doesn't send it again.
      runJob("notify", ["report"]);
      expect(reportsTo(organiser.email, MARTIN.name)).toHaveLength(1);
      await organiser.request.dispose();
    } finally {
      // The report lists the first ten upcoming events: move this one into the past so runs
      // against the same database don't push later runs' events off the list.
      await crewEdits(playwright, event.slug, { startDate: floridaDate(-1) });
    }
  });

  test("an organiser who stopped the report doesn't get it, for any of their clubs", async ({
    playwright,
  }) => {
    const quiet = await member(playwright, "quiet-organiser");
    let since = new Date();
    await becomeOrganiser(playwright, quiet.request, quiet.email, SARASOTA.slug);
    runJob("notify", ["report"]);
    const first = await waitForMail(quiet.email, `${SARASOTA.name} on SunTzu RC`, since);

    // One click on the email's own link (List-Unsubscribe) stops monthly reports.
    const stopped = await quiet.request.post(first.unsubscribeUrl!, { headers: FROM_APP });
    expect(stopped.status()).toBe(204);

    // They also become an organiser of a second club, with another new organiser: only that one
    // hears about it.
    const other = await member(playwright, "organiser");
    since = new Date();
    await becomeOrganiser(playwright, quiet.request, quiet.email, MARTIN.slug);
    await becomeOrganiser(playwright, other.request, other.email, MARTIN.slug);
    runJob("notify", ["report"]);
    await waitForMail(other.email, `${MARTIN.name} on SunTzu RC`, since);
    expect(reportsTo(quiet.email, MARTIN.name)).toHaveLength(0);
    expect(reportsTo(quiet.email, SARASOTA.name)).toHaveLength(1);
    await quiet.request.dispose();
    await other.request.dispose();
  });
});
