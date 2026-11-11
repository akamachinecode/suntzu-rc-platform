"use client";

import type { Discipline, EventKind, Place, RcEvent } from "@workspace/shared";
import { CalendarDays, List, LocateFixed, Map as MapIcon, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { EventCard } from "@/components/events/event-card";
import { Chip, FilterGroup } from "@/components/filters/chip";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { useWide } from "@/components/filters/use-wide";
import type { MapEvent } from "@/components/events/events-map";
import { MonthView } from "@/components/events/month-view";
import {
  DISCIPLINE_LABELS,
  KIND_LABELS,
  milesBetween,
  runsBetween,
  weekendRange,
} from "@/lib/events";
import { cn } from "@/lib/utils";

// The map is heavy and needs the browser: load it after the list.
const EventsMap = dynamic(() => import("@/components/events/events-map").then((m) => m.EventsMap), {
  ssr: false,
  loading: () => (
    <div className="h-[26rem] w-full animate-pulse rounded-xl border-2 border-foreground bg-muted" />
  ),
});

type Located = "idle" | "locating" | "denied";

const positionOf = (event: RcEvent): [number, number] | undefined =>
  event.place?.latitude != null && event.place.longitude != null
    ? [event.place.longitude, event.place.latitude]
    : undefined;

export interface ExplorerFilters {
  discipline?: Discipline;
  kind?: EventKind;
  weekend?: boolean;
  beginners?: boolean;
  q?: string;
}

const normal = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * The calendar: search, filters, "this weekend", "near me", a map and the list or the month.
 * Your location never leaves the browser.
 *
 * On a phone the filters fold into one "Filters" button and the map becomes a view of its own
 * (List · Map · Month), so the results start on the first screen and the map is only loaded when
 * asked for. From `md` up everything sits on the page as before.
 */
export function EventsExplorer({
  events,
  places,
  initial = {},
  today,
}: {
  events: RcEvent[];
  places: Place[];
  initial?: ExplorerFilters;
  today: string;
}) {
  const [discipline, setDiscipline] = useState<Discipline | "all">(initial.discipline ?? "all");
  const [kind, setKind] = useState<EventKind | "all">(initial.kind ?? "all");
  const [weekend, setWeekend] = useState(initial.weekend ?? false);
  const [beginners, setBeginners] = useState(initial.beginners ?? false);
  const [sanction, setSanction] = useState<string>("all");
  const [query, setQuery] = useState(initial.q ?? "");
  const [view, setView] = useState<"list" | "map" | "month">("list");
  const wide = useWide();
  const [origin, setOrigin] = useState<[number, number] | undefined>();
  const [located, setLocated] = useState<Located>("idle");

  const disciplines = [...new Set(events.map((event) => event.discipline))];
  const kinds = [...new Set(events.map((event) => event.kind))];
  const sanctions = [...new Set(events.flatMap((event) => event.sanctions))].sort();
  const range = useMemo(
    () =>
      weekendRange(/^\d{4}-\d{2}-\d{2}$/.test(today) ? new Date(`${today}T12:00:00Z`) : new Date()),
    [today],
  );

  const shown = useMemo(() => {
    const words = normal(query).split(/\s+/).filter(Boolean);
    const filtered = events.filter((event) => {
      const haystack = normal(
        [
          event.name,
          event.place?.name,
          event.place?.city,
          event.placeText,
          event.host?.name,
          event.summary,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return (
        (discipline === "all" || event.discipline === discipline) &&
        (kind === "all" || event.kind === kind) &&
        (!weekend || runsBetween(event, range.from, range.to)) &&
        (!beginners || event.beginnerFriendly) &&
        (sanction === "all" || event.sanctions.includes(sanction)) &&
        words.every((word) => haystack.includes(word))
      );
    });
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
  }, [events, discipline, kind, weekend, beginners, sanction, query, range, origin]);

  // How many filters are on, for the phone's "Filters" button.
  const active = [
    discipline !== "all",
    kind !== "all",
    weekend,
    beginners,
    sanction !== "all",
  ].filter(Boolean).length;
  function clear() {
    setDiscipline("all");
    setKind("all");
    setWeekend(false);
    setBeginners(false);
    setSanction("all");
  }

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

  const nearMe = (
    <button
      type="button"
      onClick={locate}
      aria-pressed={!!origin}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-foreground bg-panel px-4 py-2 text-sm font-semibold shadow-hard-sm"
    >
      <LocateFixed aria-hidden className="size-4" />
      {origin ? "Back to dates" : located === "locating" ? "Finding you…" : "Near me"}
    </button>
  );
  const sanctionSelect = (className?: string) =>
    sanctions.length ? (
      <label className={cn("flex items-center gap-2 text-sm font-semibold", className)}>
        Sanctioned by
        <select
          value={sanction}
          onChange={(event) => setSanction(event.target.value)}
          className="h-11 rounded-md border-2 border-foreground bg-panel px-2"
        >
          <option value="all">Any</option>
          {sanctions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    ) : null;
  const disciplineChips = (
    <>
      <Chip pressed={discipline === "all"} onClick={() => setDiscipline("all")}>
        All disciplines
      </Chip>
      {disciplines.map((value) => (
        <Chip key={value} pressed={discipline === value} onClick={() => setDiscipline(value)}>
          {DISCIPLINE_LABELS[value]}
        </Chip>
      ))}
    </>
  );
  const kindChips = (
    <>
      <Chip pressed={kind === "all"} onClick={() => setKind("all")}>
        Everything
      </Chip>
      {kinds.map((value) => (
        <Chip key={value} pressed={kind === value} onClick={() => setKind(value)}>
          {KIND_LABELS[value].plural}
        </Chip>
      ))}
    </>
  );
  const views = (["list", "map", "month"] as const).map((value) => {
    const Icon = { list: List, map: MapIcon, month: CalendarDays }[value];
    return (
      <Chip
        key={value}
        pressed={view === value}
        onClick={() => setView(value)}
        // From md up the map is always on the page, so there's no map view to pick.
        className={cn("max-md:flex-1 max-md:justify-center", value === "map" && "md:hidden")}
      >
        <Icon aria-hidden className="size-4" /> {value[0]!.toUpperCase() + value.slice(1)}
      </Chip>
    );
  });

  return (
    <div>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-64">
            <span className="sr-only">Search events, places and clubs</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search: jets, Orlando, Markham Park…"
              className="h-11 w-full rounded-md border-2 border-foreground bg-panel pr-3 pl-9 shadow-hard-sm"
            />
          </label>
          <div className="hidden md:contents">
            <Chip pressed={weekend} onClick={() => setWeekend((value) => !value)}>
              This weekend
            </Chip>
            <Chip pressed={beginners} onClick={() => setBeginners((value) => !value)}>
              Beginners welcome
            </Chip>
            {sanctionSelect()}
          </div>
        </div>
        {/* A phone: every filter behind one button, and "near me" beside it. */}
        <div className="flex flex-wrap gap-3 md:hidden">
          <FilterSheet
            count={active}
            results={`Show ${shown.length} ${shown.length === 1 ? "event" : "events"}`}
            onClear={clear}
          >
            <FilterGroup label="When and who">
              <Chip pressed={weekend} onClick={() => setWeekend((value) => !value)}>
                This weekend
              </Chip>
              <Chip pressed={beginners} onClick={() => setBeginners((value) => !value)}>
                Beginners welcome
              </Chip>
            </FilterGroup>
            <FilterGroup label="Discipline">{disciplineChips}</FilterGroup>
            <FilterGroup label="Kind of event">{kindChips}</FilterGroup>
            {sanctionSelect("justify-between")}
          </FilterSheet>
          {nearMe}
        </div>
        <div
          role="group"
          aria-label="Filter by discipline"
          className="hidden flex-wrap gap-3 md:flex"
        >
          {disciplineChips}
        </div>
        <div
          role="group"
          aria-label="Filter by kind of event"
          className="hidden flex-wrap gap-3 md:flex"
        >
          {kindChips}
        </div>
      </div>

      <div role="group" aria-label="View" className="mt-6 flex gap-3 md:hidden">
        {views}
      </div>

      <div className={cn("mt-6 md:mt-8", view !== "map" && "max-md:hidden")}>
        {wide || view === "map" ? (
          <EventsMap events={pins} places={places} origin={origin} />
        ) : (
          <div className="h-[26rem] w-full rounded-xl border-2 border-foreground bg-muted" />
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            {pins.length} on the map
            {unmapped ? `, ${unmapped} without an exact place yet` : ""}. Small dots are fields and
            tracks.
          </p>
          <div className="max-md:hidden">{nearMe}</div>
        </div>
      </div>
      {located === "denied" ? (
        <p className="mt-2 text-sm" role="status">
          We couldn&apos;t get your location. Allow it in your browser to sort events by distance.
        </p>
      ) : null}

      <div role="group" aria-label="View" className="mt-10 hidden gap-3 md:flex">
        {views}
      </div>

      {view === "month" ? (
        <div className="mt-6">
          <MonthView events={shown.map(({ event }) => event)} today={today} />
        </div>
      ) : null}

      <ol
        hidden={view === "month"}
        className={cn("mt-6 grid gap-6", view === "map" && "max-md:hidden")}
        aria-label={origin ? "Events, closest first" : "Events, soonest first"}
      >
        {shown.map(({ event, miles }) => (
          <li key={event.slug}>
            <EventCard event={event} {...(miles !== undefined && { miles })} />
          </li>
        ))}
      </ol>
      {shown.length === 0 && view !== "month" ? (
        <p className="mt-10 text-lg">
          {weekend
            ? "Nothing announced for this weekend with these filters. Try the month view."
            : "Nothing like this on the calendar right now."}
        </p>
      ) : null}
    </div>
  );
}
