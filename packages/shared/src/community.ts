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

export type MemberProfile = z.output<typeof memberProfile>;
export type MemberUpdate = z.output<typeof memberUpdate>;
export type FollowKey = z.output<typeof followKey>;
export type Following = z.output<typeof following>;
export type ViewerState = z.output<typeof viewerState>;
export type PeopleCount = z.output<typeof peopleCount>;
export type MessageInput = z.output<typeof messageInput>;
export type FollowTargetKind = FollowKey["target"];
