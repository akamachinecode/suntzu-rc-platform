import {
  and,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  or,
  schema,
  sql,
  type Database,
} from "@workspace/db";
import type { Discipline } from "@workspace/shared";
import { env } from "../env.js";
import { localDate } from "../events/engine/read.js";
import { formatDates } from "../mail/dates.js";
import { Logger } from "@nestjs/common";
import { renderEmail, sendMail } from "../mail/mail.js";
import { DISCIPLINE_WORDS } from "../mail/words.js";
import { distanceMeters } from "../places/census/geometry.js";
import { purgeMisses } from "../search/search.js";

// The emails SunTzu RC sends on its own (docs/specs/0003-community.md, slice 6). Each one is written
// to `notifications` before it goes out, so a run can be repeated (or scheduled every hour) without
// anyone getting the same email twice.

const logger = new Logger("Notify");

const {
  changes,
  events,
  places,
  follows,
  rsvps,
  members,
  user,
  hosts,
  hostMembers,
  notifications,
  messages,
  tryRequests,
} = schema;

const ALERT_FIELDS = ["startDate", "endDate", "status"];

export interface NotifyReport {
  alerts: number;
  digests: number;
  reports: number;
  purged: number;
}

const page = (path: string) => new URL(path, env.APP_URL).toString();
const stop = (token: string, what: "alerts" | "digest" | "report") =>
  page(`/unsubscribe?token=${encodeURIComponent(token)}&what=${what}`);
const oneClick = (token: string, what: "alerts" | "digest" | "report") =>
  new URL(`/unsubscribe?token=${encodeURIComponent(token)}&what=${what}`, env.API_URL).toString();

/**
 * Sends one email once: it's recorded in `notifications` first (so two runs can't both send it),
 * and the record is removed again if sending fails, so the next run retries it. One failure
 * never stops the others.
 */
async function deliver(
  db: Database,
  userId: string,
  kind: string,
  key: string,
  mail: Parameters<typeof sendMail>[0],
): Promise<boolean> {
  const rows = await db
    .insert(notifications)
    .values({ userId, kind, key })
    .onConflictDoNothing()
    .returning();
  if (!rows.length) return false;
  try {
    await sendMail(mail);
    // Stay well under SES's sending rate.
    await new Promise((resolve) => setTimeout(resolve, 100));
    return true;
  } catch (error) {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.kind, kind),
          eq(notifications.key, key),
        ),
      );
    logger.warn(
      `Could not send a ${kind} email: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

/**
 * Change alerts: when a followed or "going" event moves or is cancelled, one email per member
 * and event, listing what changed. Looks back a week so a missed run catches up.
 */
export async function sendAlerts(db: Database, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 7 * 86_400_000);
  const recent = await db
    .select({ change: changes, event: events })
    .from(changes)
    .innerJoin(events, eq(changes.eventId, events.id))
    .where(
      and(
        gte(changes.createdAt, since),
        inArray(changes.field, ALERT_FIELDS),
        isNotNull(events.publishedAt),
      ),
    );
  // Not every status change is news: held and confirmed aren't alerts.
  const newsworthy = recent.filter(
    ({ change }) =>
      change.field !== "status" ||
      change.newValue === "cancelled" ||
      change.oldValue === "cancelled",
  );
  const byEvent = new Map<string, typeof newsworthy>();
  for (const row of newsworthy)
    byEvent.set(row.event.id, [...(byEvent.get(row.event.id) ?? []), row]);

  let sent = 0;
  for (const [eventId, rows] of byEvent) {
    const event = rows[0]!.event;
    const key = `${eventId}:${rows
      .map(({ change }) => change.id)
      .sort()
      .join(",")}`;
    const audience = await db
      .selectDistinct({ id: user.id, email: user.email, token: members.emailToken })
      .from(user)
      .innerJoin(members, eq(members.userId, user.id))
      .leftJoin(follows, eq(follows.userId, user.id))
      .leftJoin(rsvps, eq(rsvps.userId, user.id))
      .where(
        and(
          eq(members.changeAlerts, true),
          or(
            and(eq(follows.target, "event"), eq(follows.targetId, eventId)),
            eq(rsvps.eventId, eventId),
            ...(event.hostId
              ? [and(eq(follows.target, "host"), eq(follows.targetId, event.hostId))]
              : []),
            ...(event.placeId
              ? [and(eq(follows.target, "place"), eq(follows.targetId, event.placeId))]
              : []),
          ),
        ),
      );
    const cancelled = event.status === "cancelled";
    const lines = rows.map(({ change }) =>
      change.field === "status"
        ? change.newValue === "cancelled"
          ? "It's been cancelled."
          : "It's back on: no longer cancelled."
        : change.field === "startDate"
          ? `The dates moved: it's now ${formatDates(event.startDate, event.endDate)}.`
          : `The last day changed: it's now ${formatDates(event.startDate, event.endDate)}.`,
    );
    for (const person of audience) {
      if (
        await deliver(db, person.id, "change", key, {
          to: person.email,
          subject: cancelled
            ? `Cancelled: ${event.name}`
            : `Changed: ${event.name}, now ${formatDates(event.startDate, event.endDate)}`,
          unsubscribeUrl: oneClick(person.token, "alerts"),
          ...renderEmail({
            heading: cancelled ? `${event.name} is cancelled` : `${event.name} has changed`,
            paragraphs: [...new Set(lines), "Check the organiser's page before you travel."],
            button: { label: "See the event", url: page(`/events/${event.slug}`) },
            footer: `You follow this event, its club or its field on SunTzu RC. Stop change alerts: ${stop(person.token, "alerts")}`,
          }),
        })
      )
        sent++;
    }
  }
  return sent;
}

/** Friday to Sunday ahead, in Florida. */
function weekend(now: Date): { from: string; to: string } {
  const today = localDate(now, "America/New_York");
  const day = new Date(`${today}T12:00:00Z`);
  const weekday = day.getUTCDay();
  const friday = new Date(day);
  friday.setUTCDate(day.getUTCDate() + ((5 - weekday + 7) % 7));
  const sunday = new Date(friday);
  sunday.setUTCDate(friday.getUTCDate() + 2);
  return { from: friday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}

/** "This weekend near you", for members who asked for it and gave a ZIP code. */
export async function sendDigests(db: Database, now = new Date()): Promise<number> {
  const { from, to } = weekend(now);
  const upcoming = await db
    .select({ event: events, place: places })
    .from(events)
    .innerJoin(places, eq(events.placeId, places.id))
    .where(
      and(
        isNotNull(events.publishedAt),
        eq(events.datePrecision, "day"),
        sql`${events.status} <> 'cancelled'`,
        sql`${events.startDate} <= ${to}`,
        sql`coalesce(${events.endDate}, ${events.startDate}) >= ${from}`,
      ),
    );
  if (!upcoming.length) return 0;
  const readers = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      member: members,
      zip: schema.zipCodes,
    })
    .from(members)
    .innerJoin(user, eq(members.userId, user.id))
    .innerJoin(schema.zipCodes, eq(schema.zipCodes.zip, members.zip))
    .where(eq(members.weeklyDigest, true));

  let sent = 0;
  for (const reader of readers) {
    const here = { latitude: reader.zip.latitude, longitude: reader.zip.longitude };
    const wanted = reader.member.disciplines as Discipline[];
    const near = upcoming
      .filter(({ event }) => !wanted.length || wanted.includes(event.discipline))
      .map(({ event, place }) => ({
        event,
        place,
        miles:
          place.latitude != null && place.longitude != null
            ? distanceMeters(here, { latitude: place.latitude, longitude: place.longitude }) /
              1609.344
            : Infinity,
      }))
      .filter(({ miles }) => miles <= reader.member.radiusMiles)
      .sort((a, b) => a.miles - b.miles)
      .slice(0, 10);
    if (!near.length) continue;
    if (
      await deliver(db, reader.id, "digest", from, {
        to: reader.email,
        subject: `This weekend near you: ${near[0]!.event.name}${near.length > 1 ? ` and ${near.length - 1} more` : ""}`,
        unsubscribeUrl: oneClick(reader.member.emailToken, "digest"),
        ...renderEmail({
          heading: `${reader.name ? `${reader.name.split(" ")[0]}, here's` : "Here's"} what's on this weekend`,
          paragraphs: near.map(
            ({ event, place, miles }) =>
              `${event.name} · ${formatDates(event.startDate, event.endDate)} · ${place.name}${place.city ? `, ${place.city}` : ""} (${Math.round(miles)} mi) · ${page(`/events/${event.slug}`)}`,
          ),
          button: { label: "The whole weekend", url: page("/events?when=weekend") },
          footer: `Every Thursday, within ${reader.member.radiusMiles} miles of ${reader.member.zip}${wanted.length ? ` for ${wanted.map((d) => DISCIPLINE_WORDS[d]).join(", ")}` : ""}. Change it in My SunTzu RC, or stop it: ${stop(reader.member.emailToken, "digest")}`,
        }),
      })
    )
      sent++;
  }
  return sent;
}

/** On the first of the month, each verified organiser hears how their club is doing. */
export async function sendReports(db: Database, now = new Date()): Promise<number> {
  const month = localDate(now, "America/New_York").slice(0, 7);
  const today = localDate(now, "America/New_York");
  const organisers = await db
    .select({
      host: hosts,
      id: user.id,
      email: user.email,
      token: members.emailToken,
      wants: members.monthlyReport,
    })
    .from(hostMembers)
    .innerJoin(hosts, eq(hostMembers.hostId, hosts.id))
    .innerJoin(user, eq(hostMembers.userId, user.id))
    .leftJoin(members, eq(members.userId, user.id))
    .where(isNotNull(hostMembers.verifiedAt));

  let sent = 0;
  for (const organiser of organisers) {
    if (organiser.wants === false) continue;
    const [followers] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(follows)
      .where(and(eq(follows.target, "host"), eq(follows.targetId, organiser.host.id)));
    const coming = await db
      .select({
        event: events,
        going: sql<number>`(select count(*)::int from rsvps r where r.event_id = ${events.id})`,
      })
      .from(events)
      .where(
        and(
          eq(events.hostId, organiser.host.id),
          isNotNull(events.publishedAt),
          sql`coalesce(${events.endDate}, ${events.startDate}) >= ${today}`,
        ),
      )
      .orderBy(events.startDate)
      .limit(10);
    if (
      await deliver(db, organiser.id, "report", `${organiser.host.id}:${month}`, {
        to: organiser.email,
        subject: `${organiser.host.name} on SunTzu RC: ${followers?.n ?? 0} following`,
        ...(organiser.token && { unsubscribeUrl: oneClick(organiser.token, "report") }),
        ...renderEmail({
          heading: `${organiser.host.name} this month`,
          paragraphs: [
            `${followers?.n ?? 0} people follow the club on SunTzu RC.`,
            coming.length
              ? `Coming up: ${coming.map(({ event, going }) => `${event.name} (${formatDates(event.startDate, event.endDate)}, ${going} going)`).join("; ")}.`
              : "Nothing on the calendar yet: publish your next event and followers hear about it.",
          ],
          button: {
            label: "Open the club dashboard",
            url: page(`/organise/${organiser.host.slug}`),
          },
          footer: `You're an organiser of ${organiser.host.name} on SunTzu RC.${organiser.token ? ` Stop monthly reports: ${stop(organiser.token, "report")}` : ""}`,
        }),
      })
    )
      sent++;
  }
  return sent;
}

/** Messages and "try it" requests are kept for 12 months, searches without results 90 days. */
export async function purge(db: Database, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 365 * 86_400_000);
  const gone = await db
    .delete(messages)
    .where(lt(messages.createdAt, cutoff))
    .returning({ id: messages.id });
  const tries = await db
    .delete(tryRequests)
    .where(lt(tryRequests.createdAt, cutoff))
    .returning({ id: tryRequests.id });
  // Searches without results are kept 90 days (spec 0005).
  const misses = await purgeMisses(db, localDate(now, "America/New_York"));
  return gone.length + tries.length + misses;
}
