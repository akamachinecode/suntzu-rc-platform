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

/**
 * One event in a list. The whole card leads to the event's page. It lays itself out by the room
 * it has, not by the window (a container query): the same card sits in the full-width calendar
 * and in the narrow column of a place's or a club's page (modern web guidance, css/size-aware-styling).
 */
export function EventCard({ event, miles }: { event: RcEvent; miles?: number }) {
  const cancelled = event.status === "cancelled";
  return (
    <div className="@container">
      <article
        className={cn(
          "group relative grid gap-5 rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard transition-transform focus-within:-translate-y-0.5 hover:-translate-y-0.5 motion-reduce:transform-none @2xl:items-start @2xl:gap-8",
          // The distance gets a column only when there is one.
          miles !== undefined ? "@2xl:grid-cols-[13rem_1fr_auto]" : "@2xl:grid-cols-[13rem_1fr]",
        )}
      >
        <div>
          <p
            className={cn(
              "font-wide text-xl leading-tight font-black",
              cancelled && "line-through",
            )}
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
          <p className="font-wide text-lg font-black @2xl:justify-self-end">
            {Math.round(miles)} mi
          </p>
        ) : null}
      </article>
    </div>
  );
}
