"use client";

import { AlertTriangle, CheckCircle2, LocateFixed, MapPin, PlaneLanding } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { AirspaceCheck, Place } from "@workspace/shared";
import { cn } from "@/lib/utils";
import { checkPoint } from "./actions";

const PlacesMap = dynamic(() => import("@/components/places/places-map").then((m) => m.PlacesMap), {
  ssr: false,
  loading: () => (
    <div className="h-[30rem] w-full animate-pulse rounded-xl border-2 border-foreground bg-muted" />
  ),
});

const VERDICTS: Record<
  AirspaceCheck["verdict"],
  { title: string; body: string; tone: string; icon: typeof CheckCircle2 }
> = {
  controlled: {
    title: "Controlled airspace: you need authorisation",
    body: "This point is inside airspace around an airport that starts at the ground. Recreational flyers need a LAANC authorisation (free, in minutes, through an FAA-approved app) before flying here, even below 400 ft.",
    tone: "bg-lead",
    icon: AlertTriangle,
  },
  "near-airport": {
    title: "Uncontrolled, but close to an airport",
    body: "You may fly here up to 400 ft, but give way to every manned aircraft and keep clear of the airport's traffic. Check B4UFLY for temporary restrictions before you go.",
    tone: "bg-primary",
    icon: PlaneLanding,
  },
  fria: {
    title: "An FAA-recognised identification area",
    body: "Models without Remote ID may fly here. It's usually a club field: follow the club's rules and ask before you visit.",
    tone: "bg-sky",
    icon: MapPin,
  },
  clear: {
    title: "No controlled airspace here",
    body: "Recreational flying up to 400 ft is allowed in uncontrolled airspace, with TRUST, registration and Remote ID (or at a FRIA). Respect private property and local park rules, and check B4UFLY for temporary restrictions.",
    tone: "bg-panel",
    icon: CheckCircle2,
  },
};

/** `initial` is a spot to check on arrival, [longitude, latitude] ("Can I fly near Hialeah?"). */
export function Checker({ places, initial }: { places: Place[]; initial?: [number, number] }) {
  const [point, setPoint] = useState<[number, number] | undefined>(initial);
  const [result, setResult] = useState<AirspaceCheck | "outside" | "error" | undefined>();
  const [pending, start] = useTransition();
  const [locating, setLocating] = useState(false);

  function check(next: [number, number]) {
    setPoint(next);
    start(async () => setResult(await checkPoint(next[1], next[0])));
  }

  useEffect(() => {
    if (initial) start(async () => setResult(await checkPoint(initial[1], initial[0])));
  }, [initial]);

  function locate() {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        check([coords.longitude, coords.latitude]);
      },
      () => setLocating(false),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  const verdict = result && typeof result === "object" ? VERDICTS[result.verdict] : undefined;
  const Icon = verdict?.icon;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_26rem]">
      <div>
        <PlacesMap
          places={places.filter((place) => place.isFria)}
          {...(point && { origin: point })}
          onPick={check}
          className="h-[30rem] w-full overflow-hidden rounded-xl border-2 border-foreground shadow-hard"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Tap the map where you&apos;d like to fly. Blue dots are FAA-recognised areas.
          </p>
          <button
            type="button"
            onClick={locate}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-foreground bg-panel px-3 py-1.5 font-semibold shadow-hard-sm"
          >
            <LocateFixed aria-hidden className="size-4" />
            {locating ? "Finding you…" : "Check where I am"}
          </button>
        </div>
      </div>

      <section aria-live="polite" aria-label="Result" className="grid content-start gap-5">
        {!result && !pending ? (
          <p className="rounded-xl border-2 border-dashed border-foreground p-6 text-lg text-pretty">
            Pick a point on the map, or use your location. We check it against the FAA&apos;s
            airspace and airport data and don&apos;t keep it.
          </p>
        ) : null}
        {pending ? (
          <p className="rounded-xl border-2 border-foreground bg-panel p-6 text-lg">Checking…</p>
        ) : null}
        {result === "outside" && !pending ? (
          <p className="rounded-xl border-2 border-foreground bg-panel p-6 text-lg">
            That point is outside Florida. SunTzu RC only covers Florida for now.
          </p>
        ) : null}
        {result === "error" && !pending ? (
          <p className="rounded-xl border-2 border-foreground bg-panel p-6 text-lg">
            We couldn&apos;t check it. Try again in a minute.
          </p>
        ) : null}
        {verdict && Icon && typeof result === "object" && !pending ? (
          <>
            <div
              className={cn("rounded-xl border-2 border-foreground p-6 shadow-hard", verdict.tone)}
            >
              <Icon aria-hidden className="size-8" />
              <h2 className="mt-3 text-2xl leading-tight font-black font-wide">{verdict.title}</h2>
              <p className="mt-3 text-pretty">{verdict.body}</p>
            </div>
            {result.airspace.length ? (
              <div className="rounded-xl border-2 border-foreground bg-panel p-5">
                <h3 className="font-bold">Airspace over this point</h3>
                <ul className="mt-2 grid gap-1 text-sm">
                  {result.airspace.map((area) => (
                    <li key={area.name}>
                      Class {area.class}: {area.name}
                      {area.lowerFt > 0
                        ? ` (from ${area.lowerFt.toLocaleString()} ft)`
                        : " (from the ground)"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.airports.length ? (
              <div className="rounded-xl border-2 border-foreground bg-panel p-5">
                <h3 className="font-bold">Closest airports and heliports</h3>
                <ul className="mt-2 grid gap-1 text-sm">
                  {result.airports.map((airport) => (
                    <li key={airport.ident}>
                      {airport.name} ({airport.ident}, {airport.kind.replace("-", " ")}):{" "}
                      {airport.miles} mi
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="rounded-xl border-2 border-foreground bg-panel p-5">
              <h3 className="font-bold">Fields near here</h3>
              <ul className="mt-2 grid gap-1 text-sm">
                {[...(result.fria ? [result.fria] : []), ...result.fields].map((field) => (
                  <li key={field.slug}>
                    <Link
                      href={`/places/${field.slug}`}
                      className="font-semibold underline underline-offset-4"
                    >
                      {field.name}
                    </Link>{" "}
                    · {field.miles} mi
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-pretty">
              This is guidance from the FAA&apos;s public data, not an authorisation. Temporary
              flight restrictions aren&apos;t shown yet: always check{" "}
              <a
                href="https://www.faa.gov/uas/getting_started/b4ufly"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline underline-offset-4"
              >
                B4UFLY<span className="sr-only"> (opens in a new tab)</span>
              </a>{" "}
              or a LAANC app before you fly.
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
