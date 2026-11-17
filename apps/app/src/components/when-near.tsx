"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts its children only when they come within 200 px of the visible area. For heavy things
 * a visitor may never scroll to, such as a map below the fold on a phone (modern web guidance,
 * performance/performance: load what's needed, when it's needed). Until then, the placeholder
 * keeps their place.
 */
export function WhenNear({
  children,
  placeholder,
}: {
  children: ReactNode;
  placeholder: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        watch.disconnect();
      },
      // Close enough that it's usually ready when it scrolls in, far enough that a visitor who
      // never scrolls there doesn't download it.
      { rootMargin: "200px 0px" },
    );
    watch.observe(element);
    return () => watch.disconnect();
  }, []);
  return near ? children : <div ref={box}>{placeholder}</div>;
}
