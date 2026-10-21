"use client";

import { useScroll, useTransform } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { COLUMN } from "@/components/guides/prose";
import { cn } from "@/lib/utils";
import { ApartContext } from "./context";
import type { ApartSpec } from "./spec";

const HEADER = 72; // the sticky site header plus a little air

/**
 * The article opener. Nothing is pinned: the machine comes apart during the first
 * scroll, while it rises from under the title to the top of the screen, and the
 * article text follows straight after it.
 */
export function ApartStage({
  figure,
  spec,
  label,
}: {
  figure: React.ReactNode;
  spec: ApartSpec;
  label: string;
}) {
  const track = useRef<HTMLElement>(null);
  // 0 at the top of the page, 1 once the figure's top reaches the header: the first scroll.
  const { scrollY } = useScroll();
  const travel = useRef(1);
  useLayoutEffect(() => {
    const measure = () => {
      const node = track.current;
      if (node)
        travel.current = Math.max(1, node.getBoundingClientRect().top + window.scrollY - HEADER);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const progress = useTransform(scrollY, (y) => Math.min(1, Math.max(0, y / travel.current)));
  const [selected, select] = useState<string | null>(null);
  const control = useMemo(() => ({ progress, selected, select }), [progress, selected]);

  return (
    <ApartContext.Provider value={control}>
      <section ref={track} aria-label={label}>
        <div className={cn(COLUMN, "flex flex-col pt-2 pb-12")}>
          {figure}
          <ol
            className="mt-5 hidden flex-wrap justify-center gap-0.5 lg:flex"
            aria-label="Assemblies, in the order they come off"
          >
            {spec.stagger.map((asm, index) => (
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
                  {spec.names[asm]?.name}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </ApartContext.Provider>
  );
}
