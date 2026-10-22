"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Place, RcEvent } from "@workspace/shared";
import {
  LngLatBounds,
  Map as MapLibre,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useRef } from "react";
import { DISCIPLINE_COLORS, formatWhen, formatWhere } from "@/lib/events";

// MapLibre draws tiles in a web worker it finds next to its own file, which a bundler moves.
// Pointing at the worker this way makes the bundler ship it as a file of its own.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

// Vector map of Florida with a pin per event and a small dot per field or track.
// Base map: OpenFreeMap (free, no key, OpenStreetMap data; MapLibre shows the attribution).
const STYLE = "https://tiles.openfreemap.org/styles/positron";
const FLORIDA: [number, number] = [-81.7, 27.9];

export interface MapEvent {
  event: RcEvent;
  position: [number, number]; // [longitude, latitude]
}

/** A link inside a popup, built with DOM calls so event text can never become HTML. */
function popupContent(title: string, lines: string[], href?: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "font-sans text-sm text-foreground";
  const heading = document.createElement(href ? "a" : "p");
  heading.className = "block text-base font-bold underline-offset-4 hover:underline";
  heading.textContent = title;
  if (href && heading instanceof HTMLAnchorElement) heading.href = href;
  root.append(heading);
  for (const line of lines) {
    const text = document.createElement("p");
    text.className = "mt-1 text-muted-foreground";
    text.textContent = line;
    root.append(text);
  }
  return root;
}

export function EventsMap({
  events,
  places = [],
  origin,
  className,
  label = "Map of upcoming RC events in Florida",
}: {
  events: MapEvent[];
  places?: Place[];
  origin?: [number, number];
  className?: string;
  label?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const markers = useRef<Marker[]>([]);

  useEffect(() => {
    if (!container.current) return;
    const instance = new MapLibre({
      container: container.current,
      style: STYLE,
      center: FLORIDA,
      zoom: 5.4,
      // Two fingers to move on phones, Ctrl/⌘ + scroll on computers: the page keeps scrolling.
      cooperativeGestures: true,
      attributionControl: { compact: true },
    });
    instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.current = instance;
    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    for (const marker of markers.current) marker.remove();
    markers.current = [];
    const bounds = new LngLatBounds();

    for (const place of places) {
      if (place.latitude == null || place.longitude == null) continue;
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "size-3 rounded-full border-2 border-foreground bg-panel";
      dot.setAttribute("aria-label", `${place.name}, ${place.city ?? ""}`);
      markers.current.push(
        new Marker({ element: dot })
          .setLngLat([place.longitude, place.latitude])
          .setPopup(
            new Popup({ offset: 10, closeButton: false }).setDOMContent(
              popupContent(place.name, [
                [place.kind === "car-track" ? "Car track" : "Flying field", place.city]
                  .filter(Boolean)
                  .join(" · "),
              ]),
            ),
          )
          .addTo(instance),
      );
    }

    for (const { event, position } of events) {
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = `size-6 rounded-full border-2 border-foreground shadow-hard-sm ${DISCIPLINE_COLORS[event.discipline]}`;
      pin.setAttribute("aria-label", `${event.name}, ${formatWhen(event)}`);
      markers.current.push(
        new Marker({ element: pin })
          .setLngLat(position)
          .setPopup(
            new Popup({ offset: 16, closeButton: false }).setDOMContent(
              popupContent(
                event.name,
                [formatWhen(event), formatWhere(event)],
                `/events/${event.slug}`,
              ),
            ),
          )
          .addTo(instance),
      );
      bounds.extend(position);
    }

    if (origin) {
      const you = document.createElement("div");
      you.className =
        "size-4 rounded-full border-2 border-panel bg-foreground ring-4 ring-foreground/20";
      you.setAttribute("aria-label", "You are here");
      markers.current.push(new Marker({ element: you }).setLngLat(origin).addTo(instance));
      bounds.extend(origin);
    }

    if (!bounds.isEmpty()) {
      instance.fitBounds(bounds, { padding: 60, maxZoom: 10, duration: 600 });
    }
  }, [events, places, origin]);

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      className={
        className ??
        "h-[26rem] w-full overflow-hidden rounded-xl border-2 border-foreground shadow-hard"
      }
    />
  );
}
