import type { Metadata } from "next";
import Link from "next/link";
import { CalendarSubscribe } from "@/components/events/calendar-subscribe";
import { DISCIPLINES, EVENT_KINDS } from "@workspace/shared";
import { EventsExplorer, type ExplorerFilters } from "@/components/events/events-explorer";
import { PageHeader } from "@/components/page-header";
import { Button } from "@workspace/ui/components/button";
import { getPublicApi } from "@/lib/api";
import { floridaDate } from "@/lib/events";

export const metadata: Metadata = {
  title: "RC events in Florida",
  description:
    "Fly-ins, races, competitions and swap meets for RC planes, helicopters, cars and FPV drones across Florida, on a map, with a calendar you can subscribe to.",
};

// Rendered on request (data cached for 5 minutes), so the page never depends on the API at build.
export const dynamic = "force-dynamic";

const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const params = await searchParams;
  const discipline = DISCIPLINES.find((value) => value === one(params.discipline));
  const kind = EVENT_KINDS.find((value) => value === one(params.kind));
  const initial: ExplorerFilters = {
    ...(discipline && { discipline }),
    ...(kind && { kind }),
    ...(one(params.when) === "weekend" && { weekend: true }),
    ...(one(params.beginners) === "1" && { beginners: true }),
    ...(one(params.q) && { q: one(params.q)!.slice(0, 80) }),
  };
  const today = floridaDate();
  const api = getPublicApi();
  const [events, places] = await Promise.all([api.GET("/events"), api.GET("/places")]);

  return (
    <>
      <PageHeader
        title="Where to be, and when."
        lead="Fly-ins, races, competitions and swap meets across Florida. Every event links to its organiser and says when we last checked it; always check their page before you load the truck."
      />
      <section aria-label="Calendar" className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
        {events.data ? (
          <EventsExplorer
            events={events.data}
            places={places.data ?? []}
            initial={initial}
            today={today}
          />
        ) : (
          <p className="rounded-xl border-2 border-foreground bg-panel p-6 text-lg shadow-hard">
            The calendar is taking a break. Try again in a minute.
          </p>
        )}
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
        <CalendarSubscribe />
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-xl border-2 border-foreground bg-primary p-8 shadow-hard-lg sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <p className="max-w-[36ch] text-2xl leading-tight font-black font-wide sm:text-3xl">
            Running a race, a fly-in or a club open day?
          </p>
          <Button asChild size="lg" variant="outline">
            <Link href="/submit">Send us your event</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
