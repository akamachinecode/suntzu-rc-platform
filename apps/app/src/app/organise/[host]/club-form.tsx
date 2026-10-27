"use client";

import { useActionState } from "react";
import type { OrganiserHost } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { DISCIPLINE_LABELS } from "@/lib/events";
import { saveClub, type SimpleState } from "../actions";

export function ClubForm({ data }: { data: OrganiserHost }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(
    saveClub.bind(null, data.host.slug),
    {
      status: "idle",
    },
  );
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="club-summary" className="font-semibold">
          About the club, in a line or two
        </Label>
        <Textarea
          id="club-summary"
          name="summary"
          rows={3}
          maxLength={600}
          defaultValue={data.host.summary}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="club-url" className="font-semibold">
          Website
        </Label>
        <Input id="club-url" name="url" type="url" defaultValue={data.host.url ?? ""} />
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
              defaultChecked={data.host.disciplines.includes(value as never)}
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
          defaultChecked={data.host.acceptsNewcomers}
          className="mt-1 size-4 accent-foreground"
        />
        <span>
          <strong>We welcome newcomers.</strong> People who ask to try RC near you on Servo are sent
          to you.
        </span>
      </label>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state.message ? (
          <p role="status" className="text-sm font-semibold">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
