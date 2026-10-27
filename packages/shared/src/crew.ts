import { z } from "zod";
import {
  datePrecision,
  discipline,
  eventKind,
  eventStatus,
  sightingEvidence,
  sightingFields,
  sourceTrust,
} from "./events.js";

// The crew's console (docs/specs/0001-events.md, slice 2): the review queue, its decisions, the
// inbox and the feedback from event pages.

export const REVIEW_ACTIONS = ["approve", "correct", "reject"] as const;

/** The event fields the crew (and resolve) may change. */
export const eventPatch = z
  .object({
    name: z.string().trim().min(1).max(160),
    startDate: z.iso.date(),
    endDate: z.iso.date().nullable(),
    datePrecision,
    dateText: z.string().trim().max(80).nullable(),
    status: eventStatus,
    url: z.url().nullable(),
    entryFee: z.string().trim().max(120).nullable(),
    entryUrl: z.url().nullable(),
    resultsUrl: z.url().nullable(),
    summary: z.string().trim().max(600),
    sanctions: z.array(z.string().trim().min(1).max(40)).max(12),
    classes: z.array(z.string().trim().min(1).max(60)).max(40),
    beginnerFriendly: z.boolean(),
  })
  .partial();

export const crewEventSnapshot = z.object({
  slug: z.string(),
  name: z.string(),
  status: eventStatus,
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable(),
  datePrecision,
  url: z.string().nullable(),
  entryFee: z.string().nullable(),
  published: z.boolean(),
  place: z.string().nullable(),
  host: z.string().nullable(),
});

export const crewReview = z.object({
  id: z.uuid(),
  kind: z.enum(["new-event", "merge", "change", "disappeared", "new-source"]),
  note: z.string(),
  createdAt: z.iso.datetime(),
  event: crewEventSnapshot.nullable(),
  // What the source said, with the exact words behind each field.
  sighting: z
    .object({
      fields: sightingFields,
      evidence: sightingEvidence,
      firstSeenAt: z.iso.datetime(),
    })
    .nullable(),
  source: z.object({ name: z.string(), url: z.string(), trust: sourceTrust }).nullable(),
  proposal: z.record(z.string(), z.unknown()),
  // A member suggested it (corrections and submissions); their name isn't shown.
  fromMember: z.boolean(),
});

export const crewDecision = z.object({
  action: z.enum(REVIEW_ACTIONS),
  patch: eventPatch.optional(),
  note: z.string().trim().max(500).optional(),
});

export const crewMessage = z.object({
  id: z.uuid(),
  kind: z.string(),
  topic: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  createdAt: z.iso.datetime(),
  handled: z.boolean(),
});

export const crewFeedback = z.object({
  id: z.uuid(),
  event: z.object({ slug: z.string(), name: z.string() }),
  right: z.boolean(),
  note: z.string(),
  createdAt: z.iso.datetime(),
});

export const crewSummary = z.object({
  openReviews: z.number().int(),
  openMessages: z.number().int(),
  newFeedback: z.number().int(),
  openTryRequests: z.number().int(),
  pendingClaims: z.number().int(),
});

/** An event typed by the crew, or published by an organiser: it skips the review queue. */
export const manualEvent = z
  .object({
    name: z.string().trim().min(3, "Give it a name.").max(160),
    kind: eventKind,
    discipline,
    startDate: z.iso.date("Pick the first day."),
    endDate: z.union([z.literal(""), z.iso.date()]).optional(),
    // A place Servo knows, or where it is in words ("Orlando, FL").
    place: z.string().trim().max(120).optional(),
    placeText: z.string().trim().max(200).optional(),
    // The crew can name the host; organisers always publish as their own club.
    host: z.string().trim().max(120).optional(),
    url: z.union([z.literal(""), z.url("Paste a full link, starting with https://")]).optional(),
    entryFee: z.string().trim().max(120).optional(),
    summary: z.string().trim().max(600).optional(),
    beginnerFriendly: z.boolean().optional(),
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: "The last day can't be before the first.",
    path: ["endDate"],
  });

export type ManualEvent = z.output<typeof manualEvent>;
export type EventPatchInput = z.output<typeof eventPatch>;
export type CrewReview = z.output<typeof crewReview>;
export type CrewDecision = z.output<typeof crewDecision>;
export type CrewMessage = z.output<typeof crewMessage>;
export type CrewFeedback = z.output<typeof crewFeedback>;
export type CrewSummary = z.output<typeof crewSummary>;
