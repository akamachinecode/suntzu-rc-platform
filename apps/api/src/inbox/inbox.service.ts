import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, count, eq, gte, isNotNull, schema } from "@workspace/db";
import type { CorrectionInput, FeedbackInput, MessageInput } from "@workspace/shared";
import { type Database, InjectDb } from "../db/db.module.js";
import { env } from "../env.js";
import { addDays } from "../events/engine/read.js";
import { renderEmail, sendMail } from "../mail/mail.js";

const { messages, feedback, events, reviews } = schema;
const logger = new Logger("Inbox");

// What anyone can send to the crew: messages (contact, builds), feedback after an event and,
// for members, corrections. Everything lands in the crew's console; messages also by email.
@Injectable()
export class InboxService {
  constructor(@InjectDb() private readonly db: Database) {}

  async message(input: MessageInput, userId: string | null): Promise<void> {
    await this.db.insert(messages).values({
      kind: input.kind,
      topic: input.topic ?? null,
      name: input.name,
      email: input.email,
      body: input.body,
      link: input.link || null,
      userId,
    });
    if (!env.CREW_INBOX) return;
    try {
      await sendMail({
        to: env.CREW_INBOX,
        subject: `New ${input.kind === "build" ? "build" : "message"} on SunTzu RC${input.topic ? `: ${input.topic}` : ""}`,
        ...renderEmail({
          heading: input.kind === "build" ? "Someone shared a build" : "Someone wrote to the crew",
          paragraphs: [
            `From ${input.name} <${input.email}>`,
            input.body,
            ...(input.link ? [input.link] : []),
          ],
          button: { label: "Open the crew console", url: new URL("/crew", env.APP_URL).toString() },
          footer: "Sent to the crew inbox (CREW_INBOX).",
        }),
      });
    } catch (error) {
      // The message is saved either way; the console shows it.
      logger.warn(
        `Could not email the crew: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async feedback(slug: string, input: FeedbackInput): Promise<void> {
    const id = await this.eventId(slug);
    await this.db
      .insert(feedback)
      .values({ eventId: id, right: input.right, note: input.note ?? "" });
  }

  async correction(slug: string, input: CorrectionInput, userId: string): Promise<void> {
    const id = await this.eventId(slug);
    await this.withinQuota(userId);
    const [event] = await this.db.select().from(events).where(eq(events.id, id));
    // Only the first day given: the event keeps its length, so it never ends before it starts.
    const endDate =
      input.endDate ||
      (input.startDate && event?.endDate && event.datePrecision === "day"
        ? addDays(input.startDate, daysBetween(event.startDate, event.endDate))
        : input.startDate
          ? null
          : undefined);
    if (input.startDate && endDate && endDate < input.startDate) {
      throw new BadRequestException("The last day can't be before the first.");
    }
    const proposal = {
      ...(input.startDate && { startDate: input.startDate, datePrecision: "day" }),
      ...(endDate !== undefined && { endDate }),
      ...(input.cancelled && { status: "cancelled" }),
      ...(input.url && { url: input.url }),
    };
    await this.db.insert(reviews).values({
      kind: "change",
      eventId: id,
      proposal,
      note: [input.note, input.sourceUrl && `Seen at ${input.sourceUrl}`]
        .filter(Boolean)
        .join(" — "),
      submittedBy: userId,
    });
  }

  /** At most 20 corrections a member an hour: plenty for people, not for scripts. */
  private async withinQuota(userId: string): Promise<void> {
    const [row] = await this.db
      .select({ n: count() })
      .from(reviews)
      .where(
        and(
          eq(reviews.submittedBy, userId),
          gte(reviews.createdAt, new Date(Date.now() - 3_600_000)),
        ),
      );
    if ((row?.n ?? 0) >= 20) {
      throw new HttpException("That's a lot of corrections at once. Try again in an hour.", 429);
    }
  }

  private async eventId(slug: string): Promise<string> {
    const [row] = await this.db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.slug, slug), isNotNull(events.publishedAt)));
    if (!row) throw new NotFoundException();
    return row.id;
  }
}

function daysBetween(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
  );
}
