import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FollowButtons } from "@/components/account/follow-buttons";
import { CalendarSubscribe } from "@/components/events/calendar-subscribe";
import { EventCard } from "@/components/events/event-card";
import { Button } from "@workspace/ui/components/button";
import { getPublicApi } from "@/lib/api";
import { ACCESS_LABELS, PLACE_KIND_LABELS } from "@/lib/places";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const getHost = cache(async (slug: string) => {
  const { data } = await getPublicApi().GET("/hosts/{slug}", { params: { path: { slug } } });
  return data;
});

export async function generateMetadata({ params }: PageProps<"/clubs/[slug]">): Promise<Metadata> {
  const host = await getHost((await params).slug);
  if (!host) return { title: "Club not found" };
  return {
    title: `${host.name}${host.city ? `, ${host.city}` : ""}`,
    description:
      host.summary || `${host.name}: fields, upcoming RC events and how to visit or join.`,
    alternates: { canonical: `/clubs/${host.slug}` },
  };
}

export default async function ClubPage({ params }: PageProps<"/clubs/[slug]">) {
  const host = await getHost((await params).slug);
  if (!host) notFound();
  const page = new URL(`/clubs/${host.slug}`, SITE.url).toString();

  return (
    <article className="mx-auto max-w-7xl px-4 pt-10 pb-24 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsClub",
            name: host.name,
            url: host.url ?? page,
            ...(host.city && {
              address: {
                "@type": "PostalAddress",
                addressLocality: host.city,
                addressRegion: "FL",
                addressCountry: "US",
              },
            }),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <Link
        href="/clubs"
        className="inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All clubs and tracks
      </Link>
      <header className="mt-8">
        {host.verified ? (
          <p className="inline-flex items-center gap-1 rounded-md border-2 border-foreground bg-primary px-2 py-0.5 text-sm font-semibold">
            <ShieldCheck aria-hidden className="size-4" /> Verified: its organisers publish here
          </p>
        ) : null}
        <h1 className="mt-4 max-w-4xl text-5xl leading-[0.92] font-black tracking-tight text-balance font-wide sm:text-7xl">
          {host.name}
        </h1>
        {host.summary ? (
          <p className="mt-4 max-w-[60ch] text-xl text-pretty">{host.summary}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <FollowButtons target="host" id={host.slug} label="Follow this club" />
          {host.url ? (
            <Button asChild variant="outline">
              <a href={host.url} target="_blank" rel="noreferrer">
                Their website <ExternalLink aria-hidden />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
          ) : null}
          {host.following ? (
            <p className="text-sm font-semibold">{host.following} following</p>
          ) : null}
        </div>
        {host.acceptsNewcomers ? (
          <p className="mt-4 max-w-[60ch] text-pretty">
            New to RC? This club welcomes newcomers.{" "}
            <Link href="/try" className="font-semibold underline underline-offset-4">
              Ask to try
            </Link>
            .
          </p>
        ) : null}
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_24rem]">
        <section aria-labelledby="events-title">
          <h2 id="events-title" className="text-2xl font-black font-wide">
            Coming up
          </h2>
          {host.events.length ? (
            <div className="mt-5 grid gap-5">
              {host.events.map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">Nothing on the calendar yet.</p>
          )}
        </section>
        <aside aria-labelledby="fields-title" className="grid content-start gap-4">
          <h2 id="fields-title" className="text-2xl font-black font-wide">
            Where they fly
          </h2>
          {host.places.length ? (
            <ul className="grid gap-3">
              {host.places.map((place) => (
                <li
                  key={place.slug}
                  className="relative rounded-xl border-2 border-foreground bg-panel p-4 shadow-hard-sm"
                >
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    {PLACE_KIND_LABELS[place.kind]}
                  </p>
                  <Link
                    href={`/places/${place.slug}`}
                    className="font-bold after:absolute after:inset-0"
                  >
                    {place.name}
                  </Link>
                  <p className="text-sm">{ACCESS_LABELS[place.access].label}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">We don&apos;t know their field yet.</p>
          )}
          <p className="text-sm">
            Run this club or track?{" "}
            <Link
              href={`/organise?club=${host.slug}`}
              className="font-semibold underline underline-offset-4"
            >
              Claim it on SunTzu RC
            </Link>{" "}
            to publish events and keep its page right. Free, forever.
          </p>
        </aside>
      </div>

      <div className="mt-16">
        <CalendarSubscribe
          feed={`/clubs/${host.slug}/calendar.ics`}
          title={`${host.name}'s calendar`}
          lead="Subscribe once and this club's events, date changes and cancellations show up in your own calendar."
        />
      </div>
    </article>
  );
}
