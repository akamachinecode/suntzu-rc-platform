"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { OrganiserHost } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { formatWhen } from "@/lib/events";
import { quickEdit } from "../actions";

type Event = OrganiserHost["events"][number];

/** One of the club's events, with the changes organisers make most. */
export function EventRow({ host, event }: { host: string; event: Event }) {
  const [pending, start] = useTransition();
  const [results, setResults] = useState(event.resultsUrl ?? "");
  const cancelled = event.status === "cancelled";
  return (
    <li className="grid gap-3 rounded-xl border-2 border-foreground bg-panel p-5 shadow-hard-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p>
          <Link
            href={`/events/${event.slug}`}
            className="text-lg font-bold underline-offset-4 hover:underline"
          >
            {event.name}
          </Link>{" "}
          <span className={cancelled ? "line-through" : ""}>{formatWhen(event)}</span>
        </p>
        <p className="text-sm font-semibold">
          {event.going} going · {event.following} following
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant={event.beginnerFriendly ? "default" : "outline"}
          aria-pressed={event.beginnerFriendly}
          disabled={pending}
          onClick={() =>
            start(() => quickEdit(host, event.slug, { beginnerFriendly: !event.beginnerFriendly }))
          }
        >
          Beginners welcome
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(() =>
              quickEdit(host, event.slug, { status: cancelled ? "confirmed" : "cancelled" }),
            )
          }
        >
          {cancelled ? "Not cancelled after all" : "Cancel it"}
        </Button>
        <form
          className="flex flex-wrap items-center gap-2"
          action={() => start(() => quickEdit(host, event.slug, { resultsUrl: results || null }))}
        >
          <label className="sr-only" htmlFor={`results-${event.slug}`}>
            Results link
          </label>
          <Input
            id={`results-${event.slug}`}
            type="url"
            placeholder="Results link (after the event)"
            value={results}
            onChange={(change) => setResults(change.target.value)}
            className="h-9 w-64"
          />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Save
          </Button>
        </form>
      </div>
      {!event.byOrganiser ? (
        <p className="text-xs text-muted-foreground">
          Found on the web by the engine; your changes take priority.
        </p>
      ) : null}
    </li>
  );
}
