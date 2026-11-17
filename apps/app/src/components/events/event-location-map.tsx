"use client";

import type { RcEvent } from "@workspace/shared";
import dynamic from "next/dynamic";
import { preconnect } from "react-dom";
import { WhenNear } from "@/components/when-near";

const placeholder = (
  <div className="h-72 w-full rounded-xl border-2 border-foreground bg-muted motion-safe:animate-pulse" />
);

const EventsMap = dynamic(() => import("@/components/events/events-map").then((m) => m.EventsMap), {
  ssr: false,
  loading: () => placeholder,
});

/** The one-pin map on an event's page. */
export function EventLocationMap({
  event,
  position,
}: {
  event: RcEvent;
  position: [number, number];
}) {
  // The tiles come from OpenFreeMap: open the connection while the page loads.
  preconnect("https://tiles.openfreemap.org", { crossOrigin: "anonymous" });
  // Below the fold on a phone: MapLibre and its tiles load only when the map comes near.
  return (
    <WhenNear placeholder={placeholder}>
      <EventsMap
        events={[{ event, position }]}
        label={`Map showing where ${event.name} takes place`}
        className="h-72 w-full overflow-hidden rounded-xl border-2 border-foreground shadow-hard"
      />
    </WhenNear>
  );
}
