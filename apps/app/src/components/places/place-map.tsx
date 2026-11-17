"use client";

import type { Place } from "@workspace/shared";
import dynamic from "next/dynamic";
import { preconnect } from "react-dom";
import { WhenNear } from "@/components/when-near";

const placeholder = (
  <div className="aspect-square w-full rounded-xl border-2 border-foreground bg-muted motion-safe:animate-pulse" />
);

const PlacesMap = dynamic(() => import("./places-map").then((m) => m.PlacesMap), {
  ssr: false,
  loading: () => placeholder,
});

/** One place on a small map, centred on it. */
export function PlaceMap({ place, position }: { place: Place; position: [number, number] }) {
  // The tiles come from OpenFreeMap: open the connection while the page loads.
  preconnect("https://tiles.openfreemap.org", { crossOrigin: "anonymous" });
  // Below the fold on a phone: MapLibre and its tiles load only when the map comes near.
  return (
    <WhenNear placeholder={placeholder}>
      <PlacesMap
        places={[place]}
        focus={position}
        className="aspect-square w-full overflow-hidden rounded-xl border-2 border-foreground shadow-hard"
      />
    </WhenNear>
  );
}
