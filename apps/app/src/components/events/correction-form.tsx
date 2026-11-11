"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { type CorrectionState, suggestCorrection } from "@/app/events/[slug]/actions";

/** Members suggest a correction; it waits for the crew next to the source. */
export function CorrectionForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CorrectionState, FormData>(
    suggestCorrection.bind(null, slug),
    { status: "idle" },
  );

  if (state.status === "sent") {
    return (
      <p role="status" className="font-semibold">
        {state.message}
      </p>
    );
  }
  if (state.status === "signed-out") {
    return (
      <p className="text-sm">
        <Link
          href={`/sign-in?next=/events/${slug}`}
          className="font-semibold underline underline-offset-4"
        >
          Sign in
        </Link>{" "}
        to suggest a correction, or{" "}
        <Link
          href="/contact?topic=correction"
          className="font-semibold underline underline-offset-4"
        >
          write to us
        </Link>
        .
      </p>
    );
  }
  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Suggest a correction
      </Button>
    );
  }
  const error = (name: string) =>
    state.errors?.[name]?.map((message) => (
      <p key={message} className="text-sm text-destructive">
        {message}
      </p>
    ));
  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="fix-start">Right first day</Label>
        <Input id="fix-start" name="startDate" type="date" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fix-end">Right last day</Label>
        <Input id="fix-end" name="endDate" type="date" />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="fix-url">Organiser&apos;s page</Label>
        <Input id="fix-url" name="url" type="url" placeholder="https://" />
      </div>
      <label className="flex items-center gap-3 sm:col-span-2">
        <input type="checkbox" name="cancelled" className="size-4 accent-foreground" />
        It&apos;s been cancelled
      </label>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="fix-note">What&apos;s wrong</Label>
        <Textarea id="fix-note" name="note" rows={3} required aria-invalid={!!state.errors?.note} />
        {error("note")}
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="fix-source">Where you saw it (link)</Label>
        <Input
          id="fix-source"
          name="sourceUrl"
          type="url"
          placeholder="https://"
          aria-invalid={!!state.errors?.sourceUrl}
        />
        {error("sourceUrl")}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send to the crew"}
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
