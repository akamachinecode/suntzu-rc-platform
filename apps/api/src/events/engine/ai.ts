import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import { betaRefusalFallbackMiddleware } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { DISCIPLINES, EVENT_KINDS, type Sighting, type SightingEvidence } from "@workspace/shared";
import { z } from "zod";

// AI extraction (docs/specs/0003-community.md): events from text a member pasted (a flyer, a
// Facebook post, a forum message), with Claude on Amazon Bedrock. The model must quote the source
// for every field; a field whose quote isn't in the text word for word is dropped, and an event
// without a quoted name and date isn't kept. What survives goes to the crew like any sighting.

const quoted = z.string().nullable();

/** What the model returns: the facts, and the exact words behind each one. */
export const extraction = z.object({
  events: z.array(
    z.object({
      name: z.string(),
      startDate: z.string().describe("YYYY-MM-DD"),
      endDate: z.string().nullable().describe("YYYY-MM-DD, or null for one day"),
      placeText: z.string().nullable(),
      entryFee: z.string().nullable(),
      url: z.string().nullable(),
      kind: z.enum(EVENT_KINDS).nullable(),
      discipline: z.enum(DISCIPLINES).nullable(),
      quotes: z.object({
        name: z.string(),
        startDate: z.string(),
        endDate: quoted,
        placeText: quoted,
        entryFee: quoted,
        url: quoted,
      }),
    }),
  ),
});

export type Extraction = z.output<typeof extraction>;

const SYSTEM = `You read text that someone pasted about radio-control (RC) hobby events in Florida: model aircraft, helicopters, cars and trucks, FPV drones and boats. Extract each event the text announces: fly-ins, races, competitions, shows, swap meets, open days and courses. Skip meetings, work days, field closures and anything that isn't an RC event.

For every field you fill in, copy into "quotes" the exact words from the text that say it, character for character. If the text doesn't say something, set the field and its quote to null; never guess. Dates are YYYY-MM-DD; when the text gives no year, use the next time that date comes after today. Never include people's names, phone numbers or email addresses in any field.`;

export interface AiConfig {
  /** Bedrock model id, e.g. "anthropic.claude-opus-5-5". */
  modelId: string;
  fallbackModelId: string;
  region: string;
}

let client: { key: string; value: AnthropicBedrockMantle } | undefined;

export async function extractEvents(
  text: string,
  today: string,
  config: AiConfig,
): Promise<Extraction | undefined> {
  const key = `${config.region}:${config.fallbackModelId}`;
  if (client?.key !== key) {
    client = {
      key,
      value: new AnthropicBedrockMantle({
        awsRegion: config.region,
        // A declined request is retried once on the fallback model.
        middleware: [betaRefusalFallbackMiddleware([{ model: config.fallbackModelId }])],
      }),
    };
  }
  const response = await client.value.messages.parse({
    model: config.modelId,
    max_tokens: 4000,
    // Extraction is a simple task: low effort keeps it fast and cheap.
    output_config: { effort: "low", format: zodOutputFormat(extraction) },
    system: SYSTEM,
    messages: [{ role: "user", content: `Today is ${today}.\n\n<pasted>\n${text}\n</pasted>` }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return undefined;
  return response.parsed_output;
}

const squash = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Keeps only what the text really says: each field's quote must appear in the text (ignoring case
 * and spacing). Dates must be real dates; an event needs a quoted name and first day.
 */
export function verify(result: Extraction, text: string, sourceId: string): Sighting[] {
  const haystack = squash(text);
  const said = (quote: string | null) =>
    Boolean(quote && quote.trim().length >= 2 && haystack.includes(squash(quote)));
  const sightings: Sighting[] = [];
  for (const [index, found] of result.events.entries()) {
    if (!said(found.quotes.name) || !said(found.quotes.startDate)) continue;
    if (!ISO_DATE.test(found.startDate) || Number.isNaN(Date.parse(found.startDate))) continue;
    const evidence: SightingEvidence = {
      name: found.quotes.name,
      startDate: found.quotes.startDate,
    };
    const endDate =
      found.endDate &&
      ISO_DATE.test(found.endDate) &&
      found.endDate > found.startDate &&
      said(found.quotes.endDate ?? found.quotes.startDate)
        ? found.endDate
        : undefined;
    if (endDate) evidence.endDate = found.quotes.endDate ?? found.quotes.startDate;
    const keep = (field: "placeText" | "entryFee" | "url") => {
      const value = found[field];
      const quote = found.quotes[field];
      if (!value || !said(quote)) return undefined;
      evidence[field] = quote!;
      return value.trim();
    };
    const placeText = keep("placeText");
    const entryFee = keep("entryFee");
    const url = keep("url");
    sightings.push({
      externalId: `${sourceId}#${index}`,
      fields: {
        name: found.name.trim(),
        startDate: found.startDate,
        ...(endDate && { endDate }),
        ...(placeText && { placeText }),
        ...(entryFee && { entryFee }),
        ...(url && /^https?:\/\//.test(url) && { url }),
        ...(found.kind && { kind: found.kind }),
        ...(found.discipline && { discipline: found.discipline }),
      },
      evidence,
    });
  }
  return sightings;
}
