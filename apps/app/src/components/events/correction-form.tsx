"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { type CorrectionState, suggestCorrection } from "@/app/events/[slug]/actions";
import { FieldError, FormStatus, StepHeading, useFormFeedback } from "@/components/forms/feedback";

/** Members suggest a correction; it waits for the crew next to the source. */
export function CorrectionForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CorrectionState, FormData>(
    suggestCorrection.bind(null, slug),
    { status: "idle" },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormFeedback(state, formRef);

  // The button that opened the form is gone: carry on in its first field instead of the top of
  // the page.
  useEffect(() => {
    if (open) formRef.current?.querySelector<HTMLElement>("input, textarea")?.focus();
  }, [open]);

  if (state.status === "sent") {
    return (
      <StepHeading as="p" className="font-semibold">
        {state.message}
      </StepHeading>
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
  return (
    <form
      ref={formRef}
      action={action}
      onInput={form.onInput}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <div className="grid gap-2">
        <Label htmlFor="fix-start">Right first day</Label>
        <Input
          id="fix-start"
          name="startDate"
          type="date"
          defaultValue={form.value("startDate")}
          {...form.aria("startDate", { id: "fix-start" })}
        />
        <FieldError id="fix-start" errors={form.errors("startDate")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fix-end">Right last day</Label>
        <Input
          id="fix-end"
          name="endDate"
          type="date"
          defaultValue={form.value("endDate")}
          {...form.aria("endDate", { id: "fix-end" })}
        />
        <FieldError id="fix-end" errors={form.errors("endDate")} />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="fix-url">Organiser&apos;s page</Label>
        <Input
          id="fix-url"
          name="url"
          type="url"
          spellCheck={false}
          placeholder="https://"
          defaultValue={form.value("url")}
          {...form.aria("url", { id: "fix-url" })}
        />
        <FieldError id="fix-url" errors={form.errors("url")} />
      </div>
      <label className="flex items-center gap-3 sm:col-span-2">
        <input
          key={form.value("cancelled") ?? "unchecked"}
          type="checkbox"
          name="cancelled"
          defaultChecked={form.value("cancelled") === "on"}
          className="size-4 accent-foreground"
        />
        It&apos;s been cancelled
      </label>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="fix-note">What&apos;s wrong</Label>
        <Textarea
          id="fix-note"
          name="note"
          rows={3}
          required
          defaultValue={form.value("note")}
          {...form.aria("note", { id: "fix-note" })}
        />
        <FieldError id="fix-note" errors={form.errors("note")} />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="fix-source">Where you saw it (link)</Label>
        <Input
          id="fix-source"
          name="sourceUrl"
          type="url"
          spellCheck={false}
          placeholder="https://"
          defaultValue={form.value("sourceUrl")}
          {...form.aria("sourceUrl", { id: "fix-source" })}
        />
        <FieldError id="fix-source" errors={form.errors("sourceUrl")} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send to the crew"}
        </Button>
        <FormStatus message={state.message} error />
      </div>
    </form>
  );
}
