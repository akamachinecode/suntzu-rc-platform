import { sighting as sightingSchema, type Sighting, type SightingFields } from "@workspace/shared";
import { classify } from "./classify.js";
import { endAfter, isUrl, localDate, type ReadContext, type ReadResult } from "./read.js";

// Reads schema.org Event data that sites embed for search engines
// (<script type="application/ld+json">). Wix, WordPress event plugins and most ticketing pages
// publish it, so one reader covers many club sites.

type Node = Record<string, unknown>;

const SCRIPT = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

export function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  for (const [, json] of html.matchAll(SCRIPT)) {
    try {
      blocks.push(JSON.parse(json!));
    } catch {
      // A broken block on someone else's page is not our error: skip it.
    }
  }
  return blocks;
}

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEvent(node: Node): boolean {
  const types = ([] as unknown[]).concat(node["@type"] ?? []);
  // Event and its subtypes: SportsEvent, Festival, ExhibitionEvent…
  return types.some((type) => typeof type === "string" && /(Event|Festival)$/.test(type));
}

/** Every Event node, wherever it sits: top level, arrays, @graph or a list of events. */
export function findEvents(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(findEvents);
  if (!isNode(value)) return [];
  if (isEvent(value)) return [value];
  // An ItemList of ListItems, each with its event in `item` (RCSignup's state pages).
  return [value["@graph"], value.itemListElement, value.item].flatMap((child) =>
    findEvents(child ?? []),
  );
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : undefined);

/** The local date of a schema.org date. With an offset, the wall-clock date is already local. */
function eventDate(value: unknown, timezone: string): string | undefined {
  const date = text(value);
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) || /[+-]\d{2}:?\d{2}$/.test(date)) return date.slice(0, 10);
  const instant = new Date(date);
  return Number.isNaN(instant.getTime()) ? undefined : localDate(instant, timezone);
}

function address(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (!isNode(value)) return undefined;
  const parts = ["streetAddress", "addressLocality", "addressRegion", "postalCode"].map((key) =>
    text(value[key]),
  );
  return parts.filter(Boolean).join(", ") || undefined;
}

function place(location: unknown): string | undefined {
  const first = Array.isArray(location) ? location[0] : location;
  if (typeof first === "string") return first.trim() || undefined;
  if (!isNode(first)) return undefined;
  const name = text(first.name);
  const street = address(first.address);
  // Wix puts the city as the place name ("Miami"), already part of the address.
  if (name && street && !street.includes(name)) return `${name}, ${street}`;
  return street ?? name;
}

/** "Landing fee $40" from the first priced offer. */
function fee(offers: unknown): string | undefined {
  const list = ([] as unknown[])
    .concat(offers ?? [])
    .flatMap((offer) =>
      isNode(offer) && offer.offers ? [offer, ...([] as unknown[]).concat(offer.offers)] : [offer],
    );
  for (const offer of list) {
    if (!isNode(offer)) continue;
    const price = Number(offer.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const currency = text(offer.priceCurrency) ?? "USD";
    const amount = `${currency === "USD" ? "$" : `${currency} `}${Number.isInteger(price) ? price : price.toFixed(2)}`;
    return `${text(offer.name) ?? "Entry"} ${amount}`;
  }
  return undefined;
}

/** The fragment of the source behind a field: `"startDate":"2026-11-05T07:00:00-05:00"`. */
const quote = (key: string, value: unknown) => `"${key}":${JSON.stringify(value)}`;

export function readJsonLd(html: string, pageUrl: string, context: ReadContext): ReadResult {
  const result: ReadResult = { sightings: [], skipped: [] };
  const events = jsonLdBlocks(html).flatMap(findEvents);

  events.forEach((node, index) => {
    const name = text(node.name);
    const startDate = eventDate(node.startDate, context.timezone);
    if (!name || !startDate) {
      result.skipped.push({ reason: "invalid", text: name ?? pageUrl });
      return;
    }
    const kind = classify(name);
    const endDate = endAfter(startDate, eventDate(node.endDate, context.timezone));
    const placeText = place(node.location);
    const organizer = ([] as unknown[]).concat(node.organizer ?? [])[0];
    const hostText = isNode(organizer) ? text(organizer.name) : text(organizer);
    const url = isUrl(text(node.url)) ? text(node.url)! : pageUrl;
    const summary = text(node.description)?.slice(0, 300);
    const cancelled = /EventCancelled/.test(text(node.eventStatus) ?? "");
    const entryFee = fee(node.offers);

    const fields: SightingFields = {
      name,
      ...(kind.event && { kind: kind.kind }),
      ...(context.discipline && { discipline: context.discipline }),
      startDate,
      ...(endDate && { endDate }),
      timezone: context.timezone,
      ...(placeText && { placeText }),
      ...(hostText && { hostText }),
      url,
      ...(summary && { summary }),
      ...(cancelled && { cancelled: true }),
      ...(entryFee && { entryFee }),
    };
    const evidence: Sighting["evidence"] = {
      name: quote("name", node.name),
      startDate: quote("startDate", node.startDate),
      ...(endDate && { endDate: quote("endDate", node.endDate) }),
      ...(placeText && { placeText: quote("location", node.location) }),
      ...(hostText && { hostText: quote("organizer", node.organizer) }),
      url: node.url ? quote("url", node.url) : pageUrl,
      ...(summary && { summary: quote("description", node.description) }),
      ...(cancelled && { cancelled: quote("eventStatus", node.eventStatus) }),
      ...(entryFee && { entryFee: quote("offers", node.offers) }),
    };

    // One page usually describes one event; a listing page may hold several without URLs.
    const externalId = text(node.url) ?? (events.length > 1 ? `${pageUrl}#${index}` : pageUrl);
    const parsed = sightingSchema.safeParse({ externalId, fields, evidence });
    if (parsed.success) result.sightings.push(parsed.data);
    else result.skipped.push({ reason: "invalid", text: name });
  });
  return result;
}

/** Links on a page that match a pattern and stay on the same site, in page order. */
export function findLinks(html: string, pageUrl: string, pattern: RegExp): string[] {
  const host = new URL(pageUrl).host;
  const links = new Set<string>();
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    let url: URL;
    try {
      url = new URL(href!.replace(/&amp;/g, "&"), pageUrl);
    } catch {
      continue;
    }
    url.hash = "";
    if (url.host === host && pattern.test(url.pathname)) links.add(url.toString());
  }
  return [...links];
}
