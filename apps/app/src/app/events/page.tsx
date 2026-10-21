import type { Metadata } from "next";
import Link from "next/link";
import { EventList } from "@/components/events/event-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@workspace/ui/components/button";
import { EVENTS, byDate } from "@/content/events";

export const metadata: Metadata = {
  title: "RC events in Florida",
  description:
    "Competitions, shows and fly-ins for RC planes, helicopters and cars in South Florida and worth-the-drive events further afield.",
};

// Re-render once a day so finished events drop off the list without a redeploy.
export const revalidate = 86400;

export default function EventsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const events = EVENTS.filter((event) => (event.end ?? event.start) >= today).sort(byDate);
  return (
    <>
      <PageHeader
        title="Where to be, and when."
        lead="Competitions, shows and fly-ins in South Florida, plus the ones worth a road trip. Dates come from each organiser; always check their page before you load the truck."
      />
      <section aria-label="Calendar" className="mx-auto max-w-7xl px-4 pb-16">
        <EventList events={events} />
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="flex flex-col items-start gap-6 rounded-xl border-2 border-foreground bg-primary p-8 shadow-hard-lg sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <p className="max-w-[36ch] text-2xl leading-tight font-black font-wide sm:text-3xl">
            Running a race, a fly-in or a club open day?
          </p>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact?topic=event">Send us your event</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
