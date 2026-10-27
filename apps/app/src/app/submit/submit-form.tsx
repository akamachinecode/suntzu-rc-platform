"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { formatWhen } from "@/lib/events";
import { sendEvent, type SubmitState } from "./actions";

export function SubmitForm() {
  const [state, action, pending] = useActionState<SubmitState, FormData>(sendEvent, {
    status: "idle",
  });

  if (state.status === "signed-out") {
    return (
      <p className="text-lg">
        <Link href="/sign-in?next=/submit" className="font-semibold underline underline-offset-4">
          Sign in
        </Link>{" "}
        to send events, so we can credit you and tell you when it&apos;s live.
      </p>
    );
  }
  if (state.status === "done" && state.result) {
    const { outcome, events } = state.result;
    return (
      <div role="status" className="grid gap-4">
        <p className="text-2xl font-black font-wide">
          {outcome === "known"
            ? "We have it already."
            : outcome === "queued"
              ? "Got it, thanks!"
              : "Thanks, a person will read it."}
        </p>
        <p className="text-pretty">
          {outcome === "known"
            ? "It's on the calendar: your link counts as one more source that agrees."
            : outcome === "queued"
              ? "The crew checks it against the source and publishes it, usually within a day."
              : "We couldn't read it automatically, so it went to the crew's inbox. They'll add it by hand."}
        </p>
        {events.length ? (
          <ul className="grid gap-2">
            {events.map((event) => (
              <li
                key={`${event.name}-${event.startDate}`}
                className="rounded-md border-2 border-foreground bg-background px-3 py-2"
              >
                <strong>{event.name}</strong> ·{" "}
                {formatWhen({
                  startDate: event.startDate,
                  endDate: null,
                  datePrecision: "day",
                  dateText: null,
                })}
                {event.slug ? (
                  <>
                    {" · "}
                    <Link href={`/events/${event.slug}`} className="underline underline-offset-4">
                      See it
                    </Link>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          onClick={() => location.reload()}
        >
          Send another
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="submit-url" className="font-semibold">
          Link to the event
        </Label>
        <Input
          id="submit-url"
          name="url"
          type="url"
          placeholder="https://yourclub.org/events/fun-fly"
          aria-invalid={!!state.errors?.url}
        />
        {state.errors?.url?.map((error) => (
          <p key={error} className="text-sm text-destructive">
            {error}
          </p>
        ))}
      </div>
      <p className="text-center text-sm font-semibold">or</p>
      <div className="grid gap-2">
        <Label htmlFor="submit-text" className="font-semibold">
          Paste the flyer or the post
        </Label>
        <Textarea
          id="submit-text"
          name="text"
          rows={8}
          maxLength={8000}
          placeholder="Copy the text of the flyer, the Facebook post or the email: name, dates, place, fee…"
          aria-invalid={!!state.errors?.text}
        />
        <p className="text-sm text-muted-foreground">
          We keep the facts (name, dates, place, fee, link) and never personal phone numbers or
          emails.
        </p>
        {state.errors?.text?.map((error) => (
          <p key={error} className="text-sm text-destructive">
            {error}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Reading it…" : "Send the event"}
        </Button>
        {state.message ? (
          <p role="status" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
