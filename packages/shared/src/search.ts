import { z } from "zod";

// Search across the whole site (docs/specs/0005-search.md).

export const SEARCH_TYPES = ["event", "place", "club", "guide", "rule", "service"] as const;
/** How far "near Tampa" reaches, in miles. 25 unless the visitor widens it. */
export const SEARCH_MILES = [25, 50, 100] as const;

export const searchType = z.enum(SEARCH_TYPES);

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(100),
  // Only these kinds of result (the tabs on the results page): `type=club`, or
  // `type=guide&type=rule&type=service`.
  type: z
    .union([searchType.transform((type) => [type]), z.array(searchType).min(1).max(6)])
    .optional(),
  miles: z.coerce
    .number()
    .refine((value) => (SEARCH_MILES as readonly number[]).includes(value), "25, 50 or 100")
    .optional(),
  limit: z.coerce.number().int().min(1).max(30).optional(),
});

export const searchResult = z.object({
  id: z.string(),
  type: searchType,
  title: z.string(),
  // Kind, place and town, ready to show under the title.
  subtitle: z.string(),
  // A path on the site: "/events/aerofest-2026", "/guides/flying-legally#faa".
  url: z.string(),
  // Events only: first and last day.
  startsOn: z.iso.date().nullable(),
  endsOn: z.iso.date().nullable(),
  // Events only: it has already happened.
  past: z.boolean(),
  // When the search names a town or ZIP code: how far away it is.
  miles: z.number().nullable(),
  // Past events only: the next edition of the same series, when it's on the calendar. Its days
  // as for an event above (one known only by month runs from the 1st to the last day of it).
  next: z
    .object({
      title: z.string(),
      url: z.string(),
      startsOn: z.iso.date(),
      endsOn: z.iso.date(),
    })
    .nullable(),
});

export const searchResponse = z.object({
  q: z.string(),
  // The town or ZIP code the search understood, and the radius used.
  near: z
    .object({
      label: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      miles: z.number(),
    })
    .nullable(),
  results: z.array(searchResult),
  // No result has every word: these are only the closest matches. A search that found nothing or
  // only this is a "search without results", and the crew sees it, anonymously.
  partial: z.boolean(),
});

/** A search that found nothing or little, as the browser reports it. The API searches again to check. */
export const searchMissInput = z.object({ q: z.string().trim().min(1).max(100) });

/** The crew's "searched, not found" list: the words only, never who, where or from what device. */
export const searchMiss = z.object({
  words: z.string(),
  // Searches in the last 90 days.
  searches: z.number().int(),
  // Results the last time it was searched.
  results: z.number().int(),
  lastOn: z.iso.date(),
});

export type SearchType = z.output<typeof searchType>;
export type SearchQuery = z.output<typeof searchQuery>;
export type SearchResult = z.output<typeof searchResult>;
export type SearchResponse = z.output<typeof searchResponse>;
export type SearchMissInput = z.output<typeof searchMissInput>;
export type SearchMiss = z.output<typeof searchMiss>;
