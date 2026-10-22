"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { RcEvent } from "@workspace/shared";
import { DISCIPLINE_COLORS, formatWhen, formatWhere, KIND_LABELS } from "@/lib/events";
import { cn } from "@/lib/utils";

// The lanyard's colour is the discipline's: sky for planes, yellow for helicopters, red for cars.
const LANYARD = DISCIPLINE_COLORS;
const TILT = [-3, 2, -1.5];

/** Upcoming events as pit passes hanging off pegs on the workshop pegboard. */
export function PitPasses({ events }: { events: RcEvent[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-14">
      {events.map((event, index) => {
        const [date, year] = formatWhen(event).split(", ");
        const tilt = TILT[index % TILT.length] ?? 0;
        return (
          <li key={event.slug} className="w-72">
            <motion.div
              className="flex origin-top flex-col items-center"
              initial={reduce ? false : { rotate: tilt + (index % 2 === 0 ? 16 : -16) }}
              whileInView={{ rotate: tilt }}
              whileHover={
                reduce
                  ? undefined
                  : { rotate: tilt - 4, transition: { type: "spring", stiffness: 260, damping: 6 } }
              }
              viewport={{ once: true, amount: 0.5 }}
              transition={{ type: "spring", stiffness: 110, damping: 6, delay: index * 0.12 }}
            >
              {/* peg, lanyard and clip */}
              <span
                aria-hidden="true"
                className="relative z-10 size-5 rounded-full border-2 border-foreground bg-panel"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "-mt-1.5 h-14 w-5 border-x-2 border-foreground",
                  LANYARD[event.discipline],
                )}
              />
              <span
                aria-hidden="true"
                className="-mt-0.5 h-4 w-10 rounded-sm border-2 border-foreground bg-muted-foreground"
              />

              <Link
                href={`/events/${event.slug}`}
                className="group relative -mt-1 block w-full rounded-xl border-2 border-foreground bg-panel text-center text-foreground shadow-hard-lg"
              >
                {/* the slot the clip goes through */}
                <span
                  aria-hidden="true"
                  className="absolute top-3 left-1/2 h-3 w-14 -translate-x-1/2 rounded-full border-2 border-foreground bg-muted"
                />
                <span
                  className={cn(
                    "mt-9 block border-y-2 border-foreground py-1.5 text-xs font-black tracking-[0.25em] uppercase",
                    LANYARD[event.discipline],
                  )}
                >
                  {KIND_LABELS[event.kind].label}
                </span>
                <div className="px-5 pt-5">
                  <span className="block text-4xl leading-none font-black font-wide">{date}</span>
                  {year ? (
                    <span className="mt-1.5 block text-sm font-bold text-muted-foreground">
                      {year}
                    </span>
                  ) : null}
                  <h3 className="mt-4 text-lg leading-tight font-bold text-balance group-hover:underline">
                    {event.name}
                  </h3>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {formatWhere(event)}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="mx-8 my-5 block h-8 bg-[repeating-linear-gradient(90deg,var(--foreground)_0_3px,transparent_3px_5px,var(--foreground)_5px_6px,transparent_6px_10px,var(--foreground)_10px_12px,transparent_12px_13px)]"
                />
              </Link>
            </motion.div>
          </li>
        );
      })}
    </ul>
  );
}
