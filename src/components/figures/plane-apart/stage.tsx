"use client";

import { useScroll, useTransform } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ApartContext } from "./context";
import { NAMES, STAGGER, type Assembly } from "./model";

/**
 * The article opener: the headline and the assembly list stay pinned while the
 * page scrolls, and the scroll takes the plane apart.
 */
export function PlaneApartStage({
  intro,
  figure,
}: {
  intro: React.ReactNode;
  figure: React.ReactNode;
}) {
  const track = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  // Hold assembled for the first bit of scroll and fully apart for the last bit.
  const progress = useTransform(scrollYProgress, [0.06, 0.82], [0, 1], { clamp: true });
  const [selected, select] = useState<Assembly | null>(null);
  const control = useMemo(() => ({ progress, selected, select }), [progress, selected]);

  return (
    <ApartContext.Provider value={control}>
      <section ref={track} aria-label="The RC plane, taken apart" className="relative h-[240vh]">
        <div className="sticky top-16 mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl flex-col items-center justify-center px-4 py-6 text-center">
          {intro}
          {/* The figure's width follows the screen's height, so title, plane and list always fit. */}
          <div className="mt-2 w-full max-w-[min(60rem,66dvh)]">{figure}</div>
          <ol
            className="mt-4 hidden flex-wrap justify-center gap-0.5 lg:flex"
            aria-label="Assemblies, in the order they come off"
          >
            {STAGGER.map((asm, index) => (
              <li key={asm}>
                <button
                  type="button"
                  aria-pressed={selected === asm}
                  onPointerEnter={() => select(asm)}
                  onPointerLeave={() => select(null)}
                  onFocus={() => select(asm)}
                  onBlur={() => select(null)}
                  className={cn(
                    "flex items-baseline gap-1.5 rounded-md border-2 px-2 py-1 text-sm font-semibold transition-colors",
                    selected === asm
                      ? "border-foreground bg-primary"
                      : "border-transparent hover:border-foreground",
                  )}
                >
                  <span className="text-xs font-black font-wide tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {NAMES[asm].name}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </ApartContext.Provider>
  );
}
