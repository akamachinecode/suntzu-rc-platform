import { z } from "zod";
import { discipline, event, hostSummary, place } from "./events.js";

// The organiser kit (docs/specs/0003-community.md, slice 4): claim a club or track, prove it,
// publish its events, keep its page and places current, put its calendar on its own site.

export const CLAIM_METHODS = ["domain-email", "website-code", "crew"] as const;

export const claimInput = z.object({
  host: z.string().trim().min(1).max(120),
  method: z.enum(CLAIM_METHODS),
  // domain-email: an address at the club's own domain, where the code is sent.
  email: z.email("Enter an address at your club's domain.").optional(),
  // crew: how the crew can check (role in the club, a link).
  note: z.string().trim().max(1000).optional(),
});

export const claimVerify = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "The 6-digit code from the email."),
});

export const claimStatus = z.object({
  host: hostSummary,
  method: z.enum(CLAIM_METHODS),
  verified: z.boolean(),
  // The domain the email must be at, and the code to put on the website.
  domain: z.string().nullable(),
  websiteCode: z.string(),
});

export const organiserHost = z.object({
  host: hostSummary.extend({
    summary: z.string(),
    disciplines: z.array(discipline),
    acceptsNewcomers: z.boolean(),
    verified: z.boolean(),
  }),
  places: z.array(place),
  events: z.array(
    event.extend({
      going: z.number().int(),
      following: z.number().int(),
      byOrganiser: z.boolean(),
    }),
  ),
  followers: z.number().int(),
  goingTotal: z.number().int(),
});

export const hostUpdate = z.object({
  summary: z.string().trim().max(600).optional(),
  url: z.union([z.literal(""), z.url()]).optional(),
  disciplines: z.array(discipline).max(4).optional(),
  acceptsNewcomers: z.boolean().optional(),
});

export const placeConfirm = z.object({
  access: z.enum(["public", "guests", "members", "permission"]),
  notes: z.string().trim().max(600).optional(),
});

export type ClaimInput = z.output<typeof claimInput>;
export type ClaimVerify = z.output<typeof claimVerify>;
export type ClaimStatus = z.output<typeof claimStatus>;
export type OrganiserHost = z.output<typeof organiserHost>;
export type HostUpdate = z.output<typeof hostUpdate>;
export type PlaceConfirm = z.output<typeof placeConfirm>;
