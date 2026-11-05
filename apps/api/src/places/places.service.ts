import { Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, eq, isNotNull, isNull, schema, sql } from "@workspace/db";
import type { Host, HostDetail, PlaceDetail, RcEvent } from "@workspace/shared";
import { type Database, InjectDb } from "../db/db.module.js";
import { localDate } from "../events/engine/read.js";
import { toEvent, toHostSummary, toPlace } from "../events/events.service.js";

const { places, hosts, events, follows, hostMembers } = schema;

type HostRow = typeof hosts.$inferSelect;

// Places and the clubs and tracks that run them (docs/specs/0002-places.md): a public catalogue.
@Injectable()
export class PlacesService {
  constructor(@InjectDb() private readonly db: Database) {}

  async place(slug: string): Promise<PlaceDetail> {
    const [row] = await this.db
      .select({ place: places, host: hosts })
      .from(places)
      .leftJoin(hosts, eq(places.hostId, hosts.id))
      .where(eq(places.slug, slug));
    if (!row) throw new NotFoundException();
    const [upcoming, followers, stewards] = await Promise.all([
      this.upcoming(eq(events.placeId, row.place.id)),
      this.followers("place", row.place.id),
      row.place.hostId ? this.verifiedOrganisers(row.place.hostId) : Promise.resolve(0),
    ]);
    return {
      ...toPlace(row.place, row.host),
      events: upcoming,
      following: followers,
      stewarded: stewards > 0,
    };
  }

  async hosts(): Promise<Host[]> {
    const rows = await this.db.select().from(hosts).orderBy(asc(hosts.name));
    return rows.map(toHost);
  }

  async host(slug: string): Promise<HostDetail> {
    const [row] = await this.db.select().from(hosts).where(eq(hosts.slug, slug));
    if (!row) throw new NotFoundException();
    const [placeRows, upcoming, followers] = await Promise.all([
      this.db.select().from(places).where(eq(places.hostId, row.id)).orderBy(asc(places.name)),
      this.upcoming(eq(events.hostId, row.id)),
      this.followers("host", row.id),
    ]);
    return {
      ...toHost(row),
      places: placeRows.map((place) => toPlace(place, row)),
      events: upcoming,
      following: followers,
    };
  }

  private async upcoming(where: ReturnType<typeof eq>): Promise<RcEvent[]> {
    const today = localDate(new Date(), "America/New_York");
    const rows = await this.db
      .select({ event: events, place: places, host: hosts })
      .from(events)
      .leftJoin(places, eq(events.placeId, places.id))
      .leftJoin(hosts, eq(events.hostId, hosts.id))
      .where(
        and(
          where,
          isNotNull(events.publishedAt),
          isNull(events.rejectedAt),
          sql`case when ${events.datePrecision} = 'month'
            then (${events.startDate} + interval '1 month' - interval '1 day')::date
            else coalesce(${events.endDate}, ${events.startDate}) end >= ${today}`,
        ),
      )
      .orderBy(asc(events.startDate))
      .limit(50);
    return rows.map(({ event, place, host }) => toEvent(event, place, host));
  }

  private async followers(target: "place" | "host", id: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(follows)
      .where(and(eq(follows.target, target), eq(follows.targetId, id)));
    return row?.n ?? 0;
  }

  private async verifiedOrganisers(hostId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(hostMembers)
      .where(and(eq(hostMembers.hostId, hostId), isNotNull(hostMembers.verifiedAt)));
    return row?.n ?? 0;
  }
}

export function toHost(row: HostRow): Host {
  return {
    ...toHostSummary(row),
    summary: row.summary,
    city: row.city,
    county: row.county,
    disciplines: row.disciplines,
    verified: row.verifiedAt !== null,
    acceptsNewcomers: row.acceptsNewcomers,
  };
}
