"use client";

import { useActionState, useRef } from "react";
import type { OrganiserHost } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FieldError, FormStatus, useFormFeedback } from "@/components/forms/feedback";
import { DISCIPLINE_LABELS } from "@/lib/events";
import { type ClubState, saveClub } from "./actions";

export function ClubForm({ data }: { data: OrganiserHost }) {
  const [state, action, pending] = useActionState<ClubState, FormData>(
    saveClub.bind(null, data.host.slug),
    { status: "idle" },
  );
  const ref = useRef<HTMLFormElement>(null);
  const form = useFormFeedback(state, ref);
  // After a failed save the fields start from what was typed (spec 0010), else from the club.
  const typed = state.values;
  const disciplines = typed
    ? (typed.disciplines ?? "").split("\n")
    : (data.host.disciplines as string[]);
  return (
    <form ref={ref} action={action} onInput={form.onInput} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="club-summary" className="font-semibold">
          About the club, in a line or two
        </Label>
        <Textarea
          id="club-summary"
          name="summary"
          rows={3}
          maxLength={600}
          defaultValue={typed ? (typed.summary ?? "") : data.host.summary}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="club-url" className="font-semibold">
          Website
        </Label>
        <Input
          id="club-url"
          name="url"
          type="url"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          defaultValue={typed ? (typed.url ?? "") : (data.host.url ?? "")}
          {...form.aria("url", { id: "club-url" })}
        />
        <FieldError id="club-url" errors={form.errors("url")} />
      </div>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-2 font-semibold">What you fly or drive</legend>
        {Object.entries(DISCIPLINE_LABELS).map(([value, label]) => (
          <label
            key={value}
            className="flex items-center gap-2 rounded-md border-2 border-foreground bg-background px-3 py-2 has-checked:bg-primary"
          >
            <input
              type="checkbox"
              name="disciplines"
              value={value}
              defaultChecked={disciplines.includes(value)}
              className="size-4 accent-foreground"
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="acceptsNewcomers"
          defaultChecked={typed ? typed.acceptsNewcomers === "on" : data.host.acceptsNewcomers}
          className="mt-1 size-4 accent-foreground"
        />
        <span>
          <strong>We welcome newcomers.</strong> People who ask to try RC near you on SunTzu RC are
          sent to you.
        </span>
      </label>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <FormStatus message={state.message} error={state.status === "error"} />
      </div>
    </form>
  );
}
