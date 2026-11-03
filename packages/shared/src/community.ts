import { z } from "zod";
import {
  discipline,
  event,
  followTarget,
  hostSummary,
  messageKind,
  placeSummary,
} from "./events.js";

// The community's contracts (docs/specs/0003-community.md): a member's settings, what they
// follow, and what anyone can send to the crew.

export const ROLES = ["member", "crew"] as const;
export const role = z.enum(ROLES);

const zip = z.string().regex(/^\d{5}$/, "A 5-digit ZIP code.");

export const memberProfile = z.object({
  name: z.string(),
  email: z.email(),
  role,
  zip: zip.nullable(),
  radiusMiles: z.number().int(),
  disciplines: z.array(discipline),
  weeklyDigest: z.boolean(),
  changeAlerts: z.boolean(),
  // Private feed of everything the member follows; anyone with the URL can read it.
  calendarUrl: z.url(),
  organiserOf: z.array(hostSummary.extend({ verified: z.boolean() })),
});

export const memberUpdate = z.object({
  name: z.string().trim().max(80).optional(),
  // "" clears it.
  zip: z.union([z.literal(""), zip]).optional(),
  radiusMiles: z.number().int().min(5).max(300).optional(),
  disciplines: z.array(discipline).max(4).optional(),
  weeklyDigest: z.boolean().optional(),
  changeAlerts: z.boolean().optional(),
});

/** Something to follow, by its public slug (or the discipline's name). */
export const followKey = z.object({
  target: followTarget,
  id: z.string().trim().min(1).max(120),
});

export const following = z.object({
  events: z.array(event),
  going: z.array(event),
  hosts: z.array(hostSummary),
  places: z.array(placeSummary),
  disciplines: z.array(discipline),
});

/** What the signed-in visitor does with one thing: shown on its page. */
export const viewerState = z.object({
  following: z.boolean(),
  going: z.boolean(),
});

/** Public counts for an event or a host. Never who. */
export const peopleCount = z.object({
  following: z.number().int(),
  going: z.number().int(),
});

export const messageInput = z.object({
  kind: messageKind,
  topic: z.string().trim().max(40).optional(),
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.email("Please enter a valid email address."),
  body: z.string().trim().min(10, "Tell us a bit more.").max(5000),
  link: z.union([z.literal(""), z.url("Paste a full link, starting with https://")]).optional(),
  turnstileToken: z.string().optional(),
});

/** "Was this information right?" after an event. */
export const feedbackInput = z.object({
  right: z.boolean(),
  note: z.string().trim().max(1000).optional(),
  turnstileToken: z.string().optional(),
});

/** A member suggests a correction: the fields they'd change and where they saw it. */
export const correctionInput = z.object({
  startDate: z.union([z.literal(""), z.iso.date()]).optional(),
  endDate: z.union([z.literal(""), z.iso.date()]).optional(),
  cancelled: z.boolean().optional(),
  url: z.union([z.literal(""), z.url()]).optional(),
  note: z.string().trim().min(5, "Tell us what's wrong.").max(1000),
  sourceUrl: z
    .union([z.literal(""), z.url("Paste a full link, starting with https://")])
    .optional(),
});

export type FeedbackInput = z.output<typeof feedbackInput>;
export type CorrectionInput = z.output<typeof correctionInput>;
export type MemberProfile = z.output<typeof memberProfile>;
export type MemberUpdate = z.output<typeof memberUpdate>;
export type FollowKey = z.output<typeof followKey>;
export type Following = z.output<typeof following>;
export type ViewerState = z.output<typeof viewerState>;
export type PeopleCount = z.output<typeof peopleCount>;
export type MessageInput = z.output<typeof messageInput>;
export type FollowTargetKind = FollowKey["target"];

/** "I'd like to try": a newcomer asks to be put in touch with a club, track or shop nearby. */
export const tryInput = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.email("Please enter a valid email address."),
  zip: z.string().regex(/^\d{5}$/, "A 5-digit Florida ZIP code."),
  discipline,
  message: z.string().trim().max(1000).optional(),
  // They agree that the club gets their name and email to reply.
  consent: z.literal(true, "We need your OK to pass your name and email to the club."),
  turnstileToken: z.string().optional(),
});

export const tryResult = z.object({
  // Who it went to: the clubs (by name), or the crew when no club nearby takes newcomers yet.
  sentTo: z.array(z.string()),
  toCrew: z.boolean(),
});

export type TryInput = z.output<typeof tryInput>;
export type TryResult = z.output<typeof tryResult>;

/** A member sends an event: a link the engine reads, or text (a flyer, a post) the AI reads. */
export const submissionInput = z
  .object({
    url: z.union([z.literal(""), z.url("Paste a full link, starting with https://")]).optional(),
    text: z.string().trim().max(8000).optional(),
  })
  .refine((value) => Boolean(value.url) || (value.text?.length ?? 0) >= 20, {
    message: "Paste a link to the event, or its text (at least a couple of lines).",
    path: ["text"],
  });

export const submissionResult = z.object({
  // queued: the crew will check it; known: it's already on SunTzu RC; inbox: a person will read it.
  outcome: z.enum(["queued", "known", "inbox"]),
  events: z.array(
    z.object({ name: z.string(), startDate: z.iso.date(), slug: z.string().nullable() }),
  ),
});

export type SubmissionInput = z.output<typeof submissionInput>;
export type SubmissionResult = z.output<typeof submissionResult>;
