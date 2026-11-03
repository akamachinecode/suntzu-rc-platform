import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { and, asc, eq, isNotNull, isNull, schema } from "@workspace/db";
import type { TryInput, TryResult } from "@workspace/shared";
import { type Database, InjectDb } from "../db/db.module.js";
import { env } from "../env.js";
import { DISCIPLINE_WORDS } from "../mail/words.js";
import { renderEmail, sendMail } from "../mail/mail.js";
import { distanceMeters } from "../places/census/geometry.js";

const { zipCodes, hosts, hostMembers, places, tryRequests, user } = schema;
const logger = new Logger("Newcomers");
const RADIUS_MILES = 60;
const MAX_CLUBS = 3;

// "Try it" (principle 5 in LANDSCAPE.md): a curious newcomer reaches the nearest clubs that said
// they welcome newcomers, through their verified organisers. Nobody else sees the request.
@Injectable()
export class NewcomersService {
  constructor(@InjectDb() private readonly db: Database) {}

  async request(input: TryInput, userId: string | null): Promise<TryResult> {
    const [zip] = await this.db.select().from(zipCodes).where(eq(zipCodes.zip, input.zip));
    if (!zip) throw new BadRequestException("We don't know that ZIP code. Is it in Florida?");
    const here = { latitude: zip.latitude, longitude: zip.longitude };

    // Clubs that welcome newcomers, have a verified organiser, and fly this discipline (or
    // haven't said what they fly), nearest first, by their closest field.
    const rows = await this.db
      .select({ host: hosts, place: places })
      .from(hosts)
      .innerJoin(places, eq(places.hostId, hosts.id))
      .where(and(eq(hosts.acceptsNewcomers, true), isNotNull(hosts.verifiedAt)));
    const nearest = new Map<string, { host: typeof hosts.$inferSelect; miles: number }>();
    for (const { host, place } of rows) {
      if (place.latitude == null || place.longitude == null) continue;
      if (host.disciplines.length && !host.disciplines.includes(input.discipline)) continue;
      const miles =
        distanceMeters(here, { latitude: place.latitude, longitude: place.longitude }) / 1609.344;
      if (miles > RADIUS_MILES) continue;
      const known = nearest.get(host.id);
      if (!known || miles < known.miles) nearest.set(host.id, { host, miles });
    }
    const chosen = [...nearest.values()].sort((a, b) => a.miles - b.miles).slice(0, MAX_CLUBS);

    const sentTo: string[] = [];
    for (const { host, miles } of chosen) {
      const organisers = await this.db
        .select({ email: user.email })
        .from(hostMembers)
        .innerJoin(user, eq(hostMembers.userId, user.id))
        .where(and(eq(hostMembers.hostId, host.id), isNotNull(hostMembers.verifiedAt)));
      if (!organisers.length) continue;
      let delivered = false;
      for (const { email } of organisers) {
        try {
          await sendMail({
            to: email,
            subject: `Someone near you wants to try ${DISCIPLINE_WORDS[input.discipline]}`,
            ...renderEmail({
              heading: `${input.name} would like to try ${DISCIPLINE_WORDS[input.discipline]}`,
              paragraphs: [
                `They live about ${Math.round(miles)} miles from your field (ZIP ${input.zip}) and found ${host.name} on SunTzu RC.`,
                ...(input.message ? [`“${input.message}”`] : []),
                `Reply to them at ${input.email}. They agreed to share their name and email with you, and only with you.`,
              ],
              footer: `You got this because ${host.name} welcomes newcomers on SunTzu RC. Turn it off on your club dashboard.`,
            }),
          });
          delivered = true;
        } catch (error) {
          logger.warn(
            `Could not email an organiser: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      // Only a club that really got it counts: otherwise the crew takes the request.
      if (delivered) sentTo.push(host.name);
    }

    const toCrew = sentTo.length === 0;
    await this.db.insert(tryRequests).values({
      userId,
      name: input.name,
      email: input.email,
      zip: input.zip,
      discipline: input.discipline,
      message: input.message ?? "",
      hostIds: chosen.filter(({ host }) => sentTo.includes(host.name)).map(({ host }) => host.id),
      sentAt: toCrew ? null : new Date(),
    });
    if (toCrew && env.CREW_INBOX) {
      await sendMail({
        to: env.CREW_INBOX,
        subject: `A newcomer wants to try ${DISCIPLINE_WORDS[input.discipline]} near ${input.zip}`,
        ...renderEmail({
          heading: "No club nearby takes newcomers on SunTzu RC yet",
          paragraphs: [
            `${input.name} <${input.email}>, ZIP ${input.zip}.`,
            input.message || "No message.",
            "Find them a club, a track or a shop, and mark it as sent in the console.",
          ],
          button: {
            label: "Open try-it requests",
            url: new URL("/crew/claims", env.APP_URL).toString(),
          },
          footer: "Sent to the crew inbox (CREW_INBOX).",
        }),
      }).catch(() => undefined);
    }
    return { sentTo, toCrew };
  }

  async openForCrew() {
    const rows = await this.db
      .select()
      .from(tryRequests)
      .where(isNull(tryRequests.sentAt))
      .orderBy(asc(tryRequests.createdAt))
      .limit(200);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      zip: row.zip,
      discipline: row.discipline,
      message: row.message,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async markSent(id: string): Promise<void> {
    await this.db.update(tryRequests).set({ sentAt: new Date() }).where(eq(tryRequests.id, id));
  }
}
