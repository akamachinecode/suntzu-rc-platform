import { createHash, createHmac, randomInt } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, count, eq, isNotNull, isNull, schema, sql } from "@workspace/db";
import type {
  ClaimInput,
  ClaimStatus,
  EventPatchInput,
  HostUpdate,
  ManualEvent,
  OrganiserHost,
  PlaceConfirm,
} from "@workspace/shared";
import { type Database, InjectDb } from "../db/db.module.js";
import { env } from "../env.js";
import { localDate } from "../events/engine/read.js";
import { applyPatch } from "../events/engine/resolve.js";
import { toEvent, toHostSummary, toPlace } from "../events/events.service.js";
import { organiserSource, publishManual } from "../events/manual.js";
import { renderEmail, sendMail } from "../mail/mail.js";

const { hosts, hostMembers, places, events, follows, rsvps, sources, eventSightings, sightings } =
  schema;

type HostRow = typeof hosts.$inferSelect;

const CODE_MINUTES = 30;

// Organisers: the people who run a club or track and proved it. They publish its events without
// waiting for the crew, keep its page and places current, and get its widget and report.
@Injectable()
export class OrganiseService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** The clubs the member organises or has asked to. */
  async mine(userId: string): Promise<ClaimStatus[]> {
    const rows = await this.db
      .select({ member: hostMembers, host: hosts })
      .from(hostMembers)
      .innerJoin(hosts, eq(hostMembers.hostId, hosts.id))
      .where(eq(hostMembers.userId, userId))
      .orderBy(asc(hosts.name));
    return rows.map(({ member, host }) =>
      this.status(host, member.method, member.verifiedAt, userId),
    );
  }

  async claim(userId: string, input: ClaimInput): Promise<ClaimStatus> {
    const host = await this.hostBySlug(input.host);
    const domain = domainOf(host);
    let codeHash: string | null = null;
    let codeExpiresAt: Date | null = null;

    if (input.method === "domain-email") {
      if (!domain) throw new BadRequestException("This club has no website domain on Servo yet.");
      const email = input.email?.toLowerCase() ?? "";
      const at = email.split("@")[1] ?? "";
      if (at !== domain && !at.endsWith(`.${domain}`)) {
        throw new BadRequestException(`Use an address at ${domain}.`);
      }
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      codeHash = hash(code);
      codeExpiresAt = new Date(Date.now() + CODE_MINUTES * 60_000);
      await sendMail({
        to: email,
        subject: `Your code to manage ${host.name} on Servo`,
        ...renderEmail({
          heading: `Is this your club?`,
          paragraphs: [
            `Someone asked to manage ${host.name} on Servo, the free calendar and map of RC in Florida.`,
            `If it was you, enter this code on Servo: ${code}. It works for ${CODE_MINUTES} minutes.`,
            "If it wasn't, ignore this email: nothing changes without the code.",
          ],
          footer: `Sent to an address at ${domain} because it's the club's own domain.`,
        }),
      });
    }

    await this.db
      .insert(hostMembers)
      .values({ hostId: host.id, userId, method: input.method, codeHash, codeExpiresAt })
      .onConflictDoUpdate({
        target: [hostMembers.hostId, hostMembers.userId],
        set: { method: input.method, codeHash, codeExpiresAt },
      });

    if (input.method === "crew" && env.CREW_INBOX) {
      await sendMail({
        to: env.CREW_INBOX,
        subject: `Club claim to check: ${host.name}`,
        ...renderEmail({
          heading: `Someone says they run ${host.name}`,
          paragraphs: [
            input.note || "No note.",
            "Check it and approve or reject it in the console.",
          ],
          button: {
            label: "Open club claims",
            url: new URL("/crew/claims", env.APP_URL).toString(),
          },
          footer: "Sent to the crew inbox (CREW_INBOX).",
        }),
      }).catch(() => undefined);
    }
    const [member] = await this.db
      .select()
      .from(hostMembers)
      .where(and(eq(hostMembers.hostId, host.id), eq(hostMembers.userId, userId)));
    return this.status(host, member!.method, member!.verifiedAt, userId);
  }

  async verifyCode(userId: string, slug: string, code: string): Promise<ClaimStatus> {
    const host = await this.hostBySlug(slug);
    const [member] = await this.db
      .select()
      .from(hostMembers)
      .where(and(eq(hostMembers.hostId, host.id), eq(hostMembers.userId, userId)));
    if (!member || member.method !== "domain-email" || !member.codeHash)
      throw new NotFoundException();
    if (!member.codeExpiresAt || member.codeExpiresAt < new Date()) {
      throw new BadRequestException("The code has expired. Ask for a new one.");
    }
    if (member.codeHash !== hash(code)) throw new BadRequestException("That code isn't right.");
    return this.markVerified(host, userId, "domain-email");
  }

  /** Looks for the member's code on the club's own website (home page or /servo.txt). */
  async verifyWebsite(userId: string, slug: string): Promise<ClaimStatus> {
    const host = await this.hostBySlug(slug);
    const [member] = await this.db
      .select()
      .from(hostMembers)
      .where(and(eq(hostMembers.hostId, host.id), eq(hostMembers.userId, userId)));
    if (!member) throw new NotFoundException();
    if (!host.url) throw new BadRequestException("This club has no website on Servo yet.");
    const code = websiteCode(host.id, userId);
    const pages = [host.url, new URL("/servo.txt", host.url).toString()];
    for (const page of pages) {
      try {
        const response = await fetch(page, {
          headers: { "User-Agent": "ServoBot/0.1 (club verification requested by its organiser)" },
          signal: AbortSignal.timeout(10_000),
        });
        if (response.ok && (await response.text()).includes(code)) {
          return this.markVerified(host, userId, "website-code");
        }
      } catch {
        // try the next page
      }
    }
    throw new BadRequestException(
      `We couldn't find ${code} on ${new URL(host.url).hostname}. Check it's published and try again.`,
    );
  }

  /** The crew vouches for a claim it checked by hand. */
  async approveByCrew(slug: string, userId: string, approve: boolean): Promise<void> {
    const host = await this.hostBySlug(slug);
    if (!approve) {
      await this.db
        .delete(hostMembers)
        .where(and(eq(hostMembers.hostId, host.id), eq(hostMembers.userId, userId)));
      return;
    }
    await this.markVerified(host, userId, "crew");
  }

  async pendingForCrew() {
    const rows = await this.db
      .select({
        member: hostMembers,
        host: hosts,
        email: schema.user.email,
        name: schema.user.name,
      })
      .from(hostMembers)
      .innerJoin(hosts, eq(hostMembers.hostId, hosts.id))
      .innerJoin(schema.user, eq(hostMembers.userId, schema.user.id))
      .where(and(isNull(hostMembers.verifiedAt), eq(hostMembers.method, "crew")))
      .orderBy(asc(hostMembers.createdAt));
    return rows.map(({ member, host, email, name }) => ({
      host: toHostSummary(host),
      userId: member.userId,
      name,
      email,
      requestedAt: member.createdAt.toISOString(),
    }));
  }

  async dashboard(userId: string, slug: string): Promise<OrganiserHost> {
    const host = await this.organisedHost(userId, slug);
    const today = localDate(new Date(), "America/New_York");
    const [placeRows, eventRows, followers] = await Promise.all([
      this.db.select().from(places).where(eq(places.hostId, host.id)).orderBy(asc(places.name)),
      this.db
        .select({ event: events, place: places })
        .from(events)
        .leftJoin(places, eq(events.placeId, places.id))
        .where(
          and(
            eq(events.hostId, host.id),
            isNotNull(events.publishedAt),
            sql`coalesce(${events.endDate}, ${events.startDate}) >= ${today}::date - 30`,
          ),
        )
        .orderBy(asc(events.startDate)),
      this.db
        .select({ n: count() })
        .from(follows)
        .where(and(eq(follows.target, "host"), eq(follows.targetId, host.id))),
    ]);
    const ids = eventRows.map(({ event }) => event.id);
    const goingRows = ids.length
      ? await this.db
          .select({ eventId: rsvps.eventId, n: count() })
          .from(rsvps)
          .where(sql`${rsvps.eventId} in ${ids}`)
          .groupBy(rsvps.eventId)
      : [];
    const followRows = ids.length
      ? await this.db
          .select({ eventId: follows.targetId, n: count() })
          .from(follows)
          .where(and(eq(follows.target, "event"), sql`${follows.targetId} in ${ids}`))
          .groupBy(follows.targetId)
      : [];
    const own = ids.length
      ? await this.db
          .select({ eventId: eventSightings.eventId })
          .from(eventSightings)
          .innerJoin(sightings, eq(eventSightings.sightingId, sightings.id))
          .innerJoin(sources, eq(sightings.sourceId, sources.id))
          .where(eq(sources.slug, `organiser-${host.slug}`))
      : [];
    const going = new Map(goingRows.map((row) => [row.eventId, row.n]));
    const following = new Map(followRows.map((row) => [row.eventId, row.n]));
    const byOrganiser = new Set(own.map((row) => row.eventId));
    return {
      host: {
        ...toHostSummary(host),
        summary: host.summary,
        disciplines: host.disciplines,
        acceptsNewcomers: host.acceptsNewcomers,
        verified: host.verifiedAt !== null,
      },
      places: placeRows.map((place) => toPlace(place, host)),
      events: eventRows.map(({ event, place }) => ({
        ...toEvent(event, place, host),
        going: going.get(event.id) ?? 0,
        following: following.get(event.id) ?? 0,
        byOrganiser: byOrganiser.has(event.id),
      })),
      followers: followers[0]?.n ?? 0,
      goingTotal: [...going.values()].reduce((sum, n) => sum + n, 0),
    };
  }

  async publish(userId: string, slug: string, input: ManualEvent): Promise<{ slug: string }> {
    const host = await this.organisedHost(userId, slug);
    if (input.place) {
      const [place] = await this.db.select().from(places).where(eq(places.slug, input.place));
      if (place && place.hostId && place.hostId !== host.id) {
        // Another club's field: fine to hold an event there, but say so in words.
        input = { ...input, place: undefined, placeText: input.placeText ?? place.name };
      }
    }
    const event = await this.db.transaction(async (tx) =>
      publishManual(tx, input, {
        source: await organiserSource(tx, host),
        hostId: host.id,
        by: "organiser",
      }),
    );
    return { slug: event.slug };
  }

  async editEvent(userId: string, slug: string, eventSlug: string, patch: EventPatchInput) {
    const host = await this.organisedHost(userId, slug);
    const [event] = await this.db.select().from(events).where(eq(events.slug, eventSlug));
    if (!event || event.hostId !== host.id) throw new NotFoundException();
    // Organisers speak for their own events; the name and the slug stay, so links keep working.
    const { name: _name, ...rest } = patch;
    await this.db.transaction((tx) => applyPatch(tx, event, rest, { by: "organiser" }));
  }

  async updateHost(userId: string, slug: string, input: HostUpdate): Promise<void> {
    const host = await this.organisedHost(userId, slug);
    const { url, ...rest } = input;
    await this.db
      .update(hosts)
      .set({ ...rest, ...(url !== undefined && { url: url || null }) })
      .where(eq(hosts.id, host.id));
  }

  /** The steward confirms a place's details: it shows "last checked" today. */
  async confirmPlace(userId: string, slug: string, placeSlug: string, input: PlaceConfirm) {
    const host = await this.organisedHost(userId, slug);
    const [place] = await this.db.select().from(places).where(eq(places.slug, placeSlug));
    if (!place || place.hostId !== host.id) throw new NotFoundException();
    await this.db
      .update(places)
      .set({
        access: input.access,
        ...(input.notes !== undefined && { notes: input.notes }),
        verifiedAt: new Date(),
      })
      .where(eq(places.id, place.id));
  }

  private async markVerified(host: HostRow, userId: string, method: string): Promise<ClaimStatus> {
    const now = new Date();
    await this.db
      .update(hostMembers)
      .set({ verifiedAt: now, method, codeHash: null, codeExpiresAt: null })
      .where(and(eq(hostMembers.hostId, host.id), eq(hostMembers.userId, userId)));
    await this.db
      .update(hosts)
      .set({ verifiedAt: host.verifiedAt ?? now, claimedAt: host.claimedAt ?? now })
      .where(eq(hosts.id, host.id));
    return this.status({ ...host, verifiedAt: host.verifiedAt ?? now }, method, now, userId);
  }

  private async organisedHost(userId: string, slug: string): Promise<HostRow> {
    const host = await this.hostBySlug(slug);
    const [member] = await this.db
      .select()
      .from(hostMembers)
      .where(
        and(
          eq(hostMembers.hostId, host.id),
          eq(hostMembers.userId, userId),
          isNotNull(hostMembers.verifiedAt),
        ),
      );
    if (!member) throw new ForbiddenException("Only this club's verified organisers can do that.");
    return host;
  }

  private async hostBySlug(slug: string): Promise<HostRow> {
    const [host] = await this.db.select().from(hosts).where(eq(hosts.slug, slug));
    if (!host) throw new NotFoundException();
    return host;
  }

  private status(
    host: HostRow,
    method: string,
    verifiedAt: Date | null,
    userId: string,
  ): ClaimStatus {
    return {
      host: toHostSummary(host),
      method: method === "website-code" || method === "crew" ? method : "domain-email",
      verified: verifiedAt !== null,
      domain: domainOf(host),
      websiteCode: websiteCode(host.id, userId),
    };
  }
}

// Sites many clubs share: an address there doesn't prove anything about one club.
const SHARED_DOMAINS =
  /(^|\.)(facebook\.com|google\.com|gmail\.com|wixsite\.com|wix\.com|weebly\.com|wordpress\.com|blogspot\.com|dualrates\.com|squarespace\.com|godaddysites\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|aol\.com)$/;

/** The club's own domain, from its saved domain or its website ("ampsrc.com"). */
function domainOf(host: HostRow): string | null {
  const domain = host.domain ? host.domain.toLowerCase() : host.url ? safeHostname(host.url) : null;
  return domain && !SHARED_DOMAINS.test(domain) ? domain : null;
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Stable for one member and one club, so there's nothing to store: "servo-verify-3f9a1c2e". */
function websiteCode(hostId: string, userId: string): string {
  return `servo-verify-${createHmac("sha256", env.BETTER_AUTH_SECRET).update(`${hostId}:${userId}`).digest("hex").slice(0, 10)}`;
}

function hash(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
