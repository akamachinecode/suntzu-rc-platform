"use client";

import { useActionState, useState } from "react";
import type { Host } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { type ClaimState, startClaim } from "./actions";

const select = "h-11 w-full rounded-md border-2 border-foreground bg-background px-3";

/** Claim a club or track: by an email at its domain, a code on its website, or the crew's check. */
export function ClaimForm({ hosts, preselected }: { hosts: Host[]; preselected?: string }) {
  const [method, setMethod] = useState<"domain-email" | "website-code" | "crew">("domain-email");
  const [state, action, pending] = useActionState<ClaimState, FormData>(startClaim, {
    status: "idle",
  });

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="claim-host" className="font-semibold">
          Your club or track
        </Label>
        <select
          id="claim-host"
          name="host"
          required
          defaultValue={preselected ?? ""}
          className={select}
        >
          <option value="" disabled>
            Choose it
          </option>
          {hosts.map((host) => (
            <option key={host.slug} value={host.slug}>
              {host.name}
              {host.city ? ` (${host.city})` : ""}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          Not on the list?{" "}
          <a href="/contact?topic=event" className="underline underline-offset-4">
            Tell us
          </a>{" "}
          and we&apos;ll add it.
        </p>
      </div>
      <fieldset className="grid gap-3">
        <legend className="mb-1 font-semibold">How you&apos;ll prove you run it</legend>
        {(
          [
            [
              "domain-email",
              "An email at the club's own domain",
              "We send a code to an address like secretary@yourclub.org.",
            ],
            [
              "website-code",
              "A code on the club's website",
              "You put a short code on your home page, or in a file at yourclub.org/servo.txt.",
            ],
            [
              "crew",
              "Ask the crew to check",
              "For clubs on Facebook or a shared site: tell us your role and we check by hand.",
            ],
          ] as const
        ).map(([value, title, detail]) => (
          <label
            key={value}
            className="flex items-start gap-3 rounded-md border-2 border-foreground bg-background p-3 has-checked:bg-primary"
          >
            <input
              type="radio"
              name="method"
              value={value}
              checked={method === value}
              onChange={() => setMethod(value)}
              className="mt-1 size-4 accent-foreground"
            />
            <span>
              <strong>{title}.</strong> {detail}
            </span>
          </label>
        ))}
      </fieldset>
      {method === "domain-email" ? (
        <div className="grid gap-2">
          <Label htmlFor="claim-email" className="font-semibold">
            Address at the club&apos;s domain
          </Label>
          <Input
            id="claim-email"
            name="email"
            type="email"
            required
            placeholder="secretary@yourclub.org"
          />
        </div>
      ) : null}
      {method === "crew" ? (
        <div className="grid gap-2">
          <Label htmlFor="claim-note" className="font-semibold">
            Your role and how we can check
          </Label>
          <Textarea
            id="claim-note"
            name="note"
            rows={3}
            required
            placeholder="I'm the club president; our Facebook page is…"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Claim it"}
        </Button>
        {state.message ? (
          <p
            role="status"
            className={
              state.status === "error" ? "text-sm text-destructive" : "text-sm font-semibold"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
