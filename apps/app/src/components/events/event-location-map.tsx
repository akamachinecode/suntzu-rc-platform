"use client";

import type { RcEvent } from "@workspace/shared";
import dynamic from "next/dynamic";

const EventsMap = dynamic(() => import("@/components/events/events-map").then((m) => m.EventsMap), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full animate-pulse rounded-xl border-2 border-foreground bg-muted" />
  ),
});

/** The one-pin map on an event's page. */
export function EventLocationMap({
  event,
  position,
}: {
  event: RcEvent;
  position: [number, number];
}) {
  return (
    <EventsMap
      events={[{ event, position }]}
      label={`Map showing where ${event.name} takes place`}
      className="h-72 w-full overflow-hidden rounded-xl border-2 border-foreground shadow-hard"
    />
  );
}
