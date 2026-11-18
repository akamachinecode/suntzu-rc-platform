"use client";

import { useActionState, useRef } from "react";
import type { MemberProfile } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { FieldError, FormStatus, useFormFeedback } from "@/components/forms/feedback";
import { DISCIPLINE_LABELS } from "@/lib/events";
import { type ProfileState, updateProfile } from "./actions";

const initial: ProfileState = { status: "idle" };

export function ProfileForm({ profile }: { profile: MemberProfile }) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormFeedback(state, formRef);
  // After an error the form shows what was chosen; otherwise what's saved. An unticked box isn't
  // sent, so with typed values a missing name means "off". The keys remount the choices with them.
  const typed = state.values;
  const radius = typed?.radiusMiles ?? String(profile.radiusMiles);
  const disciplines = typed ? (typed.disciplines?.split("\n") ?? []) : profile.disciplines;
  const changeAlerts = typed ? typed.changeAlerts === "on" : profile.changeAlerts;
  const weeklyDigest = typed ? typed.weeklyDigest === "on" : profile.weeklyDigest;
  const choices = typed ? `typed-${disciplines.join()}-${changeAlerts}-${weeklyDigest}` : "saved";

  return (
    <form ref={formRef} action={action} onInput={form.onInput} className="grid gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name" className="font-semibold">
            Your name <span className="font-normal text-muted-foreground">(only for emails)</span>
          </Label>
          <Input
            id="name"
            name="name"
            defaultValue={typed?.name ?? profile.name}
            autoComplete="name"
            {...form.aria("name")}
          />
          <FieldError id="name" errors={form.errors("name")} />
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
            defaultValue={typed?.zip ?? profile.zip ?? ""}
            autoComplete="postal-code"
            {...form.aria("zip", { hint: "zip-help" })}
          />
          <p id="zip-help" className="text-sm text-muted-foreground">
            For &ldquo;near you&rdquo; in the weekly email. Never shown to anyone.
          </p>
          <FieldError id="zip" errors={form.errors("zip")} />
        </div>
      </div>
      {/* Four choices read better as radio buttons than as a dropdown (modern web guidance,
          forms/forms). */}
      <fieldset key={`radius-${radius}`} className="grid gap-3">
        <legend className="mb-2 font-semibold">How far you&apos;d drive</legend>
        <div className="flex flex-wrap gap-3">
          {[25, 60, 120, 200].map((miles) => (
            <label
              key={miles}
              className="flex items-center gap-2 rounded-md border-2 border-foreground bg-background px-3 py-2 has-checked:bg-primary"
            >
              <input
                type="radio"
                name="radiusMiles"
                value={miles}
                defaultChecked={radius === String(miles)}
                className="size-4 accent-foreground"
              />
              Up to {miles} miles
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset key={`disciplines-${choices}`} className="grid gap-3">
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
                defaultChecked={(disciplines as string[]).includes(value)}
                className="size-4 accent-foreground"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset key={`emails-${choices}`} className="grid gap-3">
        <legend className="mb-2 font-semibold">Emails</legend>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="changeAlerts"
            defaultChecked={changeAlerts}
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
            defaultChecked={weeklyDigest}
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
        <FormStatus message={state.message} error={state.status === "error"} />
      </div>
    </form>
  );
}
