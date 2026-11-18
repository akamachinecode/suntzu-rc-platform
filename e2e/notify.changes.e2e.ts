import { expect, test } from "@playwright/test";
import { addEvent, runJob, unique } from "./data.ts";
import { API, APP } from "./env.ts";
import { crewEdits, emailDates, floridaDate, member, OPEN_DAY, put, settings } from "./jobs.ts";
import { inbox, waitForMail } from "./mail.ts";
import { newEmail, signIn } from "./people.ts";

// docs/bits/notify.changes.md: when the crew moves or cancels an event, `pnpm notify` emails the
// people who follow it, go to it, or follow its club or field: one email per member and set of
// changes, never twice, and never for news that isn't ("confirmed").

test.describe("notify.changes", () => {
  const about = (email: string, name: string) =>
    inbox(email).filter((mail) => mail.subject.includes(name));

  test("a follower hears once that the dates moved", async ({ playwright }) => {
    const { slug, name } = await addEvent(playwright, {
      kind: OPEN_DAY,
      name: unique("E2E Moved Open Day"),
      startDate: floridaDate(20),
    });
    const follower = await member(playwright, "follower");
    await put(follower.request, `/me/follows/event/${slug}`);

    const since = new Date();
    const [start, end] = [floridaDate(27), floridaDate(28)];
    await crewEdits(playwright, slug, { startDate: start, endDate: end });
    runJob("notify");

    const mail = await waitForMail(follower.email, `Changed: ${name}`, since);
    const dates = emailDates(start, end);
    expect(mail.subject).toBe(`Changed: ${name}, now ${dates}`);
    // Both changes (first day and last day) in one email.
    expect(mail.text).toContain(`${name} has changed`);
    expect(mail.text).toContain(`The dates moved: it's now ${dates}.`);
    expect(mail.text).toContain(`The last day changed: it's now ${dates}.`);
    expect(mail.text).toContain(`See the event: ${APP}/events/${slug}`);
    expect(mail.text).toMatch(
      new RegExp(`Stop change alerts: ${APP}/unsubscribe\\?token=[\\w-]+&what=alerts`),
    );
    expect(mail.unsubscribeUrl).toMatch(
      new RegExp(`^${API}/unsubscribe\\?token=[\\w-]+&what=alerts$`),
    );

    // The next run (every hour once deployed) doesn't send it again.
    runJob("notify");
    expect(about(follower.email, name)).toHaveLength(1);
    await follower.request.dispose();
  });

  test("people going, and followers of its club and its field, hear it's cancelled", async ({
    playwright,
  }) => {
    // Dyer Park is RC Bush Pilots' field, so the event has both a place and a host.
    const { slug, name } = await addEvent(playwright, {
      kind: OPEN_DAY,
      name: unique("E2E Cancelled Open Day"),
      place: "dyer-park",
      startDate: floridaDate(21),
    });
    const going = await member(playwright, "going");
    await put(going.request, `/me/going/${slug}`);
    const clubFan = await member(playwright, "club-fan");
    await put(clubFan.request, "/me/follows/host/rc-bush-pilots");
    const fieldFan = await member(playwright, "field-fan");
    await put(fieldFan.request, "/me/follows/place/dyer-park");

    const since = new Date();
    await crewEdits(playwright, slug, { status: "cancelled" });
    runJob("notify");

    for (const person of [going, clubFan, fieldFan]) {
      const mail = await waitForMail(person.email, `Cancelled: ${name}`, since);
      expect(mail.subject).toBe(`Cancelled: ${name}`);
      expect(mail.text).toContain(`${name} is cancelled`);
      expect(mail.text).toContain("It's been cancelled.");
      expect(mail.text).toContain(`See the event: ${APP}/events/${slug}`);
      expect(about(person.email, name)).toHaveLength(1);
      await person.request.dispose();
    }
  });

  test("'confirmed' isn't news, and members who turned alerts off hear nothing", async ({
    playwright,
  }) => {
    const { slug, name } = await addEvent(playwright, {
      kind: OPEN_DAY,
      name: unique("E2E Quiet Open Day"),
      startDate: floridaDate(22),
    });
    const follower = await member(playwright, "follower");
    await put(follower.request, `/me/follows/event/${slug}`);
    const quiet = await member(playwright, "quiet");
    await put(quiet.request, `/me/follows/event/${slug}`);
    await settings(quiet.request, { changeAlerts: false });

    // The organiser confirms it: a change on the page, but nothing to email about.
    await crewEdits(playwright, slug, { status: "confirmed" });
    runJob("notify");
    expect(about(follower.email, name)).toHaveLength(0);

    // Then it moves: the follower hears (so the run above would have sent it), the quiet member doesn't.
    const since = new Date();
    const start = floridaDate(29);
    await crewEdits(playwright, slug, { startDate: start });
    runJob("notify");
    const mail = await waitForMail(follower.email, `Changed: ${name}`, since);
    expect(mail.subject).toBe(`Changed: ${name}, now ${emailDates(start)}`);
    expect(about(follower.email, name)).toHaveLength(1);
    expect(about(quiet.email, name)).toHaveLength(0);
    await follower.request.dispose();
    await quiet.request.dispose();
  });

  test("a member who follows straight after signing in, without opening My SunTzu RC, hears too", async ({
    playwright,
  }) => {
    // Signing in from an event's Follow button (follow-buttons.tsx: /sign-in?next=<the event>) lands
    // back on the event, where they press Follow: they never open My SunTzu RC.
    const { slug, name } = await addEvent(playwright, {
      kind: OPEN_DAY,
      name: unique("E2E Straight Follow"),
      startDate: floridaDate(23),
    });
    const request = await playwright.request.newContext();
    const email = await signIn(request, newEmail("straight"));
    await put(request, `/me/follows/event/${slug}`);

    const since = new Date();
    await crewEdits(playwright, slug, { status: "cancelled" });
    runJob("notify");
    await waitForMail(email, `Cancelled: ${name}`, since);
    await request.dispose();
  });
});
