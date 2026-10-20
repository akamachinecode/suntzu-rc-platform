"use client";

import { useState } from "react";
import { KINDS, type EventKind, type RcEvent } from "@/content/events";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ value: EventKind | "all"; label: string }> = [
  { value: "all", label: "Everything" },
  ...(Object.keys(KINDS) as EventKind[]).map((kind) => ({
    value: kind,
    label: KINDS[kind].plural,
  })),
];

const DISCIPLINE = { air: "Planes and jets", rotor: "Helicopters", ground: "Cars" } as const;

/** The calendar list with a filter by kind of event. */
export function EventList({ events }: { events: RcEvent[] }) {
  const [filter, setFilter] = useState<EventKind | "all">("all");
  const shown = events.filter((event) => filter === "all" || event.kind === filter);

  return (
    <div>
      <div role="group" aria-label="Filter events" className="flex flex-wrap gap-3">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "rounded-md border-2 border-foreground px-4 py-2 text-sm font-semibold shadow-hard-sm transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transform-none",
              filter === option.value ? "bg-foreground text-background" : "bg-panel",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <ol className="mt-10 grid gap-6">
        {shown.map((event) => (
          <li
            key={event.id}
            className="grid gap-5 rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard md:grid-cols-[13rem_1fr_auto] md:items-start md:gap-8"
          >
            <div>
              <p className="text-xl leading-tight font-black font-wide">{event.when}</p>
              {event.confirmed ? null : (
                <p className="mt-2 inline-block rounded-md border-2 border-foreground bg-background px-2 py-0.5 text-sm font-semibold">
                  Dates not announced yet
                </p>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold">{event.name}</h3>
              <p className="mt-1 text-muted-foreground">
                {event.place}. {event.host}.
              </p>
              <p className="mt-3 max-w-[60ch] text-pretty">{event.summary}</p>
              <ul className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                <li className="rounded-md bg-primary px-2 py-0.5">{KINDS[event.kind].label}</li>
                <li className="rounded-md bg-muted px-2 py-0.5">{DISCIPLINE[event.discipline]}</li>
                <li className="rounded-md bg-muted px-2 py-0.5">{event.region}</li>
              </ul>
            </div>
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-4 md:justify-self-end"
            >
              Organiser&apos;s page
              <span className="sr-only"> for {event.name} (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ol>
      {shown.length === 0 ? (
        <p className="mt-10 text-lg">Nothing of this kind on the calendar right now.</p>
      ) : null}
    </div>
  );
}
