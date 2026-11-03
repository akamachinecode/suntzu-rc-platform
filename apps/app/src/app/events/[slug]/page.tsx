import type { EventChange, EventDetail } from "@workspace/shared";
import { ArrowLeft, CalendarPlus, ExternalLink, Navigation, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FollowButtons } from "@/components/account/follow-buttons";
import { CorrectionForm } from "@/components/events/correction-form";
import { EventFeedback } from "@/components/events/event-feedback";
import { EventLocationMap } from "@/components/events/event-location-map";
import { getPublicApi } from "@/lib/api";
import {
  DISCIPLINE_COLORS,
  DISCIPLINE_LABELS,
  formatDate,
  formatWhen,
  formatWhere,
  hasExactDates,
  KIND_LABELS,
  REGION_LABELS,
} from "@/lib/events";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const getEvent = cache(async (slug: string) => {
  const { data } = await getPublicApi().GET("/events/{slug}", { params: { path: { slug } } });
  return data;
});

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  if (!event) return { title: "Event not found" };
  return {
    title: `${event.name}, ${formatWhen(event)}`,
    description:
      event.summary ||
      `${KIND_LABELS[event.kind].label} for ${DISCIPLINE_LABELS[event.discipline].toLowerCase()} at ${formatWhere(event)}.`,
    alternates: { canonical: `/events/${event.slug}` },
  };
}

const TRUST_LABELS = {
  organiser: "Organiser",
  "sanctioning-body": "Sanctioning body",
  aggregator: "Listing",
  community: "Community",
} as const;

const compact = (date: string) => date.replaceAll("-", "");
function nextDay(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

const STATUS_WORDS: Record<string, string> = {
  expected: "expected",
  announced: "announced",
  confirmed: "confirmed by the organiser",
  cancelled: "cancelled",
  held: "held",
};

const shortDate = (value: unknown) =>
  typeof value === "string"
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
        new Date(`${value}T12:00:00Z`),
      )
    : "—";

/** The page's history in plain words, one line per moment (changes made together read as one). */
function historyLines(history: EventChange[]): { at: string; text: string }[] {
  const moments = new Map<string, EventChange[]>();
  for (const change of history) {
    const key = change.at.slice(0, 16);
    moments.set(key, [...(moments.get(key) ?? []), change]);
  }
  return [...moments.values()].flatMap((group) => {
    const at = group[0]!.at;
    const parts: string[] = [];
    for (const change of group) {
      if (change.field === "created") parts.push("Listed on SunTzu RC");
      if (change.field === "startDate") {
        parts.push(`First day moved from ${shortDate(change.from)} to ${shortDate(change.to)}`);
      }
      if (change.field === "endDate" && !group.some((other) => other.field === "startDate")) {
        parts.push(`Last day changed to ${shortDate(change.to)}`);
      }
      if (change.field === "status" && typeof change.to === "string") {
        parts.push(`Now ${STATUS_WORDS[change.to] ?? change.to}`);
      }
    }
    return parts.length ? [{ at, text: parts.join(". ") }] : [];
  });
}

function exactLastDay(event: EventDetail): string | undefined {
  if (event.datePrecision !== "day") return undefined;
  return event.endDate ?? event.startDate;
}

function address(event: EventDetail) {
  const place = event.place;
  if (!place) return event.placeText;
  return [place.address, place.city, place.state].filter(Boolean).join(", ");
}

/** schema.org Event data, so the event can appear in Google's event results. Exact dates only. */
function structuredData(event: EventDetail, page: string) {
  const place = event.place;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate ?? event.startDate,
    eventStatus:
      event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: place?.name ?? event.placeText ?? "To be announced",
      address: {
        "@type": "PostalAddress",
        ...(place?.address && { streetAddress: place.address }),
        ...(place?.city && { addressLocality: place.city }),
        addressRegion: place?.state ?? "FL",
        addressCountry: "US",
      },
      ...(place?.latitude != null &&
        place.longitude != null && {
          geo: { "@type": "GeoCoordinates", latitude: place.latitude, longitude: place.longitude },
        }),
    },
    ...(event.host && {
      organizer: {
        "@type": "Organization",
        name: event.host.name,
        ...(event.host.url && { url: event.host.url }),
      },
    }),
    ...(event.summary && { description: event.summary }),
    url: page,
  };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const event = await getEvent((await params).slug);
  if (!event) notFound();

  const page = new URL(`/events/${event.slug}`, SITE.url).toString();
  const today = new Date().toISOString().slice(0, 10);
  const past = event.status === "held" || (exactLastDay(event) ?? "9999") < today;
  const history = historyLines(event.history);
  const next = event.editions.find((edition) => edition.startDate > event.startDate);
  const exact = hasExactDates(event);
  const cancelled = event.status === "cancelled";
  const place = event.place;
  const position: [number, number] | undefined =
    place?.latitude != null && place.longitude != null
      ? [place.longitude, place.latitude]
      : undefined;
  const google = exact
    ? `https://calendar.google.com/calendar/render?${new URLSearchParams({
        action: "TEMPLATE",
        text: event.name,
        dates: `${compact(event.startDate)}/${compact(nextDay(event.endDate ?? event.startDate))}`,
        details: `${event.summary}\n\n${page}`,
        location: [place?.name, address(event)].filter(Boolean).join(", "),
      })}`
    : undefined;

  const button =
    "inline-flex items-center gap-2 rounded-md border-2 border-foreground px-4 py-2 font-semibold shadow-hard-sm";

  return (
    <article className="mx-auto max-w-7xl px-4 pt-10 pb-24 sm:pt-16">
      {exact ? (
        <script
          type="application/ld+json"
          // JSON-LD can't contain "<": escaped so text from sources can never close the tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData(event, page)).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}

      <Link
        href="/events"
        className="inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All events
      </Link>

      <header className="mt-8">
        <ul className="flex flex-wrap gap-2 text-sm font-semibold">
          <li className="rounded-md bg-primary px-2 py-0.5">{KIND_LABELS[event.kind].label}</li>
          <li className={cn("rounded-md px-2 py-0.5", DISCIPLINE_COLORS[event.discipline])}>
            {DISCIPLINE_LABELS[event.discipline]}
          </li>
          <li className="rounded-md bg-muted px-2 py-0.5">{REGION_LABELS[event.region]}</li>
          {event.beginnerFriendly ? (
            <li className="rounded-md border-2 border-foreground bg-sky px-2 py-0.5">
              Beginners welcome
            </li>
          ) : null}
          {event.sanctions.map((sanction) => (
            <li key={sanction} className="rounded-md bg-muted px-2 py-0.5">
              {sanction} sanctioned
            </li>
          ))}
        </ul>
        <h1 className="mt-4 max-w-4xl text-5xl leading-[0.92] font-black tracking-tight text-balance font-wide sm:text-7xl">
          {event.name}
        </h1>
        <p
          className={cn(
            "mt-5 text-2xl font-black font-wide sm:text-3xl",
            cancelled && "line-through",
          )}
        >
          {formatWhen(event)}
        </p>
        {cancelled ? (
          <p className="mt-3 inline-block rounded-md border-2 border-foreground bg-lead px-3 py-1 font-semibold">
            Cancelled
          </p>
        ) : !exact ? (
          <p className="mt-3 max-w-[60ch] text-pretty">
            The organiser hasn&apos;t announced dates yet. This is when it usually happens;
            we&apos;ll update this page as soon as they do.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <FollowButtons target="event" id={event.slug} going={!past && !cancelled} />
          {event.people.going || event.people.following ? (
            <p className="text-sm font-semibold">
              {event.people.going ? `${event.people.going} going` : ""}
              {event.people.going && event.people.following ? " · " : ""}
              {event.people.following ? `${event.people.following} following` : ""}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="grid content-start gap-8">
          {event.summary ? (
            <p className="max-w-[60ch] text-xl text-pretty">{event.summary}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {event.url ? (
              <a
                href={event.url}
                target="_blank"
                rel="noreferrer"
                className={cn(button, "bg-primary")}
              >
                Organiser&apos;s page
                <ExternalLink aria-hidden className="size-4" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
            {event.resultsUrl ? (
              <a
                href={event.resultsUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(button, "bg-sky")}
              >
                <Trophy aria-hidden className="size-4" />
                Results
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
            {exact && !cancelled && !past ? (
              <>
                <a href={`/events/${event.slug}/calendar.ics`} className={cn(button, "bg-panel")}>
                  <CalendarPlus aria-hidden className="size-4" />
                  Add to calendar
                </a>
                <a
                  href={google}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(button, "bg-panel")}
                >
                  Google Calendar
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </>
            ) : null}
          </div>

          {event.entryFee || event.entryUrl || event.requirements.length || event.classes.length ? (
            <section
              aria-labelledby="before-title"
              className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard"
            >
              <h2 id="before-title" className="text-xl font-black font-wide">
                Before you go
              </h2>
              <ul className="mt-3 grid gap-2">
                {event.entryFee ? <li>{event.entryFee}</li> : null}
                {event.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
                {event.classes.length ? <li>Classes: {event.classes.join(", ")}</li> : null}
                {event.entryUrl ? (
                  <li>
                    <a
                      href={event.entryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline underline-offset-4"
                    >
                      Sign up
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {past ? (
            <section
              aria-labelledby="after-title"
              className="rounded-xl border-2 border-foreground bg-primary p-6 shadow-hard"
            >
              <h2 id="after-title" className="text-xl font-black font-wide">
                {cancelled ? "This one didn't happen" : "That was it"}
              </h2>
              {next ? (
                <p className="mt-2 text-pretty">
                  Next edition:{" "}
                  <Link
                    href={`/events/${next.slug}`}
                    className="font-semibold underline underline-offset-4"
                  >
                    {formatWhen({ ...next, endDate: null })}
                  </Link>
                  . Follow it and we&apos;ll tell you when the dates are out.
                </p>
              ) : null}
              <div className="mt-4">
                <EventFeedback slug={event.slug} />
              </div>
            </section>
          ) : null}

          {history.length > 1 ? (
            <section
              aria-labelledby="history-title"
              className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard"
            >
              <h2 id="history-title" className="text-xl font-black font-wide">
                What changed
              </h2>
              <ol className="mt-4 grid gap-3 border-l-2 border-foreground pl-5">
                {history.map((line) => (
                  <li key={line.at} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-foreground bg-primary"
                    />
                    <p className="text-sm text-muted-foreground">{formatDate(line.at)}</p>
                    <p>{line.text}.</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {event.editions.length ? (
            <section
              aria-labelledby="editions-title"
              className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard"
            >
              <h2 id="editions-title" className="text-xl font-black font-wide">
                Other editions
              </h2>
              <ul className="mt-4 grid gap-2">
                {event.editions.map((edition) => (
                  <li key={edition.slug} className="flex flex-wrap items-baseline gap-x-3">
                    <Link
                      href={`/events/${edition.slug}`}
                      className="font-semibold underline underline-offset-4"
                    >
                      {formatWhen({ ...edition, endDate: null })}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {STATUS_WORDS[edition.status]}
                      {edition.resultsUrl ? " · results" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section
            aria-labelledby="sources-title"
            className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard"
          >
            <h2 id="sources-title" className="text-xl font-black font-wide">
              Where this comes from
            </h2>
            <ul className="mt-4 grid gap-4">
              {event.sources.map((source) => (
                <li key={`${source.name}-${source.lastSeenAt}`} className="grid gap-1">
                  <p className="font-semibold">
                    {source.byCrew
                      ? "Checked by the SunTzu RC crew against the organiser's page"
                      : `${source.name} (${TRUST_LABELS[source.trust].toLowerCase()})`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last seen {formatDate(source.lastSeenAt)}
                    {source.url ? (
                      <>
                        {" · "}
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4"
                        >
                          {new URL(source.url).hostname.replace(/^www\./, "")}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm">
              {event.lastCheckedAt ? `Last checked ${formatDate(event.lastCheckedAt)}. ` : ""}
              Something wrong?{" "}
              <Link
                href="/contact?topic=correction"
                className="font-semibold underline underline-offset-4"
              >
                Tell us
              </Link>
              .
            </p>
            <div className="mt-4">
              <CorrectionForm slug={event.slug} />
            </div>
          </section>
        </div>

        <aside aria-labelledby="where-title" className="grid content-start gap-4">
          <h2 id="where-title" className="text-xl font-black font-wide">
            Where
          </h2>
          <div>
            <p className="font-semibold">{place?.name ?? event.placeText ?? "To be announced"}</p>
            {place ? <p className="text-muted-foreground">{address(event)}</p> : null}
            {event.host ? (
              <p className="mt-2">
                Hosted by{" "}
                {event.host.url ? (
                  <a
                    href={event.host.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-4"
                  >
                    {event.host.name}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="font-semibold">{event.host.name}</span>
                )}
              </p>
            ) : null}
          </div>
          {position ? (
            <>
              <EventLocationMap event={event} position={position} />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${position[1]},${position[0]}`}
                target="_blank"
                rel="noreferrer"
                className={cn(button, "w-fit bg-panel")}
              >
                <Navigation aria-hidden className="size-4" />
                Directions
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              We don&apos;t have the exact field or track yet.
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}
