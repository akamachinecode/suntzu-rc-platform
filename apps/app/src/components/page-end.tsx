"use client";

import { useEffect } from "react";

/**
 * Marks the root while the visitor is in the lower half of the page (`data-end`), so the space
 * Safari leaves under its floating toolbar at the end of the page takes the footer's color
 * instead of the page's gray (globals.css). A page too short to scroll counts as its end.
 */
export function PageEnd() {
  useEffect(() => {
    const root = document.documentElement;
    let half = 0;
    let end: boolean | null = null;
    let frame = 0;

    const update = () => {
      frame = 0;
      const next = window.scrollY >= half;
      if (next === end) return;
      end = next;
      root.toggleAttribute("data-end", next);
    };
    const measure = () => {
      half = (root.scrollHeight - window.innerHeight) / 2;
      update();
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };

    // The page grows as it loads (images, a list of events), so measure it whenever it does.
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      root.removeAttribute("data-end");
    };
  }, []);

  return null;
}
