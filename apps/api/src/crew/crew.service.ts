import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { and, asc, count, desc, eq, isNull, schema, sql } from "@workspace/db";
import {
  eventPatch,
  type CrewDecision,
  type CrewFeedback,
  type CrewMessage,
  type CrewReview,
  type CrewSummary,
  type EventPatchInput,
  type ManualEvent,
} from "@workspace/shared";
import { type Database, InjectDb } from "../db/db.module.js";
import { applyPatch, proposePatch, resolve, type Tx } from "../events/engine/resolve.js";
import { crewSource, publishManual } from "../events/manual.js";

const {
  reviews,
  events,
  places,
  hosts,
  sightings,
  sources,
  eventSightings,
  messages,
  feedback,
  tryRequests,
  hostMembers,
} = schema;

// The crew's decisions. Every one is kept on its review (who, when, what): it is the engine's
// feedback and the audit trail.
@Injectable()
export class CrewService {
  constructor(@InjectDb() private readonly db: Database) {}

  async summary(): Promise<CrewSummary> {
    const one = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
    return {
      openReviews: await one(
        this.db.select({ n: count() }).from(reviews).where(eq(reviews.status, "open")),
      ),
      openMessages: await one(
        this.db.select({ n: count() }).from(messages).where(isNull(messages.handledAt)),
      ),
      newFeedback: await one(
        this.db.select({ n: count() }).from(feedback).where(isNull(feedback.seenAt)),
      ),
      openTryRequests: await one(
        this.db.select({ n: count() }).from(tryRequests).where(isNull(tryRequests.sentAt)),
      ),
      pendingClaims: await one(
        this.db
          .select({ n: count() })
          .from(hostMembers)
          .where(and(isNull(hostMembers.verifiedAt), eq(hostMembers.method, "crew"))),
      ),
    };
  }

  async reviews(): Promise<CrewReview[]> {
    const rows = await this.db
      .select({
        review: reviews,
        event: events,
        place: places,
        host: hosts,
        sighting: sightings,
        source: sources,
      })
      .from(reviews)
      .leftJoin(events, eq(reviews.eventId, events.id))
      .leftJoin(places, eq(events.placeId, places.id))
      .leftJoin(hosts, eq(events.hostId, hosts.id))
      .leftJoin(sightings, eq(reviews.sightingId, sightings.id))
      .leftJoin(sources, eq(reviews.sourceId, sources.id))
      .where(eq(reviews.status, "open"))
      .orderBy(asc(reviews.createdAt))
      .limit(200);
    return rows.map(({ review, event, place, host, sighting, source }) => ({
      id: review.id,
      kind: review.kind,
      note: review.note,
      createdAt: review.createdAt.toISOString(),
      event: event && {
        slug: event.slug,
        name: event.name,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        datePrecision: event.datePrecision,
        url: event.url,
        entryFee: event.entryFee,
        published: event.publishedAt !== null,
        place: place?.name ?? event.placeText,
        host: host?.name ?? null,
      },
      sighting: sighting && {
        fields: sighting.fields,
        evidence: sighting.evidence,
        firstSeenAt: sighting.firstSeenAt.toISOString(),
      },
      source: source && {
        name: source.name,
        url: sighting?.fields.url ?? source.url,
        trust: source.trust,
      },
      proposal: review.proposal,
      fromMember: review.submittedBy !== null,
    }));
  }

  async decide(id: string, decision: CrewDecision, reviewerId: string): Promise<void> {
    const [review] = await this.db.select().from(reviews).where(eq(reviews.id, id));
    if (!review || review.status !== "open") throw new NotFoundException();
    const now = new Date();
    let rerun = false;

    await this.db.transaction(async (tx) => {
      const event = review.eventId
        ? (await tx.select().from(events).where(eq(events.id, review.eventId)))[0]
        : undefined;
      const patch = decision.patch ?? {};

      if (review.kind === "new-event" && event) {
        if (decision.action === "reject") {
          await tx
            .update(events)
            .set({ publishedAt: null, rejectedAt: now })
            .where(eq(events.id, event.id));
        } else {
          const current =
            decision.action === "correct"
              ? await applyPatch(tx, event, patch, { by: "crew" })
              : event;
          await tx
            .update(events)
            .set({ publishedAt: current.publishedAt ?? now, rejectedAt: null })
            .where(eq(events.id, event.id));
        }
      } else if (review.kind === "change" && event) {
        if (decision.action === "approve") {
          await applyPatch(tx, event, this.parseProposal(review.proposal), {
            by: "crew",
            ...(review.sightingId && { sightingId: review.sightingId }),
          });
        } else if (decision.action === "correct") {
          await applyPatch(tx, event, patch, { by: "crew" });
        }
      } else if (review.kind === "merge" && event && review.sightingId) {
        if (decision.action === "reject") {
          rerun = true; // resolve creates the new event, now that it knows they differ
        } else {
          await tx
            .insert(eventSightings)
            .values({ eventId: event.id, sightingId: review.sightingId, linkedBy: "crew" })
            .onConflictDoNothing();
          const [sighting] = await tx
            .select()
            .from(sightings)
            .where(eq(sightings.id, review.sightingId));
          const merged =
            decision.action === "correct"
              ? patch
              : sighting
                ? proposePatch(event, sighting.fields, false)
                : {};
          await applyPatch(tx, event, merged, { by: "crew", sightingId: review.sightingId });
        }
      }

      await tx
        .update(reviews)
        .set({
          status:
            decision.action === "approve"
              ? "approved"
              : decision.action === "correct"
                ? "corrected"
                : "rejected",
          reviewerId,
          decidedAt: now,
          ...(decision.note && { note: decision.note }),
        })
        .where(eq(reviews.id, id));
    });

    if (rerun) await resolve(this.db);
  }

  /** The crew adds an event by hand (from a flyer, a Facebook post, a phone call). */
  async createEvent(input: ManualEvent): Promise<{ slug: string }> {
    const event = await this.db.transaction(async (tx) =>
      publishManual(tx, input, { source: await crewSource(tx), hostId: null, by: "crew" }),
    );
    return { slug: event.slug };
  }

  /** The crew edits any event directly (beginner-friendly, results link, a typo). */
  async editEvent(slug: string, input: EventPatchInput): Promise<void> {
    const [event] = await this.db.select().from(events).where(eq(events.slug, slug));
    if (!event) throw new NotFoundException();
    await this.db.transaction((tx: Tx) =>
      applyPatch(tx, event, input, { by: "crew" }).then(() => undefined),
    );
  }

  async messages(): Promise<CrewMessage[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .orderBy(sql`${messages.handledAt} is not null`, desc(messages.createdAt))
      .limit(200);
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      topic: row.topic,
      name: row.name,
      email: row.email,
      body: row.body,
      link: row.link,
      createdAt: row.createdAt.toISOString(),
      handled: row.handledAt !== null,
    }));
  }

  async handleMessage(id: string): Promise<void> {
    const result = await this.db
      .update(messages)
      .set({ handledAt: new Date() })
      .where(eq(messages.id, id))
      .returning({ id: messages.id });
    if (!result.length) throw new NotFoundException();
  }

  async feedback(): Promise<CrewFeedback[]> {
    const rows = await this.db
      .select({ feedback, event: events })
      .from(feedback)
      .innerJoin(events, eq(feedback.eventId, events.id))
      .where(isNull(feedback.seenAt))
      .orderBy(desc(feedback.createdAt))
      .limit(200);
    return rows.map(({ feedback: row, event }) => ({
      id: row.id,
      event: { slug: event.slug, name: event.name },
      right: row.right,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async seeFeedback(id: string): Promise<void> {
    const result = await this.db
      .update(feedback)
      .set({ seenAt: new Date() })
      .where(eq(feedback.id, id))
      .returning({ id: feedback.id });
    if (!result.length) throw new NotFoundException();
  }

  private parseProposal(proposal: Record<string, unknown>): EventPatchInput {
    const parsed = eventPatch.safeParse(proposal);
    if (!parsed.success) throw new UnprocessableEntityException("The proposal can't be applied");
    return parsed.data;
  }
}
