"use client";

import type { Place } from "@workspace/shared";
import dynamic from "next/dynamic";

const PlacesMap = dynamic(() => import("./places-map").then((m) => m.PlacesMap), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full animate-pulse rounded-xl border-2 border-foreground bg-muted" />
  ),
});

/** One place on a small map, centred on it. */
export function PlaceMap({ place, position }: { place: Place; position: [number, number] }) {
  return (
    <PlacesMap
      places={[place]}
      focus={position}
      className="aspect-square w-full overflow-hidden rounded-xl border-2 border-foreground shadow-hard"
    />
  );
}
