"use client";

import type { RcEvent } from "@workspace/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DISCIPLINE_COLORS } from "@/lib/events";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const iso = (date: Date) => date.toISOString().slice(0, 10);

/** A month on one screen: every day an event runs, with its colour by discipline. */
export function MonthView({ events, today }: { events: RcEvent[]; today: string }) {
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const first = useMemo(() => new Date(`${month}-01T00:00:00Z`), [month]);
  const label = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(first);

  const days = useMemo(() => {
    const start = new Date(first);
    // Weeks start on Monday.
    start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + index);
      return iso(day);
    });
  }, [first]);

  const byDay = useMemo(() => {
    const map = new Map<string, RcEvent[]>();
    for (const event of events) {
      if (event.datePrecision !== "day") continue;
      const last = event.endDate ?? event.startDate;
      for (const day of days) {
        if (day >= event.startDate && day <= last) map.set(day, [...(map.get(day) ?? []), event]);
      }
    }
    return map;
  }, [events, days]);

  function shift(by: number) {
    const next = new Date(first);
    next.setUTCMonth(next.getUTCMonth() + by);
    setMonth(iso(next).slice(0, 7));
  }

  const undated = events.filter(
    (event) => event.datePrecision !== "day" && event.startDate.slice(0, 7) === month,
  );

  return (
    <section
      aria-label={`Calendar for ${label}`}
      className="rounded-xl border-2 border-foreground bg-panel p-4 shadow-hard sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="grid size-10 place-items-center rounded-md border-2 border-foreground bg-background shadow-hard-sm"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <h2 className="text-2xl font-black font-wide" aria-live="polite">
          {label}
        </h2>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="grid size-10 place-items-center rounded-md border-2 border-foreground bg-background shadow-hard-sm"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <div
        className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold"
        aria-hidden="true"
      >
        {WEEKDAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <ol className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const list = byDay.get(day) ?? [];
          const inMonth = day.startsWith(month);
          return (
            <li
              key={day}
              className={cn(
                "min-h-20 rounded-md border border-foreground/30 p-1 text-left sm:min-h-24",
                !inMonth && "opacity-40",
                day === today && "border-2 border-foreground bg-primary/30",
              )}
            >
              <p className="text-xs font-semibold">
                <span className="sr-only">{day}: </span>
                {Number(day.slice(8))}
              </p>
              <ul className="mt-1 grid gap-1">
                {list.slice(0, 3).map((event) => (
                  <li key={event.slug}>
                    <Link
                      href={`/events/${event.slug}`}
                      className={cn(
                        "block truncate rounded px-1 text-[0.7rem] leading-5 font-semibold sm:text-xs",
                        DISCIPLINE_COLORS[event.discipline],
                        event.status === "cancelled" && "line-through",
                      )}
                    >
                      {event.name}
                    </Link>
                  </li>
                ))}
                {list.length > 3 ? (
                  <li className="text-[0.7rem]">+{list.length - 3} more</li>
                ) : null}
              </ul>
            </li>
          );
        })}
      </ol>
      {undated.length ? (
        <p className="mt-4 text-sm text-pretty">
          Also usually this month, dates not announced yet:{" "}
          {undated.map((event, index) => (
            <span key={event.slug}>
              {index ? ", " : ""}
              <Link
                href={`/events/${event.slug}`}
                className="font-semibold underline underline-offset-4"
              >
                {event.name}
              </Link>
            </span>
          ))}
          .
        </p>
      ) : null}
    </section>
  );
}
