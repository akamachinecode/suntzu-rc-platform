import { ArrowLeft, ExternalLink, Navigation, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FollowButtons } from "@/components/account/follow-buttons";
import { EventCard } from "@/components/events/event-card";
import { PlaceMap } from "@/components/places/place-map";
import { FAA_RULES } from "@workspace/shared";
import { getPublicApi } from "@/lib/api";
import { formatDate } from "@/lib/events";
import { ACCESS_LABELS, PLACE_KIND_LABELS, REGISTER_LABELS } from "@/lib/places";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const getPlace = cache(async (slug: string) => {
  const { data } = await getPublicApi().GET("/places/{slug}", { params: { path: { slug } } });
  return data;
});

export async function generateMetadata({ params }: PageProps<"/places/[slug]">): Promise<Metadata> {
  const place = await getPlace((await params).slug);
  if (!place) return { title: "Place not found" };
  const where = [place.city, "Florida"].filter(Boolean).join(", ");
  return {
    title: `${place.name}, ${where}`,
    description: `${PLACE_KIND_LABELS[place.kind]} in ${where}: how to visit, who runs it, upcoming RC events and the rules that apply.`,
    alternates: { canonical: `/places/${place.slug}` },
  };
}

export default async function PlacePage({ params }: PageProps<"/places/[slug]">) {
  const place = await getPlace((await params).slug);
  if (!place) notFound();
  const position: [number, number] | undefined =
    place.latitude != null && place.longitude != null
      ? [place.longitude, place.latitude]
      : undefined;
  const access = ACCESS_LABELS[place.access];
  const page = new URL(`/places/${place.slug}`, SITE.url).toString();
  const button =
    "inline-flex items-center gap-2 rounded-md border-2 border-foreground px-4 py-2 font-semibold shadow-hard-sm";
  const rules = FAA_RULES.filter((rule) => (place.isFria ? true : !/FRIA/.test(rule.title))).slice(
    0,
    4,
  );

  return (
    <article className="mx-auto max-w-7xl px-5 pt-10 pb-24 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsActivityLocation",
            name: place.name,
            url: page,
            address: {
              "@type": "PostalAddress",
              ...(place.address && { streetAddress: place.address }),
              ...(place.city && { addressLocality: place.city }),
              addressRegion: place.state,
              addressCountry: "US",
            },
            ...(position && {
              geo: { "@type": "GeoCoordinates", latitude: position[1], longitude: position[0] },
            }),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <Link
        href="/places"
        className="tap inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All places
      </Link>

      <header className="mt-8">
        <ul className="flex flex-wrap gap-2 text-sm font-semibold">
          <li className="rounded-md bg-sky px-2 py-0.5">{PLACE_KIND_LABELS[place.kind]}</li>
          {place.isFria ? (
            <li className="rounded-md bg-primary px-2 py-0.5">FAA-recognised area (FRIA)</li>
          ) : null}
          {place.stewarded ? (
            <li className="inline-flex items-center gap-1 rounded-md border-2 border-foreground bg-panel px-2 py-0.5">
              <ShieldCheck aria-hidden className="size-4" /> Kept current by its club
            </li>
          ) : null}
        </ul>
        <h1 className="mt-4 max-w-4xl text-5xl leading-[0.92] font-black tracking-tight text-balance font-wide sm:text-7xl">
          {place.name}
        </h1>
        <p className="mt-4 text-xl">
          {[place.address, place.city, place.county && `${place.county} County`]
            .filter(Boolean)
            .join(", ") || "Florida"}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <FollowButtons target="place" id={place.slug} label="Follow this place" />
          {place.following ? (
            <p className="text-sm font-semibold">{place.following} following</p>
          ) : null}
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_26rem]">
        <div className="grid content-start gap-8">
          <section
            aria-labelledby="visit-title"
            className="rounded-xl border-2 border-foreground bg-primary p-6 shadow-hard"
          >
            <h2 id="visit-title" className="text-xl font-black font-wide">
              How to visit: {access.label.toLowerCase()}
            </h2>
            <p className="mt-2 max-w-[60ch] text-pretty">{access.detail}</p>
            {place.notes ? <p className="mt-3 max-w-[60ch] text-pretty">{place.notes}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {place.host ? (
                <Link href={`/clubs/${place.host.slug}`} className={`${button} bg-panel`}>
                  Run by {place.host.name}
                </Link>
              ) : null}
              {place.url ? (
                <a
                  href={place.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`${button} bg-panel`}
                >
                  Their website <ExternalLink aria-hidden className="size-4" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="upcoming-title">
            <h2 id="upcoming-title" className="text-2xl font-black font-wide">
              Coming up here
            </h2>
            {place.events.length ? (
              <div className="mt-5 grid gap-5">
                {place.events.map((event) => (
                  <EventCard key={event.slug} event={event} />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-pretty text-muted-foreground">
                Nothing on the calendar yet. Follow this place and we&apos;ll tell you when
                something is.
              </p>
            )}
          </section>

          <section
            aria-labelledby="rules-title"
            className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard"
          >
            <h2 id="rules-title" className="text-xl font-black font-wide">
              Rules that apply
            </h2>
            <ul className="mt-4 grid gap-4">
              {place.isFria ? (
                <li>
                  <p className="font-semibold">No Remote ID needed here</p>
                  <p className="text-pretty">
                    This is an FAA-recognised identification area: models without Remote ID may fly
                    inside it, within its rules.
                  </p>
                </li>
              ) : null}
              {rules.map((rule) => (
                <li key={rule.title}>
                  <p className="font-semibold">{rule.title}</p>
                  <p className="text-pretty">{rule.body}</p>
                  <a
                    href={rule.source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline underline-offset-4"
                  >
                    {rule.source.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              Near an airport?{" "}
              <Link
                href="/places/can-i-fly-here"
                className="font-semibold underline underline-offset-4"
              >
                Check the airspace
              </Link>{" "}
              before you fly.
            </p>
          </section>

          <section aria-labelledby="source-title" className="text-sm">
            <h2 id="source-title" className="font-semibold">
              Where this comes from
            </h2>
            <p className="mt-1 text-pretty">
              {REGISTER_LABELS[place.register]}
              {place.sourceUrl ? (
                <>
                  {" · "}
                  <a
                    href={place.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    the record
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </>
              ) : null}
              {place.verifiedAt ? ` · last checked ${formatDate(place.verifiedAt)}` : ""}. Is this
              your field or track?{" "}
              <Link
                href={
                  place.host ? `/organise?club=${place.host.slug}` : "/contact?topic=correction"
                }
                className="font-semibold underline underline-offset-4"
              >
                {place.host ? "Claim it to keep it current" : "Tell us"}
              </Link>
              .
            </p>
          </section>
        </div>

        <aside aria-label="Map" className="grid content-start gap-4">
          {position ? (
            <>
              <PlaceMap place={place} position={position} />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${position[1]},${position[0]}`}
                target="_blank"
                rel="noreferrer"
                className={`${button} w-fit bg-panel`}
              >
                <Navigation aria-hidden className="size-4" />
                Directions
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              We don&apos;t have its exact location yet.
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}
