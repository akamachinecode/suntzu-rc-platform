"use client";

import type { Discipline, Place } from "@workspace/shared";
import { LocateFixed, Search } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DISCIPLINE_LABELS, milesBetween } from "@/lib/events";
import { ACCESS_LABELS, PLACE_KIND_LABELS } from "@/lib/places";
import { cn } from "@/lib/utils";

const PlacesMap = dynamic(() => import("./places-map").then((m) => m.PlacesMap), {
  ssr: false,
  loading: () => (
    <div className="h-[28rem] w-full animate-pulse rounded-xl border-2 border-foreground bg-muted" />
  ),
});

const PAGE = 60;

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
        "rounded-md border-2 border-foreground px-4 py-2 text-sm font-semibold shadow-hard-sm",
        pressed ? "bg-foreground text-background" : "bg-panel",
      )}
    >
      {children}
    </button>
  );
}

const normal = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Every field and track: search, kind, discipline, "near me" (computed in the browser). */
export function PlacesExplorer({ places, nearMe }: { places: Place[]; nearMe?: boolean }) {
  const [kind, setKind] = useState<Place["kind"] | "all">("all");
  const [discipline, setDiscipline] = useState<Discipline | "all">("all");
  const [friaOnly, setFriaOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<[number, number] | undefined>();
  const [locating, setLocating] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const kinds = [...new Set(places.map((place) => place.kind))];
  const disciplines = [...new Set(places.flatMap((place) => place.disciplines))];

  const shown = useMemo(() => {
    const words = normal(query).split(/\s+/).filter(Boolean);
    const list = places
      .filter((place) => {
        const haystack = normal(
          [place.name, place.city, place.county, place.host?.name].filter(Boolean).join(" "),
        );
        return (
          (kind === "all" || place.kind === kind) &&
          (discipline === "all" || place.disciplines.includes(discipline)) &&
          (!friaOnly || place.isFria) &&
          words.every((word) => haystack.includes(word))
        );
      })
      .map((place) => ({
        place,
        miles:
          origin && place.latitude != null && place.longitude != null
            ? milesBetween([origin[1], origin[0]], [place.latitude, place.longitude])
            : undefined,
      }));
    if (origin) list.sort((a, b) => (a.miles ?? Infinity) - (b.miles ?? Infinity));
    return list;
  }, [places, kind, discipline, friaOnly, query, origin]);

  // The visitor asked for "near me" before the page opened (search's shortcut): once, on arrival.
  useEffect(() => {
    if (!nearMe) return;
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => setOrigin([coords.longitude, coords.latitude]),
      () => undefined,
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }, [nearMe]);

  function locate() {
    if (origin) return setOrigin(undefined);
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        setOrigin([coords.longitude, coords.latitude]);
        setLocating(false);
      },
      () => setLocating(false),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  return (
    <div>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-64">
            <span className="sr-only">Search places, cities and clubs</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search: Miami, Markham, club name…"
              className="h-11 w-full rounded-md border-2 border-foreground bg-panel pr-3 pl-9 shadow-hard-sm"
            />
          </label>
          <button
            type="button"
            onClick={locate}
            aria-pressed={!!origin}
            className="inline-flex h-11 items-center gap-2 rounded-md border-2 border-foreground bg-panel px-3 font-semibold shadow-hard-sm"
          >
            <LocateFixed aria-hidden className="size-4" />
            {origin ? "Back to A–Z" : locating ? "Finding you…" : "Near me"}
          </button>
        </div>
        <div role="group" aria-label="Kind of place" className="flex flex-wrap gap-3">
          <Chip pressed={kind === "all"} onClick={() => setKind("all")}>
            Everything
          </Chip>
          {kinds.map((value) => (
            <Chip key={value} pressed={kind === value} onClick={() => setKind(value)}>
              {PLACE_KIND_LABELS[value]}s
            </Chip>
          ))}
          <Chip pressed={friaOnly} onClick={() => setFriaOnly((value) => !value)}>
            FAA-recognised (FRIA)
          </Chip>
        </div>
        {disciplines.length ? (
          <div role="group" aria-label="Discipline" className="flex flex-wrap gap-3">
            <Chip pressed={discipline === "all"} onClick={() => setDiscipline("all")}>
              All disciplines
            </Chip>
            {disciplines.map((value) => (
              <Chip key={value} pressed={discipline === value} onClick={() => setDiscipline(value)}>
                {DISCIPLINE_LABELS[value]}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        <PlacesMap places={shown.map(({ place }) => place)} {...(origin && { origin })} />
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
          {shown.length} {shown.length === 1 ? "place" : "places"}. Blue: flying fields · red: car
          tracks · yellow: indoor.
        </p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.slice(0, limit).map(({ place, miles }) => (
          <li
            key={place.slug}
            className="relative grid gap-2 rounded-xl border-2 border-foreground bg-panel p-5 shadow-hard transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            <p className="text-xs font-semibold tracking-wide uppercase">
              {PLACE_KIND_LABELS[place.kind]}
              {place.isFria ? " · FRIA" : ""}
            </p>
            <h3 className="text-lg font-bold">
              <Link
                href={`/places/${place.slug}`}
                className="after:absolute after:inset-0 after:rounded-xl"
              >
                {place.name}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground">
              {[place.city, place.county && `${place.county} County`].filter(Boolean).join(", ") ||
                "Florida"}
              {miles !== undefined ? ` · ${Math.round(miles)} mi` : ""}
            </p>
            <p className="text-sm font-semibold">{ACCESS_LABELS[place.access].label}</p>
          </li>
        ))}
      </ul>
      {shown.length > limit ? (
        <button
          type="button"
          onClick={() => setLimit((value) => value + PAGE)}
          className="mt-8 rounded-md border-2 border-foreground bg-panel px-4 py-2 font-semibold shadow-hard-sm"
        >
          Show more ({shown.length - limit} left)
        </button>
      ) : null}
      {shown.length === 0 ? (
        <p className="mt-10 text-lg">No places match. Try fewer filters.</p>
      ) : null}
    </div>
  );
}
