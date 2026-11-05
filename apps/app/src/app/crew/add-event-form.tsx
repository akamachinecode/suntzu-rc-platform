"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Place } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { DISCIPLINE_LABELS, KIND_LABELS } from "@/lib/events";
import { type AddEventState, addEvent } from "./actions";

const select = "h-11 rounded-md border-2 border-foreground bg-background px-3";

/**
 * Add an event by hand (from a flyer, a Facebook post, an email). It's published at once; when
 * the engine later finds it on the web, it links to this one.
 */
export function AddEventForm({
  places,
  action = addEvent,
}: {
  places: Place[];
  action?: typeof addEvent;
}) {
  const [state, formAction, pending] = useActionState<AddEventState, FormData>(action, {
    status: "idle",
  });
  const error = (name: string) =>
    state.errors?.[name]?.map((message) => (
      <p key={message} className="text-sm text-destructive">
        {message}
      </p>
    ));

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="add-name" className="font-semibold">
          Name
        </Label>
        <Input id="add-name" name="name" required aria-invalid={!!state.errors?.name} />
        {error("name")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-kind" className="font-semibold">
          Kind
        </Label>
        <select id="add-kind" name="kind" defaultValue="fly-in" className={select}>
          {Object.entries(KIND_LABELS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-discipline" className="font-semibold">
          Discipline
        </Label>
        <select id="add-discipline" name="discipline" defaultValue="air" className={select}>
          {Object.entries(DISCIPLINE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-start" className="font-semibold">
          First day
        </Label>
        <Input
          id="add-start"
          name="startDate"
          type="date"
          required
          aria-invalid={!!state.errors?.startDate}
        />
        {error("startDate")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-end" className="font-semibold">
          Last day <span className="font-normal text-muted-foreground">(if more than one)</span>
        </Label>
        <Input id="add-end" name="endDate" type="date" aria-invalid={!!state.errors?.endDate} />
        {error("endDate")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-place" className="font-semibold">
          Place on SunTzu RC
        </Label>
        <select id="add-place" name="place" defaultValue="" className={select}>
          <option value="">Not listed — describe it</option>
          {places.map((place) => (
            <option key={place.slug} value={place.slug}>
              {place.name}
              {place.city ? `, ${place.city}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-place-text" className="font-semibold">
          Or where, in words
        </Label>
        <Input id="add-place-text" name="placeText" placeholder="Orlando, FL" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-url" className="font-semibold">
          Organiser&apos;s page
        </Label>
        <Input
          id="add-url"
          name="url"
          type="url"
          placeholder="https://"
          aria-invalid={!!state.errors?.url}
        />
        {error("url")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-fee" className="font-semibold">
          Fee
        </Label>
        <Input id="add-fee" name="entryFee" placeholder="Landing fee $20" />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="add-summary" className="font-semibold">
          One line about it
        </Label>
        <Textarea id="add-summary" name="summary" rows={2} maxLength={600} />
      </div>
      <label className="flex items-center gap-3 sm:col-span-2">
        <input type="checkbox" name="beginnerFriendly" className="size-4 accent-foreground" />
        Welcomes beginners (trainers, buddy boxes, someone to help)
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Publishing…" : "Publish event"}
        </Button>
        {state.message ? (
          <p
            role="status"
            className={
              state.status === "error" ? "text-sm text-destructive" : "text-sm font-semibold"
            }
          >
            {state.message}{" "}
            {state.slug ? (
              <Link href={`/events/${state.slug}`} className="underline underline-offset-4">
                See it
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </form>
  );
}
