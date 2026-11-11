"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import type { CrewReview } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { formatWhen } from "@/lib/events";
import { correct, type CorrectState, decide } from "./actions";
import { readEvidence, readValue } from "./format";

const KIND_TITLES: Record<CrewReview["kind"], string> = {
  "new-event": "New event",
  merge: "Same event?",
  change: "Something changed",
  disappeared: "Gone from its source",
  "new-source": "New source",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  startDate: "First day",
  endDate: "Last day",
  placeText: "Where",
  url: "Page",
  entryFee: "Fee",
  summary: "Summary",
  kind: "Kind",
  discipline: "Discipline",
  cancelled: "Cancelled",
  status: "Status",
  datePrecision: "Date precision",
  dateText: "Date text",
};

/** The source's exact words behind one field, folded away until asked for. */
function SourceWords({ text }: { text: string }) {
  const evidence = readEvidence(text);
  return (
    <details className="group mt-1.5">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-muted-foreground underline underline-offset-4 pointer-fine:min-h-0 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Source&apos;s words</span>
        <span className="hidden group-open:inline">Hide the source&apos;s words</span>
      </summary>
      {"lines" in evidence ? (
        <dl className="mt-2 grid gap-1 rounded-md border-2 border-dashed border-foreground/30 p-2 text-xs">
          {evidence.lines.map(([path, value], index) => (
            <div
              key={`${path}-${index}`}
              className="grid gap-x-2 sm:grid-cols-[minmax(0,10rem)_1fr]"
            >
              <dt className="text-muted-foreground">{path}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <q className="mt-2 block rounded-md border-2 border-dashed border-foreground/30 p-2 text-xs break-words">
          {evidence.text}
        </q>
      )}
    </details>
  );
}

/** One review: what the source said (with its exact words) next to what we publish today. */
export function ReviewCard({ review }: { review: CrewReview }) {
  const [pending, startTransition] = useTransition();
  const [correcting, setCorrecting] = useState(false);
  const [state, action, saving] = useActionState<CorrectState, FormData>(
    correct.bind(null, review.id),
    { status: "idle" },
  );
  const fields = review.sighting?.fields;
  const evidence = review.sighting?.evidence ?? {};
  const proposal = Object.entries(review.proposal).filter(([key]) => key !== "score");

  return (
    <article className="grid gap-5 rounded-xl border-2 border-foreground bg-panel p-5 shadow-hard sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-xl font-black font-wide">
          {KIND_TITLES[review.kind]}
          {review.fromMember ? (
            <span className="ml-2 rounded-md bg-sky px-2 py-0.5 align-middle text-xs font-semibold">
              From a member
            </span>
          ) : null}
        </h3>
        <p className="text-sm text-muted-foreground">{review.note}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {fields ? (
          <section
            aria-label="What the source says"
            className="rounded-lg border-2 border-foreground bg-background p-4"
          >
            <p className="text-xs font-semibold tracking-wide uppercase">
              {review.source?.name ?? "Source"} says
            </p>
            <dl className="mt-3 grid gap-2 text-sm">
              {Object.entries(fields).map(([key, value]) => (
                <div key={key} className="grid gap-x-2 gap-y-0.5 sm:grid-cols-[7rem_1fr]">
                  <dt className="font-semibold">{FIELD_LABELS[key] ?? key}</dt>
                  <dd className="break-words">
                    {readValue(key, value)}
                    {evidence[key as keyof typeof evidence] ? (
                      <SourceWords text={evidence[key as keyof typeof evidence]!} />
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
            {review.source?.url ? (
              <a
                href={review.source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"
              >
                Open the source <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
          </section>
        ) : null}

        <section
          aria-label="What we publish"
          className="rounded-lg border-2 border-foreground bg-background p-4"
        >
          <p className="text-xs font-semibold tracking-wide uppercase">
            {review.event?.published ? "Published today" : "Waiting, not public"}
          </p>
          {review.event ? (
            <>
              <p className="mt-3 text-lg font-bold">
                <Link
                  href={`/events/${review.event.slug}`}
                  className="underline-offset-4 hover:underline"
                >
                  {review.event.name}
                </Link>
              </p>
              <p className="text-sm">
                {formatWhen({ ...review.event, dateText: null })} · {review.event.status}
                {review.event.place ? ` · ${review.event.place}` : ""}
                {review.event.host ? ` · ${review.event.host}` : ""}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm">No event yet.</p>
          )}
          {proposal.length ? (
            <dl className="mt-4 grid gap-1 text-sm">
              <p className="font-semibold">Proposed change</p>
              {proposal.map(([key, value]) => (
                <div key={key} className="grid grid-cols-[7rem_1fr] gap-2">
                  <dt>{FIELD_LABELS[key] ?? key}</dt>
                  <dd className="font-semibold break-words">{readValue(key, value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={pending}
          onClick={() => startTransition(() => decide(review.id, "approve"))}
        >
          {review.kind === "merge"
            ? "Same event: merge"
            : review.kind === "new-event"
              ? "Publish"
              : "Apply"}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => setCorrecting((value) => !value)}
        >
          Correct
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(() => decide(review.id, "reject"))}
        >
          {review.kind === "merge"
            ? "Different events"
            : review.kind === "new-event"
              ? "Not an RC event"
              : "Ignore"}
        </Button>
      </div>

      {correcting ? (
        <form
          action={action}
          className="grid grid-cols-1 gap-4 rounded-lg border-2 border-dashed border-foreground p-4 sm:grid-cols-2"
        >
          <div className="grid gap-1">
            <Label htmlFor={`name-${review.id}`}>Name</Label>
            <Input
              id={`name-${review.id}`}
              name="name"
              defaultValue={review.event?.name ?? fields?.name ?? ""}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`status-${review.id}`}>Status</Label>
            <select
              id={`status-${review.id}`}
              name="status"
              defaultValue=""
              className="h-11 rounded-md border-2 border-foreground bg-background px-3"
            >
              <option value="">Keep</option>
              <option value="announced">Announced</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`start-${review.id}`}>First day</Label>
            <Input
              id={`start-${review.id}`}
              name="startDate"
              type="date"
              defaultValue={fields?.startDate ?? review.event?.startDate ?? ""}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`end-${review.id}`}>Last day</Label>
            <Input
              id={`end-${review.id}`}
              name="endDate"
              type="date"
              defaultValue={fields?.endDate ?? review.event?.endDate ?? ""}
            />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor={`url-${review.id}`}>Organiser&apos;s page</Label>
            <Input
              id={`url-${review.id}`}
              name="url"
              type="url"
              defaultValue={fields?.url ?? review.event?.url ?? ""}
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save and close"}
            </Button>
            {state.message ? (
              <p role="status" className="text-sm text-destructive">
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    </article>
  );
}
