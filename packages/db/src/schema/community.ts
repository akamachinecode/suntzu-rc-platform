import { FOLLOW_TARGETS, MESSAGE_KINDS } from "@workspace/shared";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { discipline, events, hosts, sightings } from "./events.js";

// The community (docs/specs/0003-community.md). Everything here belongs to a member and is
// deleted with their account, except what they gave to the public catalogue (submissions and
// corrections), which stays without their name.

export const followTarget = pgEnum("follow_target", FOLLOW_TARGETS);
export const messageKind = pgEnum("message_kind", MESSAGE_KINDS);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** A member's settings. Created the first time they open their page. */
export const members = pgTable("members", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // Optional: "near me" in emails without asking for a location.
  zip: text("zip"),
  radiusMiles: integer("radius_miles").notNull().default(60),
  disciplines: discipline("disciplines").array().notNull().default([]),
  weeklyDigest: boolean("weekly_digest").notNull().default(false),
  changeAlerts: boolean("change_alerts").notNull().default(true),
  // Organisers only: the club's report on the first of each month.
  monthlyReport: boolean("monthly_report").notNull().default(true),
  // Secret parts of URLs: the private calendar feed and one-click unsubscribe links.
  calendarToken: text("calendar_token").notNull().unique(),
  emailToken: text("email_token").notNull().unique(),
  ...timestamps,
});

export const follows = pgTable(
  "follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    target: followTarget("target").notNull(),
    // The event, host or place id, or the discipline's name.
    targetId: text("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.target, table.targetId] }),
    index("follows_target_idx").on(table.target, table.targetId),
  ],
);

/** "I'm going". Only the count is ever public. */
export const rsvps = pgTable(
  "rsvps",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.eventId] }),
    index("rsvps_event_id_idx").on(table.eventId),
  ],
);

/**
 * Who runs a club or track on Servo. A row is a claim until `verifiedAt` is set: by a code sent
 * to an address at the host's domain, a code found on its website, or the crew.
 */
export const hostMembers = pgTable(
  "host_members",
  {
    hostId: uuid("host_id")
      .notNull()
      .references(() => hosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // "domain-email", "website-code" or "crew".
    method: text("method").notNull(),
    // SHA-256 of the one-time code, never the code itself.
    codeHash: text("code_hash"),
    codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.hostId, table.userId] }),
    index("host_members_user_id_idx").on(table.userId),
  ],
);

/** Contact and build messages for the crew's inbox. Deleted after 12 months. */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: messageKind("kind").notNull(),
    topic: text("topic"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("messages_created_at_idx").on(table.createdAt)],
);

/** An event a member sent: a link the engine reads, or text the AI reads, for the crew to check. */
export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  url: text("url"),
  text: text("text"),
  // What happened: "read" (became a sighting), "unreadable" (left for the crew as it is).
  outcome: text("outcome").notNull().default("pending"),
  sightingId: uuid("sighting_id").references(() => sightings.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** "I'd like to try": a newcomer asks to be put in touch. Deleted after 12 months. */
export const tryRequests = pgTable("try_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  zip: text("zip").notNull(),
  discipline: discipline("discipline").notNull(),
  message: text("message").notNull().default(""),
  // Who it was sent to; empty when it went to the crew.
  hostIds: text("host_ids").array().notNull().default([]),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** "Was this information right?" after an event. Anonymous. */
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    right: boolean("right").notNull(),
    note: text("note").notNull().default(""),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("feedback_event_id_idx").on(table.eventId)],
);

/** Every email sent, so nothing is sent twice: one row per member, kind and subject. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // "change", "digest", "report".
    kind: text("kind").notNull(),
    // What it was about: a change id, a week, a month.
    key: text("key").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("notifications_once_idx").on(table.userId, table.kind, table.key)],
);

export type Member = typeof members.$inferSelect;
export type HostMember = typeof hostMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type TryRequest = typeof tryRequests.$inferSelect;
