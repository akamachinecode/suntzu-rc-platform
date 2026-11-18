"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import type { Place } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FieldError, useFormFeedback } from "@/components/forms/feedback";
import { DISCIPLINE_LABELS, KIND_LABELS } from "@/lib/events";
import { type AddEventState, addEvent } from "./actions";

const select = "h-11 w-full min-w-0 rounded-md border-2 border-foreground bg-background px-3";

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
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormFeedback(state, formRef);
  // React only reads a select's (or a radio's) default when it mounts: these keys bring back the
  // choices after an error.
  const kind = form.value("kind") ?? "fly-in";
  const discipline = form.value("discipline") ?? "air";
  const place = form.value("place") ?? "";

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={form.onInput}
      noValidate
      className="grid grid-cols-1 gap-5 sm:grid-cols-2"
    >
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="add-name" className="font-semibold">
          Name
        </Label>
        <Input
          id="add-name"
          name="name"
          required
          defaultValue={form.value("name")}
          {...form.aria("name", { id: "add-name" })}
        />
        <FieldError id="add-name" errors={form.errors("name")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-kind" className="font-semibold">
          Kind
        </Label>
        <select key={kind} id="add-kind" name="kind" defaultValue={kind} className={select}>
          {Object.entries(KIND_LABELS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <fieldset key={discipline} className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">Discipline</legend>
        <div className="grid grid-cols-2 gap-x-4">
          {Object.entries(DISCIPLINE_LABELS).map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="discipline"
                value={value}
                defaultChecked={discipline === value}
                className="size-4 accent-foreground"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="add-start" className="font-semibold">
          First day
        </Label>
        <Input
          id="add-start"
          name="startDate"
          type="date"
          required
          defaultValue={form.value("startDate")}
          {...form.aria("startDate", { id: "add-start" })}
        />
        <FieldError id="add-start" errors={form.errors("startDate")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-end" className="font-semibold">
          Last day <span className="font-normal text-muted-foreground">(if more than one)</span>
        </Label>
        <Input
          id="add-end"
          name="endDate"
          type="date"
          defaultValue={form.value("endDate")}
          {...form.aria("endDate", { id: "add-end" })}
        />
        <FieldError id="add-end" errors={form.errors("endDate")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-place" className="font-semibold">
          Place on SunTzu RC
        </Label>
        <select key={place} id="add-place" name="place" defaultValue={place} className={select}>
          <option value="">Not listed — describe it</option>
          {places.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
              {item.city ? `, ${item.city}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-place-text" className="font-semibold">
          Or where, in words
        </Label>
        <Input
          id="add-place-text"
          name="placeText"
          placeholder="Orlando, FL"
          defaultValue={form.value("placeText")}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-url" className="font-semibold">
          Organiser&apos;s page
        </Label>
        <Input
          id="add-url"
          name="url"
          type="url"
          spellCheck={false}
          placeholder="https://"
          defaultValue={form.value("url")}
          {...form.aria("url", { id: "add-url" })}
        />
        <FieldError id="add-url" errors={form.errors("url")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="add-fee" className="font-semibold">
          Fee
        </Label>
        <Input
          id="add-fee"
          name="entryFee"
          placeholder="Landing fee $20"
          defaultValue={form.value("entryFee")}
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="add-summary" className="font-semibold">
          One line about it
        </Label>
        <Textarea
          id="add-summary"
          name="summary"
          rows={2}
          maxLength={600}
          defaultValue={form.value("summary")}
        />
      </div>
      <label className="flex items-center gap-3 sm:col-span-2">
        <input
          key={form.value("beginnerFriendly") ?? "unchecked"}
          type="checkbox"
          name="beginnerFriendly"
          defaultChecked={form.value("beginnerFriendly") === "on"}
          className="size-4 accent-foreground"
        />
        Welcomes beginners (trainers, buddy boxes, someone to help)
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Publishing…" : "Publish event"}
        </Button>
        {/* Always in the page, so screen readers announce the answer when it changes. */}
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
      </div>
    </form>
  );
}
