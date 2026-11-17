"use client";

import { useActionState, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FieldError, FormStatus, StepHeading, useFormFeedback } from "@/components/forms/feedback";
import { Turnstile } from "@/components/turnstile";
import { DISCIPLINE_LABELS } from "@/lib/events";
import { askToTry, type TryState } from "./actions";

export function TryForm() {
  const [state, action, pending] = useActionState<TryState, FormData>(askToTry, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormFeedback(state, formRef);
  if (state.status === "done") {
    return (
      <div className="grid gap-3">
        <StepHeading className="text-2xl font-black font-wide">Sent.</StepHeading>
        <p className="text-pretty">
          {state.toCrew
            ? "No club near you has signed up for newcomers on SunTzu RC yet, so the crew got it: we'll find you a club, a track or a shop and write back within a few days."
            : `It went to ${state.sentTo?.join(", ")}. Their organisers will write to you by email.`}
        </p>
      </div>
    );
  }
  return (
    <form
      ref={formRef}
      action={action}
      onInput={form.onInput}
      className="grid grid-cols-1 gap-5 sm:grid-cols-2"
      noValidate
    >
      <div className="grid gap-2">
        <Label htmlFor="try-name" className="font-semibold">
          Your name
        </Label>
        <Input
          id="try-name"
          name="name"
          autoComplete="name"
          required
          defaultValue={form.value("name")}
          {...form.aria("name", { id: "try-name" })}
        />
        <FieldError id="try-name" errors={form.errors("name")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="try-email" className="font-semibold">
          Email
        </Label>
        <Input
          id="try-email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          required
          defaultValue={form.value("email")}
          {...form.aria("email", { id: "try-email" })}
        />
        <FieldError id="try-email" errors={form.errors("email")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="try-zip" className="font-semibold">
          ZIP code
        </Label>
        <Input
          id="try-zip"
          name="zip"
          inputMode="numeric"
          maxLength={5}
          autoComplete="postal-code"
          required
          defaultValue={form.value("zip")}
          {...form.aria("zip", { id: "try-zip" })}
        />
        <FieldError id="try-zip" errors={form.errors("zip")} />
      </div>
      {/* Four choices read better as radio buttons than as a dropdown (modern web guidance,
          forms/forms). The key brings back the choice after an error. */}
      <fieldset key={form.value("discipline") ?? "air"} className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">What you&apos;d like to try</legend>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DISCIPLINE_LABELS).map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="discipline"
                value={value}
                defaultChecked={(form.value("discipline") ?? "air") === value}
                className="size-4 accent-foreground"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="try-message" className="font-semibold">
          Anything they should know?{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="try-message"
          name="message"
          rows={3}
          maxLength={1000}
          placeholder="I've flown a simulator, I have a son who's 12, I'd like to start with a trainer…"
          defaultValue={form.value("message")}
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <label className="flex items-start gap-3">
          <input
            key={form.value("consent") ?? "unchecked"}
            id="try-consent"
            type="checkbox"
            name="consent"
            required
            defaultChecked={form.value("consent") === "on"}
            className="mt-1 size-4 accent-foreground"
            {...form.aria("consent", { id: "try-consent" })}
          />
          <span>
            I agree that SunTzu RC passes my name and email to the club (and only the club) so they
            can reply.
          </span>
        </label>
        <FieldError id="try-consent" errors={form.errors("consent")} />
      </div>
      <div className="sm:col-span-2">
        <Turnstile />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Find me a club"}
        </Button>
        <FormStatus message={state.message} error />
      </div>
    </form>
  );
}
