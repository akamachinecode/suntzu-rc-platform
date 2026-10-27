"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Place } from "@workspace/shared";
import {
  LngLatBounds,
  Map as MapLibre,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useRef } from "react";
import { PLACE_KIND_LABELS } from "@/lib/places";

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

// Every place on one map. Same base map and gestures as the events map (OpenFreeMap).
const STYLE = "https://tiles.openfreemap.org/styles/positron";
const FLORIDA: [number, number] = [-81.7, 27.9];

const KIND_STYLE: Record<Place["kind"], string> = {
  "flying-field": "bg-sky",
  "car-track": "bg-lead",
  indoor: "bg-primary",
  venue: "bg-panel",
};

function popup(place: Place): HTMLElement {
  const root = document.createElement("div");
  root.className = "font-sans text-sm text-foreground";
  const link = document.createElement("a");
  link.href = `/places/${place.slug}`;
  link.className = "block text-base font-bold underline-offset-4 hover:underline";
  link.textContent = place.name;
  const line = document.createElement("p");
  line.className = "mt-1 text-muted-foreground";
  line.textContent = [PLACE_KIND_LABELS[place.kind], place.city].filter(Boolean).join(" · ");
  root.append(link, line);
  return root;
}

export function PlacesMap({
  places,
  origin,
  focus,
  className = "h-[28rem] w-full overflow-hidden rounded-xl border-2 border-foreground shadow-hard",
  onPick,
}: {
  places: Place[];
  origin?: [number, number];
  /** Centre on this place (its own page). */
  focus?: [number, number];
  className?: string;
  /** "Can I fly here?": a click on the map picks a point. */
  onPick?: (point: [number, number]) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const markers = useRef<Marker[]>([]);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!container.current) return;
    const instance = new MapLibre({
      container: container.current,
      style: STYLE,
      center: focus ?? FLORIDA,
      zoom: focus ? 11 : 5.4,
      cooperativeGestures: true,
      attributionControl: { compact: true },
    });
    instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
    instance.on("click", (event) => {
      if (pick.current && !(event.originalEvent.target as HTMLElement).closest("button")) {
        pick.current([event.lngLat.lng, event.lngLat.lat]);
      }
    });
    map.current = instance;
    return () => {
      instance.remove();
      map.current = null;
    };
    // The map is created once; markers follow the data below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      dot.className = `size-4 rounded-full border-2 border-foreground ${KIND_STYLE[place.kind]}`;
      dot.setAttribute("aria-label", `${place.name}${place.city ? `, ${place.city}` : ""}`);
      markers.current.push(
        new Marker({ element: dot })
          .setLngLat([place.longitude, place.latitude])
          .setPopup(new Popup({ offset: 10, closeButton: false }).setDOMContent(popup(place)))
          .addTo(instance),
      );
      bounds.extend([place.longitude, place.latitude]);
    }
    if (origin) {
      const you = document.createElement("div");
      you.className =
        "size-4 rounded-full border-2 border-panel bg-foreground ring-4 ring-foreground/20";
      you.setAttribute("aria-label", "This point");
      markers.current.push(new Marker({ element: you }).setLngLat(origin).addTo(instance));
    }
    if (focus) return;
    if (origin) {
      instance.flyTo({ center: origin, zoom: Math.max(instance.getZoom(), 9), duration: 600 });
    } else if (!bounds.isEmpty()) {
      instance.fitBounds(bounds, { padding: 50, maxZoom: 10, duration: 600 });
    }
  }, [places, origin, focus]);

  return (
    <div
      ref={container}
      role="region"
      aria-label="Map of RC fields and tracks"
      className={className}
    />
  );
}
