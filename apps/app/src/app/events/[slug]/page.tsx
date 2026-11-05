import type { EventDetail } from "@workspace/shared";
import { ArrowLeft, CalendarPlus, ExternalLink, Navigation } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
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
            {exact && !cancelled ? (
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
                      ? "Checked by the Servo crew against the organiser's page"
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
