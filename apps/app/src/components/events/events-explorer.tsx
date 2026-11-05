"use client";

import type { Discipline, EventKind, Place, RcEvent } from "@workspace/shared";
import { LocateFixed } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { EventCard } from "@/components/events/event-card";
import type { MapEvent } from "@/components/events/events-map";
import { DISCIPLINE_LABELS, KIND_LABELS, milesBetween } from "@/lib/events";
import { cn } from "@/lib/utils";

// The map is heavy and needs the browser: load it after the list.
const EventsMap = dynamic(() => import("@/components/events/events-map").then((m) => m.EventsMap), {
  ssr: false,
  loading: () => (
    <div className="h-[26rem] w-full animate-pulse rounded-xl border-2 border-foreground bg-muted" />
  ),
});

type Located = "idle" | "locating" | "denied";

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-md border-2 border-foreground px-4 py-2 text-sm font-semibold shadow-hard-sm transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transform-none",
        pressed ? "bg-foreground text-background" : "bg-panel",
      )}
    >
      {children}
    </button>
  );
}

const positionOf = (event: RcEvent): [number, number] | undefined =>
  event.place?.latitude != null && event.place.longitude != null
    ? [event.place.longitude, event.place.latitude]
    : undefined;

/** The calendar: filters, "near me", a map and the list. Your location never leaves the browser. */
export function EventsExplorer({ events, places }: { events: RcEvent[]; places: Place[] }) {
  const [discipline, setDiscipline] = useState<Discipline | "all">("all");
  const [kind, setKind] = useState<EventKind | "all">("all");
  const [origin, setOrigin] = useState<[number, number] | undefined>();
  const [located, setLocated] = useState<Located>("idle");

  const disciplines = [...new Set(events.map((event) => event.discipline))];
  const kinds = [...new Set(events.map((event) => event.kind))];

  const shown = useMemo(() => {
    const filtered = events.filter(
      (event) =>
        (discipline === "all" || event.discipline === discipline) &&
        (kind === "all" || event.kind === kind),
    );
    const withDistance = filtered.map((event) => {
      const position = positionOf(event);
      return {
        event,
        position,
        miles:
          origin && position
            ? milesBetween([origin[1], origin[0]], [position[1], position[0]])
            : undefined,
      };
    });
    // Near me: closest first; events without an exact place go last, in date order.
    if (origin) withDistance.sort((a, b) => (a.miles ?? Infinity) - (b.miles ?? Infinity));
    return withDistance;
  }, [events, discipline, kind, origin]);

  const pins: MapEvent[] = shown.flatMap(({ event, position }) =>
    position ? [{ event, position }] : [],
  );
  const unmapped = shown.length - pins.length;

  function locate() {
    if (origin) {
      setOrigin(undefined);
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocated("denied");
      return;
    }
    setLocated("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrigin([coords.longitude, coords.latitude]);
        setLocated("idle");
      },
      () => setLocated("denied"),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  return (
    <div>
      <div className="grid gap-4">
        <div role="group" aria-label="Filter by discipline" className="flex flex-wrap gap-3">
          <Chip pressed={discipline === "all"} onClick={() => setDiscipline("all")}>
            All disciplines
          </Chip>
          {disciplines.map((value) => (
            <Chip key={value} pressed={discipline === value} onClick={() => setDiscipline(value)}>
              {DISCIPLINE_LABELS[value]}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label="Filter by kind of event" className="flex flex-wrap gap-3">
          <Chip pressed={kind === "all"} onClick={() => setKind("all")}>
            Everything
          </Chip>
          {kinds.map((value) => (
            <Chip key={value} pressed={kind === value} onClick={() => setKind(value)}>
              {KIND_LABELS[value].plural}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <EventsMap events={pins} places={places} origin={origin} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            {pins.length} on the map
            {unmapped ? `, ${unmapped} without an exact place yet` : ""}. Small dots are fields and
            tracks.
          </p>
          <button
            type="button"
            onClick={locate}
            aria-pressed={!!origin}
            className="inline-flex items-center gap-2 rounded-md border-2 border-foreground bg-panel px-3 py-1.5 font-semibold shadow-hard-sm"
          >
            <LocateFixed aria-hidden className="size-4" />
            {origin ? "Back to dates" : located === "locating" ? "Finding you…" : "Near me"}
          </button>
        </div>
        {located === "denied" ? (
          <p className="mt-2 text-sm" role="status">
            We couldn&apos;t get your location. Allow it in your browser to sort events by distance.
          </p>
        ) : null}
      </div>

      <ol
        className="mt-10 grid gap-6"
        aria-label={origin ? "Events, closest first" : "Events, soonest first"}
      >
        {shown.map(({ event, miles }) => (
          <li key={event.slug}>
            <EventCard event={event} {...(miles !== undefined && { miles })} />
          </li>
        ))}
      </ol>
      {shown.length === 0 ? (
        <p className="mt-10 text-lg">Nothing like this on the calendar right now.</p>
      ) : null}
    </div>
  );
}
