import { randomBytes } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, eq, inArray, isNotNull, or, schema, sql, type SQL } from "@workspace/db";
import {
  DISCIPLINES,
  type Discipline,
  type Following,
  type FollowKey,
  type MemberProfile,
  type MemberUpdate,
  type PeopleCount,
  type ViewerState,
} from "@workspace/shared";
import { isCrew } from "../auth/auth.guard.js";
import { type Database, InjectDb } from "../db/db.module.js";
import { env } from "../env.js";
import { localDate } from "../events/engine/read.js";
import { toEvent, toHostSummary, toIcsEvent, toPlaceSummary } from "../events/events.service.js";
import { writeIcs } from "../events/ics-writer.js";

const { user, members, follows, rsvps, events, hosts, places, hostMembers } = schema;

type Target = FollowKey["target"];

// A member's own things: settings, follows, "going" and the private calendar. Every query is
// scoped to the caller; public counts never say who.
@Injectable()
export class MembersService {
  constructor(@InjectDb() private readonly db: Database) {}

  async profile(userId: string): Promise<MemberProfile> {
    const [person] = await this.db.select().from(user).where(eq(user.id, userId));
    if (!person) throw new NotFoundException();
    const member = await this.ensure(userId);
    const organiser = await this.db
      .select({ host: hosts, verifiedAt: hostMembers.verifiedAt })
      .from(hostMembers)
      .innerJoin(hosts, eq(hostMembers.hostId, hosts.id))
      .where(eq(hostMembers.userId, userId));
    return {
      name: person.name,
      email: person.email,
      role: isCrew(person.email) ? "crew" : "member",
      zip: member.zip,
      radiusMiles: member.radiusMiles,
      disciplines: member.disciplines,
      weeklyDigest: member.weeklyDigest,
      changeAlerts: member.changeAlerts,
      calendarUrl: new URL(`/calendar/${member.calendarToken}.ics`, env.APP_URL).toString(),
      organiserOf: organiser.map(({ host, verifiedAt }) => ({
        ...toHostSummary(host),
        verified: verifiedAt !== null,
      })),
    };
  }

  async update(userId: string, input: MemberUpdate): Promise<MemberProfile> {
    await this.ensure(userId);
    if (input.name !== undefined) {
      await this.db.update(user).set({ name: input.name }).where(eq(user.id, userId));
    }
    const { zip, radiusMiles, disciplines, weeklyDigest, changeAlerts } = input;
    const changes = {
      ...(radiusMiles !== undefined && { radiusMiles }),
      ...(disciplines !== undefined && { disciplines }),
      ...(weeklyDigest !== undefined && { weeklyDigest }),
      ...(changeAlerts !== undefined && { changeAlerts }),
      ...(zip !== undefined && { zip: zip === "" ? null : zip }),
    };
    if (Object.keys(changes).length) {
      await this.db.update(members).set(changes).where(eq(members.userId, userId));
    }
    return this.profile(userId);
  }

  /** Deletes the account and everything that belongs to it (cascades); contributions stay. */
  async remove(userId: string): Promise<void> {
    await this.db.delete(user).where(eq(user.id, userId));
  }

  async follow(userId: string, key: FollowKey, on: boolean): Promise<ViewerState> {
    const id = await this.resolveTarget(key);
    if (on) {
      await this.db
        .insert(follows)
        .values({ userId, target: key.target, targetId: id })
        .onConflictDoNothing();
    } else {
      await this.db
        .delete(follows)
        .where(
          and(eq(follows.userId, userId), eq(follows.target, key.target), eq(follows.targetId, id)),
        );
    }
    return this.state(userId, key);
  }

  async going(userId: string, slug: string, on: boolean): Promise<ViewerState> {
    const id = await this.resolveTarget({ target: "event", id: slug });
    if (on) {
      await this.db.insert(rsvps).values({ userId, eventId: id }).onConflictDoNothing();
      // Going means following: changes to the event reach them.
      await this.db
        .insert(follows)
        .values({ userId, target: "event", targetId: id })
        .onConflictDoNothing();
    } else {
      await this.db.delete(rsvps).where(and(eq(rsvps.userId, userId), eq(rsvps.eventId, id)));
    }
    return this.state(userId, { target: "event", id: slug });
  }

  async state(userId: string, key: FollowKey): Promise<ViewerState> {
    const id = await this.resolveTarget(key);
    const [followed] = await this.db
      .select({ n: count() })
      .from(follows)
      .where(
        and(eq(follows.userId, userId), eq(follows.target, key.target), eq(follows.targetId, id)),
      );
    const [goes] =
      key.target === "event"
        ? await this.db
            .select({ n: count() })
            .from(rsvps)
            .where(and(eq(rsvps.userId, userId), eq(rsvps.eventId, id)))
        : [{ n: 0 }];
    return { following: (followed?.n ?? 0) > 0, going: (goes?.n ?? 0) > 0 };
  }

  /** Public: how many follow (and, for events, go). */
  async people(key: FollowKey): Promise<PeopleCount> {
    const id = await this.resolveTarget(key);
    const [followed] = await this.db
      .select({ n: count() })
      .from(follows)
      .where(and(eq(follows.target, key.target), eq(follows.targetId, id)));
    const [goes] =
      key.target === "event"
        ? await this.db.select({ n: count() }).from(rsvps).where(eq(rsvps.eventId, id))
        : [{ n: 0 }];
    return { following: followed?.n ?? 0, going: goes?.n ?? 0 };
  }

  async following(userId: string): Promise<Following> {
    const rows = await this.db.select().from(follows).where(eq(follows.userId, userId));
    const ids = (target: Target) =>
      rows.filter((row) => row.target === target).map((row) => row.targetId);
    const going = (
      await this.db.select({ id: rsvps.eventId }).from(rsvps).where(eq(rsvps.userId, userId))
    ).map((row) => row.id);
    const today = localDate(new Date(), "America/New_York");
    const eventRows = async (list: string[]) =>
      list.length
        ? (
            await this.db
              .select({ event: events, place: places, host: hosts })
              .from(events)
              .leftJoin(places, eq(events.placeId, places.id))
              .leftJoin(hosts, eq(events.hostId, hosts.id))
              .where(
                and(
                  inArray(events.id, list),
                  isNotNull(events.publishedAt),
                  sql`coalesce(${events.endDate}, ${events.startDate}) >= ${today}`,
                ),
              )
              .orderBy(asc(events.startDate))
          ).map(({ event, place, host }) => toEvent(event, place, host))
        : [];
    const hostIds = ids("host");
    const placeIds = ids("place");
    return {
      events: await eventRows(ids("event")),
      going: await eventRows(going),
      hosts: hostIds.length
        ? (await this.db.select().from(hosts).where(inArray(hosts.id, hostIds))).map(toHostSummary)
        : [],
      places: placeIds.length
        ? (await this.db.select().from(places).where(inArray(places.id, placeIds))).map(
            toPlaceSummary,
          )
        : [],
      disciplines: ids("discipline").filter((name): name is Discipline =>
        (DISCIPLINES as readonly string[]).includes(name),
      ),
    };
  }

  /**
   * The private calendar: events the member follows or goes to, plus upcoming events of the
   * clubs, places and disciplines they follow. Only events with announced dates.
   */
  async calendar(token: string): Promise<string> {
    const [member] = await this.db.select().from(members).where(eq(members.calendarToken, token));
    if (!member) throw new NotFoundException();
    const rows = await this.db.select().from(follows).where(eq(follows.userId, member.userId));
    const going = await this.db
      .select({ id: rsvps.eventId })
      .from(rsvps)
      .where(eq(rsvps.userId, member.userId));
    const ids = (target: Target) =>
      rows.filter((row) => row.target === target).map((row) => row.targetId);
    const eventIds = [...ids("event"), ...going.map((row) => row.id)];
    const disciplines = ids("discipline").filter((name): name is Discipline =>
      (DISCIPLINES as readonly string[]).includes(name),
    );
    const matches: SQL[] = [];
    if (eventIds.length) matches.push(inArray(events.id, eventIds));
    if (ids("host").length) matches.push(inArray(events.hostId, ids("host")));
    if (ids("place").length) matches.push(inArray(events.placeId, ids("place")));
    if (disciplines.length) matches.push(inArray(events.discipline, disciplines));
    const today = localDate(new Date(), "America/New_York");
    const list = matches.length
      ? await this.db
          .select({ event: events, place: places, host: hosts })
          .from(events)
          .leftJoin(places, eq(events.placeId, places.id))
          .leftJoin(hosts, eq(events.hostId, hosts.id))
          .where(
            and(
              or(...matches),
              isNotNull(events.publishedAt),
              eq(events.datePrecision, "day"),
              sql`coalesce(${events.endDate}, ${events.startDate}) >= ${today}`,
            ),
          )
          .orderBy(asc(events.startDate))
      : [];
    return writeIcs(
      {
        name: "Servo: my RC calendar",
        description: "The RC events you follow on Servo, kept up to date.",
        events: list.map(({ event, place, host }) => toIcsEvent(toEvent(event, place, host))),
      },
      new Date(),
    );
  }

  /** One-click unsubscribe from an email: the secret token in the link is the key. */
  async unsubscribe(token: string, what: "alerts" | "digest" | "report"): Promise<boolean> {
    const set =
      what === "alerts"
        ? { changeAlerts: false }
        : what === "digest"
          ? { weeklyDigest: false }
          : { monthlyReport: false };
    const rows = await this.db
      .update(members)
      .set(set)
      .where(eq(members.emailToken, token))
      .returning({ id: members.userId });
    return rows.length > 0;
  }

  /** The member's settings, created on first use with fresh secret tokens. */
  async ensure(userId: string) {
    const [existing] = await this.db.select().from(members).where(eq(members.userId, userId));
    if (existing) return existing;
    const [created] = await this.db
      .insert(members)
      .values({ userId, calendarToken: token(), emailToken: token() })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    const [raced] = await this.db.select().from(members).where(eq(members.userId, userId));
    return raced!;
  }

  /** The row id behind a public slug; 404 for anything unknown or unpublished. */
  private async resolveTarget(key: FollowKey): Promise<string> {
    if (key.target === "discipline") {
      if (!(DISCIPLINES as readonly string[]).includes(key.id)) throw new NotFoundException();
      return key.id;
    }
    const table = { event: events, host: hosts, place: places }[key.target];
    const condition =
      key.target === "event"
        ? and(eq(events.slug, key.id), isNotNull(events.publishedAt))
        : eq(table.slug, key.id);
    const [row] = await this.db.select({ id: table.id }).from(table).where(condition);
    if (!row) throw new NotFoundException();
    return row.id;
  }
}

function token(): string {
  return randomBytes(24).toString("base64url");
}
