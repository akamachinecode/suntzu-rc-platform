import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, eq, isNotNull, schema } from "@workspace/db";
import type { CorrectionInput, FeedbackInput, MessageInput } from "@workspace/shared";
import { type Database, InjectDb } from "../db/db.module.js";
import { env } from "../env.js";
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
        subject: `New ${input.kind === "build" ? "build" : "message"} on Servo${input.topic ? `: ${input.topic}` : ""}`,
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
    const proposal = {
      ...(input.startDate && { startDate: input.startDate, datePrecision: "day" }),
      ...(input.endDate !== undefined && input.endDate !== "" && { endDate: input.endDate }),
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

  private async eventId(slug: string): Promise<string> {
    const [row] = await this.db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.slug, slug), isNotNull(events.publishedAt)));
    if (!row) throw new NotFoundException();
    return row.id;
  }
}
