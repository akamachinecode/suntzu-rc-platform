import { BellRing, CalendarHeart, Map, ShieldCheck, Sprout, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getPublicApi } from "@/lib/api";
import { BuildForm } from "./build-form";

export const metadata: Metadata = {
  title: "The Florida RC community",
  description:
    "Find a club near you, try RC for the first time, follow your fields and events, run your club on SunTzu RC for free, and share your builds.",
};

export const dynamic = "force-dynamic";

const DOORS = [
  {
    icon: Users,
    title: "Find a club",
    body: "Instructors, insured fields and people who'll help when a servo strips on the flight line.",
    href: "/clubs",
    cta: "Clubs and tracks",
  },
  {
    icon: Map,
    title: "Where to fly and race",
    body: "Every field, track and FAA-recognised area in Florida, with how to visit each one.",
    href: "/places",
    cta: "The map",
  },
  {
    icon: Sprout,
    title: "Try it for the first time",
    body: "Tell us where you are and a club that welcomes beginners gets in touch. Free.",
    href: "/try",
    cta: "Find me a club",
  },
  {
    icon: ShieldCheck,
    title: "Run a club or track?",
    body: "Publish your events for free, get a verified page and a calendar widget for your site.",
    href: "/organise",
    cta: "For organisers",
  },
] as const;

const PROMISES = [
  [
    "Free to take part, forever",
    "Following, going, alerts and listing an event never cost anything.",
  ],
  [
    "You can see where it comes from",
    "Every event shows its sources and when we last checked them.",
  ],
  [
    "Nothing about you is public",
    'Only counts ("12 going"), never names. Delete your account whenever you like.',
  ],
  [
    "Organisers get something back",
    "A verified page, a widget, a monthly report and newcomers who ask to try.",
  ],
] as const;

export default async function CommunityPage() {
  const api = getPublicApi();
  const [events, places, hosts] = await Promise.all([
    api.GET("/events"),
    api.GET("/places"),
    api.GET("/hosts"),
  ]);
  const stats = [
    [events.data?.length, "upcoming events"],
    [places.data?.length, "fields and tracks"],
    [hosts.data?.length, "clubs and organisers"],
  ] as const;

  return (
    <>
      <PageHeader
        title="The hobby is better with people."
        lead="SunTzu RC is free and built by three RC obsessives in South Florida. Find your people, try it for the first time, keep up with your fields and events, and if you run a club, publish with us."
      >
        <ul className="mt-8 flex flex-wrap gap-3">
          {stats.map(([value, label]) =>
            value ? (
              <li
                key={label}
                className="rounded-md border-2 border-foreground bg-panel px-3 py-1.5 font-semibold shadow-hard-sm"
              >
                <span className="text-xl font-black font-wide">{value}</span> {label}
              </li>
            ) : null,
          )}
        </ul>
      </PageHeader>

      <section aria-label="Ways in" className="mx-auto max-w-7xl px-4 pb-20">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DOORS.map(({ icon: Icon, title, body, href, cta }) => (
            <li
              key={href}
              className="relative flex flex-col rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
            >
              <Icon aria-hidden className="size-8" />
              <h2 className="mt-4 text-xl font-black font-wide">{title}</h2>
              <p className="mt-2 flex-1 text-pretty">{body}</p>
              <Link
                href={href}
                className="mt-5 font-semibold underline underline-offset-4 after:absolute after:inset-0"
              >
                {cta}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="yours-title" className="bg-cutting-mat text-mat-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 lg:grid-cols-2">
          <div>
            <h2 id="yours-title" className="text-3xl font-black text-balance font-wide sm:text-5xl">
              Never miss the one that matters.
            </h2>
            <p className="mt-4 max-w-[50ch] text-lg text-pretty">
              Sign in with an email link (no password) and follow your clubs, fields, disciplines
              and events. Everything lands in your own calendar, and we tell you when a date moves
              or an event is cancelled.
            </p>
            <Link
              href="/me"
              className="mt-6 inline-flex items-center gap-2 rounded-md border-2 border-foreground bg-primary px-5 py-3 font-semibold text-foreground shadow-hard-sm"
            >
              <BellRing aria-hidden className="size-5" /> Start following
            </Link>
          </div>
          <ul className="grid gap-4 text-foreground sm:grid-cols-2">
            {PROMISES.map(([title, body]) => (
              <li
                key={title}
                className="rounded-xl border-2 border-foreground bg-panel p-5 shadow-hard-sm"
              >
                <p className="font-black font-wide">{title}</p>
                <p className="mt-1 text-pretty">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="weekend-title" className="mx-auto max-w-7xl px-4 py-20">
        <div className="flex flex-col items-start gap-6 rounded-xl border-2 border-foreground bg-primary p-8 shadow-hard-lg sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2
              id="weekend-title"
              className="max-w-[30ch] text-2xl leading-tight font-black font-wide sm:text-3xl"
            >
              What&apos;s on this weekend?
            </h2>
            <p className="mt-2 max-w-[50ch] text-pretty">
              Fly-ins, races and open days from Friday to Sunday, across Florida.
            </p>
          </div>
          <Link
            href="/events?when=weekend"
            className="inline-flex items-center gap-2 rounded-md border-2 border-foreground bg-panel px-5 py-3 font-semibold shadow-hard-sm"
          >
            <CalendarHeart aria-hidden className="size-5" /> This weekend
          </Link>
        </div>
      </section>

      <section aria-labelledby="share-title" className="mx-auto max-w-7xl px-4 pb-24">
        <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 id="share-title" className="text-3xl font-black text-balance font-wide sm:text-5xl">
              Show us your build
            </h2>
            <p className="mt-5 max-w-[46ch] text-lg text-pretty">
              A first foam trainer counts as much as a turbine jet. Send us the story and a link to
              photos; we&apos;ll pick our favourites for the site and check with you before anything
              goes live.
            </p>
          </div>
          <div className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard-lg sm:p-10">
            <BuildForm />
          </div>
        </div>
      </section>
    </>
  );
}
