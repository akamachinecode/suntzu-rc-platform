"use client";

import { useSyncExternalStore } from "react";

const subscribe = (changed: () => void) => {
  window.addEventListener("scroll", changed, { passive: true });
  return () => window.removeEventListener("scroll", changed);
};
const isScrolled = () => window.scrollY > 8;
const onServer = () => false;

/**
 * The sticky site header. It sits flush with the page at the top, and only
 * draws its bottom rule once the page scrolls under it.
 */
export function SiteHeader({ children }: { children: React.ReactNode }) {
  const scrolled = useSyncExternalStore(subscribe, isScrolled, onServer);

  return (
    <header
      data-scrolled={scrolled ? "" : undefined}
      className="sticky top-0 z-50 border-b-2 border-transparent bg-background transition-colors duration-200 data-[scrolled]:border-foreground"
    >
      {children}
    </header>
  );
}
