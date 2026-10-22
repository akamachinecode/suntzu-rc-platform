import type { RcEvent } from "@workspace/shared";
import Link from "next/link";
import {
  DISCIPLINE_COLORS,
  DISCIPLINE_LABELS,
  formatWhen,
  formatWhere,
  hasExactDates,
  KIND_LABELS,
  REGION_LABELS,
} from "@/lib/events";
import { cn } from "@/lib/utils";

/** One event in the calendar list. The whole card leads to the event's page. */
export function EventCard({ event, miles }: { event: RcEvent; miles?: number }) {
  const cancelled = event.status === "cancelled";
  return (
    <article className="group relative grid gap-5 rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard transition-transform focus-within:-translate-y-0.5 hover:-translate-y-0.5 motion-reduce:transform-none md:grid-cols-[13rem_1fr_auto] md:items-start md:gap-8">
      <div>
        <p
          className={cn("text-xl leading-tight font-black font-wide", cancelled && "line-through")}
        >
          {formatWhen(event)}
        </p>
        {cancelled ? (
          <p className="mt-2 inline-block rounded-md border-2 border-foreground bg-lead px-2 py-0.5 text-sm font-semibold">
            Cancelled
          </p>
        ) : hasExactDates(event) ? null : (
          <p className="mt-2 inline-block rounded-md border-2 border-foreground bg-background px-2 py-0.5 text-sm font-semibold">
            Dates not announced yet
          </p>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold">
          <Link
            href={`/events/${event.slug}`}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
          >
            {event.name}
          </Link>
        </h3>
        <p className="mt-1 text-muted-foreground">
          {formatWhere(event)}
          {event.host ? `. Hosted by ${event.host.name}` : ""}.
        </p>
        {event.summary ? <p className="mt-3 max-w-[60ch] text-pretty">{event.summary}</p> : null}
        <ul className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          <li className="rounded-md bg-primary px-2 py-0.5">{KIND_LABELS[event.kind].label}</li>
          <li className={cn("rounded-md px-2 py-0.5", DISCIPLINE_COLORS[event.discipline])}>
            {DISCIPLINE_LABELS[event.discipline]}
          </li>
          <li className="rounded-md bg-muted px-2 py-0.5">{REGION_LABELS[event.region]}</li>
        </ul>
      </div>
      {miles !== undefined ? (
        <p className="text-lg font-black font-wide md:justify-self-end">{Math.round(miles)} mi</p>
      ) : null}
    </article>
  );
}
