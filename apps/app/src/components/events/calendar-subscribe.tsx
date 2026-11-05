"use client";

import type { Discipline } from "@workspace/shared";
import { CalendarPlus, Check, Copy } from "lucide-react";
import { useState } from "react";
import { DISCIPLINE_LABELS } from "@/lib/events";
import { SITE } from "@/lib/site";

const OPTIONS: Array<{ value: Discipline | "all"; label: string }> = [
  { value: "all", label: "Everything" },
  ...(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((value) => ({
    value,
    label: DISCIPLINE_LABELS[value],
  })),
];

/** Subscribe to the calendar (all events or one discipline) in any calendar app. */
export function CalendarSubscribe() {
  const [discipline, setDiscipline] = useState<Discipline | "all">("all");
  const [copied, setCopied] = useState(false);

  const feed = new URL("/events/calendar.ics", SITE.url);
  if (discipline !== "all") feed.searchParams.set("discipline", discipline);
  const webcal = feed.toString().replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;

  async function copy() {
    await navigator.clipboard.writeText(feed.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const button =
    "inline-flex items-center gap-2 rounded-md border-2 border-foreground px-4 py-2 text-sm font-semibold shadow-hard-sm";

  return (
    <section
      aria-labelledby="subscribe-title"
      className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard sm:p-8"
    >
      <h2 id="subscribe-title" className="text-2xl font-black font-wide">
        Put the calendar in your phone
      </h2>
      <p className="mt-2 max-w-[60ch] text-pretty">
        Subscribe once and new events, date changes and cancellations show up in your own calendar.
        Only events with announced dates are included.
      </p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          Which events
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline | "all")}
            className="rounded-md border-2 border-foreground bg-background px-3 py-2"
          >
            {OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <a href={webcal} className={`${button} bg-primary`}>
          <CalendarPlus aria-hidden className="size-4" />
          Apple or Outlook
        </a>
        <a href={google} target="_blank" rel="noreferrer" className={`${button} bg-panel`}>
          Google Calendar
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <button type="button" onClick={copy} className={`${button} bg-panel`}>
          {copied ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
        </button>
      </div>
    </section>
  );
}
