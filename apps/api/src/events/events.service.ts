import { Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, eq, inArray, isNotNull, ne, schema, sql, type SQL } from "@workspace/db";
import {
  SOURCE_TRUST,
  type CalendarQuery,
  type EventDetail,
  type EventListQuery,
  type EventSource,
  type Place,
  type RcEvent,
} from "@workspace/shared";
import { type Database, InjectDb } from "../db/db.module.js";
import { env } from "../env.js";
import { localDate } from "./engine/read.js";
import { writeIcs, type IcsEvent } from "./ics-writer.js";

const { events, places, hosts, eventSightings, sightings, sources, changes, follows, rsvps } =
  schema;

const PUBLIC_FIELDS = ["created", "startDate", "endDate", "status", "datePrecision"] as const;

type EventRow = typeof events.$inferSelect;
type PlaceRow = typeof places.$inferSelect;
type HostRow = typeof hosts.$inferSelect;

const DISCIPLINE_NAMES = { air: "planes", rotor: "helicopters", ground: "cars", fpv: "FPV" };
const REGION_NAMES = {
  "south-florida": "South Florida",
  florida: "Florida",
  "road-trip": "road trips",
};
const KIND_NAMES = {
  "fly-in": "fly-ins",
  competition: "competitions",
  race: "races",
  show: "shows",
  "swap-meet": "swap meets",
  "open-day": "open days",
  course: "courses",
  other: "other events",
};

// The public calendar. Events, places and hosts are a public catalogue (no owner): anyone may
// read what is published; nothing here writes. Unpublished events (in review) answer 404.
@Injectable()
export class EventsService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Published events that haven't finished, soonest first. */
  async list(query: EventListQuery): Promise<RcEvent[]> {
    const from = query.from ?? localDate(new Date(), "America/New_York");
    // An event with only a month ("usually February") lasts, for this purpose, the whole month.
    const lastDay = sql`case when ${events.datePrecision} = 'month'
      then (${events.startDate} + interval '1 month' - interval '1 day')::date
      else coalesce(${events.endDate}, ${events.startDate}) end`;
    const conditions: SQL[] = [isNotNull(events.publishedAt), sql`${lastDay} >= ${from}`];
    if (query.to) conditions.push(sql`${events.startDate} <= ${query.to}`);
    if (query.discipline) conditions.push(eq(events.discipline, query.discipline));
    if (query.kind) conditions.push(eq(events.kind, query.kind));
    if (query.region) conditions.push(eq(events.region, query.region));
    if (query.host) conditions.push(eq(hosts.slug, query.host));
    if (query.place) conditions.push(eq(places.slug, query.place));
    conditions.push(sql`${events.rejectedAt} is null`);

    const rows = await this.db
      .select({ event: events, place: places, host: hosts })
      .from(events)
      .leftJoin(places, eq(events.placeId, places.id))
      .leftJoin(hosts, eq(events.hostId, hosts.id))
      .where(and(...conditions))
      .orderBy(asc(events.startDate), asc(events.name));
    return rows.map(({ event, place, host }) => toEvent(event, place, host));
  }

  async get(slug: string): Promise<EventDetail> {
    const [row] = await this.db
      .select({ event: events, place: places, host: hosts })
      .from(events)
      .leftJoin(places, eq(events.placeId, places.id))
      .leftJoin(hosts, eq(events.hostId, hosts.id))
      .where(and(eq(events.slug, slug), isNotNull(events.publishedAt)));
    if (!row) throw new NotFoundException();
    const [sourceList, history, editions, people] = await Promise.all([
      this.sourcesOf(row.event.id),
      this.historyOf(row.event.id),
      this.editionsOf(row.event),
      this.peopleOf(row.event.id),
    ]);
    return {
      ...toEvent(row.event, row.place, row.host),
      sources: sourceList,
      history,
      editions,
      people,
    };
  }

  /** What changed and when, oldest first: dates, status and the day it appeared. */
  private async historyOf(eventId: string): Promise<EventDetail["history"]> {
    const rows = await this.db
      .select()
      .from(changes)
      .where(and(eq(changes.eventId, eventId), inArray(changes.field, [...PUBLIC_FIELDS])))
      .orderBy(asc(changes.createdAt));
    return rows.map((row) => ({
      field: row.field as (typeof PUBLIC_FIELDS)[number],
      from: row.field === "created" ? null : row.oldValue,
      to: row.field === "created" ? null : row.newValue,
      at: row.createdAt.toISOString(),
    }));
  }

  /** Other published editions of the same series, in date order. */
  private async editionsOf(event: EventRow): Promise<EventDetail["editions"]> {
    if (!event.seriesId) return [];
    const rows = await this.db
      .select()
      .from(events)
      .where(
        and(
          eq(events.seriesId, event.seriesId),
          ne(events.id, event.id),
          isNotNull(events.publishedAt),
        ),
      )
      .orderBy(asc(events.startDate));
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      startDate: row.startDate,
      datePrecision: row.datePrecision,
      dateText: row.dateText,
      status: row.status,
      resultsUrl: row.resultsUrl,
    }));
  }

  private async peopleOf(eventId: string): Promise<EventDetail["people"]> {
    const [[followed], [going]] = await Promise.all([
      this.db
        .select({ n: count() })
        .from(follows)
        .where(and(eq(follows.target, "event"), eq(follows.targetId, eventId))),
      this.db.select({ n: count() }).from(rsvps).where(eq(rsvps.eventId, eventId)),
    ]);
    return { following: followed?.n ?? 0, going: going?.n ?? 0 };
  }

  async places(): Promise<Place[]> {
    const rows = await this.db
      .select({ place: places, host: hosts })
      .from(places)
      .leftJoin(hosts, eq(places.hostId, hosts.id))
      .orderBy(asc(places.name));
    return rows.map(({ place, host }) => toPlace(place, host));
  }

  /** An ICS feed of upcoming events with exact dates, filtered like the list. */
  async calendar(query: CalendarQuery): Promise<string> {
    const upcoming = (await this.list(query)).filter((event) => event.datePrecision === "day");
    const filters = [
      query.discipline && DISCIPLINE_NAMES[query.discipline],
      query.kind && KIND_NAMES[query.kind],
      query.region && REGION_NAMES[query.region],
    ].filter(Boolean);
    return writeIcs(
      {
        name: `SunTzu RC: RC events${filters.length ? ` (${filters.join(", ")})` : ""}`,
        description: "Upcoming RC events in Florida, checked against each organiser's page.",
        events: upcoming.map(toIcsEvent),
      },
      new Date(),
    );
  }

  async eventCalendar(slug: string): Promise<string> {
    const event = await this.get(slug);
    if (event.datePrecision !== "day") throw new NotFoundException("Dates not announced yet");
    return writeIcs(
      { name: event.name, description: event.summary, events: [toIcsEvent(event)] },
      new Date(),
    );
  }

  /** Each source's latest version of what it said about the event, most trusted first. */
  private async sourcesOf(eventId: string): Promise<EventSource[]> {
    const rows = await this.db
      .select({ source: sources, sighting: sightings })
      .from(eventSightings)
      .innerJoin(sightings, eq(eventSightings.sightingId, sightings.id))
      .innerJoin(sources, eq(sightings.sourceId, sources.id))
      .where(eq(eventSightings.eventId, eventId));
    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const current = latest.get(row.source.id);
      if (!current || row.sighting.lastSeenAt > current.sighting.lastSeenAt) {
        latest.set(row.source.id, row);
      }
    }
    return [...latest.values()]
      .sort(
        (a, b) =>
          SOURCE_TRUST.indexOf(a.source.trust) - SOURCE_TRUST.indexOf(b.source.trust) ||
          b.sighting.lastSeenAt.getTime() - a.sighting.lastSeenAt.getTime(),
      )
      .map(({ source, sighting }) => ({
        name: source.name,
        trust: source.trust,
        byCrew: source.adapter === "manual",
        // The page that said it; never the crew's internal files.
        url: sighting.fields.url ?? (source.adapter === "manual" ? null : source.url),
        firstSeenAt: sighting.firstSeenAt.toISOString(),
        lastSeenAt: sighting.lastSeenAt.toISOString(),
      }));
  }
}

export function toPlaceSummary(place: PlaceRow) {
  return {
    slug: place.slug,
    name: place.name,
    kind: place.kind,
    address: place.address,
    city: place.city,
    county: place.county,
    state: place.state,
    latitude: place.latitude,
    longitude: place.longitude,
    isFria: place.isFria,
    url: place.url,
  };
}

export function toPlace(place: PlaceRow, host: HostRow | null): Place {
  return {
    ...toPlaceSummary(place),
    notes: place.notes,
    host: host && toHostSummary(host),
    disciplines: place.disciplines,
    access: place.access,
    register: place.register,
    sourceUrl: place.sourceUrl,
    verifiedAt: place.verifiedAt?.toISOString() ?? null,
  };
}

export function toHostSummary(host: HostRow) {
  return { slug: host.slug, name: host.name, kind: host.kind, url: host.url };
}

export function toEvent(event: EventRow, place: PlaceRow | null, host: HostRow | null): RcEvent {
  return {
    slug: event.slug,
    name: event.name,
    kind: event.kind,
    discipline: event.discipline,
    status: event.status,
    startDate: event.startDate,
    endDate: event.endDate,
    datePrecision: event.datePrecision,
    dateText: event.dateText,
    timezone: event.timezone,
    region: event.region,
    place: place && toPlaceSummary(place),
    placeText: event.placeText,
    host: host && toHostSummary(host),
    summary: event.summary,
    url: event.url,
    sanctions: event.sanctions,
    classes: event.classes,
    entryFee: event.entryFee,
    entryUrl: event.entryUrl,
    resultsUrl: event.resultsUrl,
    requirements: event.requirements,
    beginnerFriendly: event.beginnerFriendly,
    confidence: event.confidence,
    lastCheckedAt: event.lastCheckedAt?.toISOString() ?? null,
    updatedAt: event.updatedAt.toISOString(),
  };
}

export function toIcsEvent(event: RcEvent): IcsEvent {
  const place = event.place;
  const where = place
    ? [place.name, place.address, place.city, place.state].filter(Boolean).join(", ")
    : event.placeText;
  const page = new URL(`/events/${event.slug}`, env.APP_URL).toString();
  return {
    uid: `${event.slug}@servo`,
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    cancelled: event.status === "cancelled",
    ...(where && { location: where }),
    ...(place?.latitude != null && place.longitude != null
      ? { latitude: place.latitude, longitude: place.longitude }
      : {}),
    url: page,
    description: [
      event.summary,
      event.url && `Organiser: ${event.url}`,
      `On SunTzu RC: ${page}`,
      "Always check the organiser's page before you travel.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    updatedAt: new Date(event.updatedAt),
  };
}
