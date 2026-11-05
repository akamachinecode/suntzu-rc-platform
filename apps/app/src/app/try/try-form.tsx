"use client";

import { useActionState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Turnstile } from "@/components/turnstile";
import { DISCIPLINE_LABELS } from "@/lib/events";
import { askToTry, type TryState } from "./actions";

export function TryForm() {
  const [state, action, pending] = useActionState<TryState, FormData>(askToTry, { status: "idle" });
  if (state.status === "done") {
    return (
      <div role="status" className="grid gap-3">
        <p className="text-2xl font-black font-wide">Sent.</p>
        <p className="text-pretty">
          {state.toCrew
            ? "No club near you has signed up for newcomers on SunTzu RC yet, so the crew got it: we'll find you a club, a track or a shop and write back within a few days."
            : `It went to ${state.sentTo?.join(", ")}. Their organisers will write to you by email.`}
        </p>
      </div>
    );
  }
  const error = (name: string) =>
    state.errors?.[name]?.map((message) => (
      <p key={message} className="text-sm text-destructive">
        {message}
      </p>
    ));
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="try-name" className="font-semibold">
          Your name
        </Label>
        <Input
          id="try-name"
          name="name"
          autoComplete="name"
          required
          aria-invalid={!!state.errors?.name}
        />
        {error("name")}
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
          required
          aria-invalid={!!state.errors?.email}
        />
        {error("email")}
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
          aria-invalid={!!state.errors?.zip}
        />
        {error("zip")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="try-discipline" className="font-semibold">
          What you&apos;d like to try
        </Label>
        <select
          id="try-discipline"
          name="discipline"
          defaultValue="air"
          className="h-11 rounded-md border-2 border-foreground bg-background px-3"
        >
          {Object.entries(DISCIPLINE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
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
        />
      </div>
      <label className="flex items-start gap-3 sm:col-span-2">
        <input
          type="checkbox"
          name="consent"
          className="mt-1 size-4 accent-foreground"
          aria-invalid={!!state.errors?.consent}
        />
        <span>
          I agree that SunTzu RC passes my name and email to the club (and only the club) so they
          can reply.
        </span>
      </label>
      <div className="sm:col-span-2">{error("consent")}</div>
      <div className="sm:col-span-2">
        <Turnstile />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Find me a club"}
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
