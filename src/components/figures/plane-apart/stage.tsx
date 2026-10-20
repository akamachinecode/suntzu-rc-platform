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
        <div className="sticky top-16 mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl content-center gap-6 px-4 py-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)] lg:items-center lg:gap-10">
          <div>
            {intro}
            <ol
              className="mt-6 hidden gap-1 lg:grid"
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
                      "flex w-full items-baseline gap-3 rounded-md px-2 py-1 text-left font-semibold",
                      selected === asm ? "bg-primary" : "hover:bg-panel",
                    )}
                  >
                    <span className="w-6 text-sm font-black font-wide tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {NAMES[asm].name}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div>{figure}</div>
        </div>
      </section>
    </ApartContext.Provider>
  );
}
