"use client";

import { useActionState } from "react";
import type { MemberProfile } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { DISCIPLINE_LABELS } from "@/lib/events";
import { type ProfileState, updateProfile } from "./actions";

const initial: ProfileState = { status: "idle" };

export function ProfileForm({ profile }: { profile: MemberProfile }) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  return (
    <form action={action} className="grid gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name" className="font-semibold">
            Your name <span className="font-normal text-muted-foreground">(only for emails)</span>
          </Label>
          <Input id="name" name="name" defaultValue={profile.name} autoComplete="name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="zip" className="font-semibold">
            Home ZIP code <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="zip"
            name="zip"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            defaultValue={profile.zip ?? ""}
            autoComplete="postal-code"
            aria-invalid={!!state.errors?.zip}
            aria-describedby="zip-help"
          />
          <p id="zip-help" className="text-sm text-muted-foreground">
            For &ldquo;near you&rdquo; in the weekly email. Never shown to anyone.
          </p>
          {state.errors?.zip?.map((error) => (
            <p key={error} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="radiusMiles" className="font-semibold">
          How far you&apos;d drive
        </Label>
        <select
          id="radiusMiles"
          name="radiusMiles"
          defaultValue={String(profile.radiusMiles)}
          className="h-11 max-w-xs rounded-md border-2 border-foreground bg-background px-3"
        >
          {[25, 60, 120, 200].map((miles) => (
            <option key={miles} value={miles}>
              Up to {miles} miles
            </option>
          ))}
        </select>
      </div>
      <fieldset className="grid gap-3">
        <legend className="mb-2 font-semibold">What you fly or drive</legend>
        <div className="flex flex-wrap gap-3">
          {Object.entries(DISCIPLINE_LABELS).map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2 rounded-md border-2 border-foreground bg-background px-3 py-2 has-checked:bg-primary"
            >
              <input
                type="checkbox"
                name="disciplines"
                value={value}
                defaultChecked={profile.disciplines.includes(value as never)}
                className="size-4 accent-foreground"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="mb-2 font-semibold">Emails</legend>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="changeAlerts"
            defaultChecked={profile.changeAlerts}
            className="mt-1 size-4 accent-foreground"
          />
          <span>
            <strong>Change alerts.</strong> One email when an event you follow or go to moves or is
            cancelled.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="weeklyDigest"
            defaultChecked={profile.weeklyDigest}
            className="mt-1 size-4 accent-foreground"
          />
          <span>
            <strong>This weekend near you.</strong> Every Thursday, what&apos;s on within your
            distance (needs your ZIP code).
          </span>
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state.message && (
          <p
            role="status"
            className={
              state.status === "error" ? "text-sm text-destructive" : "text-sm font-semibold"
            }
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
