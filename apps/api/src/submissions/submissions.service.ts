import { HttpException, Injectable, Logger } from "@nestjs/common";
import { and, count, eq, gte, inArray, schema } from "@workspace/db";
import type { Sighting, SubmissionInput, SubmissionResult } from "@workspace/shared";
import { publicFetch } from "../common/public-url.js";
import { type Database, InjectDb } from "../db/db.module.js";
import { env } from "../env.js";
import { extractEvents, verify } from "../events/engine/ai.js";
import { PoliteFetcher } from "../events/engine/fetcher.js";
import { readIcs } from "../events/engine/ics.js";
import { readJsonLd } from "../events/engine/json-ld.js";
import { fingerprint, htmlText, localDate } from "../events/engine/read.js";
import { resolve } from "../events/engine/resolve.js";

const { sources, sightings, submissions, reviews, eventSightings, events, messages, user } = schema;
const logger = new Logger("Submissions");
const PER_HOUR = 10;

// A member sends an event (docs/specs/0003-community.md, slice 3). A link is read like any source,
// politely; text is read by the AI with quotes. What comes out goes through resolve, so it waits
// for the crew credited to the member, or links to the event we already have. When nothing can be
// read, a person reads it instead (the crew's inbox).
@Injectable()
export class SubmissionsService {
  constructor(@InjectDb() private readonly db: Database) {}

  async submit(userId: string, input: SubmissionInput): Promise<SubmissionResult> {
    const [recent] = await this.db
      .select({ n: count() })
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, userId),
          gte(submissions.createdAt, new Date(Date.now() - 3_600_000)),
        ),
      );
    if ((recent?.n ?? 0) >= PER_HOUR) {
      throw new HttpException("That's a lot of events at once. Try again in an hour.", 429);
    }
    // Members choose these links: only public addresses, every redirect checked, a size limit
    // (common/public-url.ts). A fresh fetcher each time, so a site's robots.txt is read afresh.
    const fetcher = new PoliteFetcher({ fetch: publicFetch });
    const source = await this.source();
    const [submission] = await this.db
      .insert(submissions)
      .values({ userId, url: input.url || null, text: input.text || null })
      .returning();
    const id = submission!.id;
    const today = localDate(new Date(), "America/New_York");
    const context = { timezone: "America/New_York" };
    let found: Sighting[] = [];

    if (input.url) {
      const outcome = await fetcher.get(input.url).catch((error: unknown) => {
        logger.log(
          `Refused a submitted link: ${error instanceof Error ? error.message : String(error)}`,
        );
        return { ok: false as const, reason: "error" as const };
      });
      if (outcome.ok) {
        const { body, contentType, url } = outcome.page;
        found =
          contentType?.includes("calendar") || body.trimStart().startsWith("BEGIN:VCALENDAR")
            ? readIcs(body, context).sightings
            : readJsonLd(body, url, context).sightings;
        if (!found.length) found = await this.ai(htmlText(body).slice(0, 20_000), today, id);
      } else {
        logger.log(`Couldn't read a submitted link (${outcome.reason})`);
      }
    }
    if (!found.length && input.text) found = await this.ai(input.text, today, id);

    if (!found.length) {
      await this.toInbox(userId, input);
      await this.db
        .update(submissions)
        .set({ outcome: "unreadable" })
        .where(eq(submissions.id, id));
      return { outcome: "inbox", events: [] };
    }

    const stored: string[] = [];
    for (const sighting of found.slice(0, 10)) {
      const [row] = await this.db
        .insert(sightings)
        .values({
          sourceId: source.id,
          externalId: `${id}:${sighting.externalId}`.slice(0, 300),
          fingerprint: fingerprint(sighting.fields),
          name: sighting.fields.name,
          startDate: sighting.fields.startDate,
          endDate: sighting.fields.endDate ?? null,
          fields: sighting.fields,
          evidence: sighting.evidence,
        })
        .onConflictDoNothing()
        .returning({ id: sightings.id });
      if (row) stored.push(row.id);
    }
    await resolve(this.db);
    if (stored.length) {
      await this.db
        .update(reviews)
        .set({ submittedBy: userId })
        .where(inArray(reviews.sightingId, stored));
      await this.db
        .update(submissions)
        .set({ outcome: "read", sightingId: stored[0]! })
        .where(eq(submissions.id, id));
    }

    const linked = stored.length
      ? await this.db
          .select({ event: events })
          .from(eventSightings)
          .innerJoin(events, eq(eventSightings.eventId, events.id))
          .where(inArray(eventSightings.sightingId, stored))
      : [];
    const open = stored.length
      ? await this.db
          .select({ id: reviews.sightingId })
          .from(reviews)
          .where(and(inArray(reviews.sightingId, stored), eq(reviews.status, "open")))
      : [];
    const known = linked.some(({ event }) => event.publishedAt) && open.length === 0;
    return {
      outcome: known ? "known" : "queued",
      events: found.slice(0, 10).map((sighting) => {
        const match = linked.find(({ event }) => event.startDate === sighting.fields.startDate);
        return {
          name: sighting.fields.name,
          startDate: sighting.fields.startDate,
          slug: match?.event.publishedAt ? match.event.slug : null,
        };
      }),
    };
  }

  private async ai(text: string, today: string, id: string): Promise<Sighting[]> {
    if (!env.BEDROCK_MODEL_ID || text.length < 20) return [];
    try {
      const result = await extractEvents(text, today, {
        modelId: env.BEDROCK_MODEL_ID,
        fallbackModelId: env.BEDROCK_FALLBACK_MODEL_ID,
        region: env.AWS_REGION,
      });
      return result ? verify(result, text, id) : [];
    } catch (error) {
      logger.warn(
        `AI extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private async toInbox(userId: string, input: SubmissionInput) {
    const [person] = await this.db.select().from(user).where(eq(user.id, userId));
    await this.db.insert(messages).values({
      kind: "contact",
      topic: "event",
      name: person?.name || "A member",
      email: person?.email ?? "",
      body: input.text || `Event link: ${input.url}`,
      link: input.url || null,
      userId,
    });
  }

  /** Everything members send speaks through one source with community trust. */
  private async source() {
    const [existing] = await this.db
      .select()
      .from(sources)
      .where(eq(sources.slug, "member-submissions"));
    if (existing) return existing;
    const [created] = await this.db
      .insert(sources)
      .values({
        slug: "member-submissions",
        name: "Sent by a member",
        url: env.APP_URL,
        adapter: "submission",
        trust: "community",
        status: "active",
        permission: "Sent to SunTzu RC by a member.",
      })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    // Created by a request running at the same time.
    const [raced] = await this.db
      .select()
      .from(sources)
      .where(eq(sources.slug, "member-submissions"));
    return raced!;
  }
}
