"use client";

import { useSyncExternalStore } from "react";

/** Tailwind's `md` breakpoint: from here on the filters and the map sit on the page. */
const WIDE = "(min-width: 48rem)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(WIDE);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/**
 * Whether the screen is at least `md` wide. False on the server and while the page hydrates, so
 * use it only to decide what to load (the map), and CSS (`md:`) for what to show.
 */
export function useWide() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}
