"use client";

import type { Discipline } from "@workspace/shared";
import { CalendarPlus, Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { DISCIPLINE_LABELS } from "@/lib/events";
import { SITE } from "@/lib/site";

const OPTIONS: Array<{ value: Discipline | "all"; label: string }> = [
  { value: "all", label: "Everything" },
  ...(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((value) => ({
    value,
    label: DISCIPLINE_LABELS[value],
  })),
];

/**
 * Subscribe to the calendar (all events or one discipline) in any calendar app. With `feed`, it
 * offers that one feed instead (a member's private calendar, a club's events).
 */
export function CalendarSubscribe({
  feed: fixedFeed,
  title = "Put the calendar in your phone",
  lead = "Subscribe once and new events, date changes and cancellations show up in your own calendar. Only events with announced dates are included.",
}: {
  feed?: string;
  title?: string;
  lead?: string;
}) {
  const [discipline, setDiscipline] = useState<Discipline | "all">("all");
  // "Copy link": done, or refused (the browser can deny the clipboard). Shown for 2 seconds.
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const feed = new URL(fixedFeed ?? "/events/calendar.ics", SITE.url);
  if (!fixedFeed && discipline !== "all") feed.searchParams.set("discipline", discipline);
  const webcal = feed.toString().replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(feed.toString());
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    timer.current = setTimeout(() => setCopied(null), 2000);
  }

  const button =
    "inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-foreground px-4 py-2 text-sm font-semibold shadow-hard-sm";

  return (
    <section
      aria-labelledby="subscribe-title"
      className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard sm:p-8"
    >
      <h2 id="subscribe-title" className="text-2xl font-black font-wide">
        {title}
      </h2>
      <p className="mt-2 max-w-[60ch] text-pretty">{lead}</p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className={fixedFeed ? "hidden" : "grid gap-1 text-sm font-semibold"}>
          Which events
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline | "all")}
            className="h-11 rounded-md border-2 border-foreground bg-background px-3"
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
          {copied === "done" ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copied === "done" ? "Link copied" : copied === "failed" ? "Couldn't copy" : "Copy link"}
        </button>
        {/* Outside the button: a button's content isn't announced reliably when it changes
            (modern web guidance, ui-components/copy-button). */}
        <p role="status" className="sr-only">
          {copied === "done"
            ? "Link copied"
            : copied === "failed"
              ? `Couldn't copy. The link is ${feed.toString()}`
              : ""}
        </p>
      </div>
    </section>
  );
}
