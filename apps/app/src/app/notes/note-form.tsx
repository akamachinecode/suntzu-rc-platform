"use client";

import { useActionState, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FieldError, FormStatus, useFormFeedback } from "@/components/forms/feedback";
import { createNote, type NoteFormState } from "./actions";

const initialState: NoteFormState = { status: "idle" };

// The pattern every form follows (spec 0010): values kept after an error, errors linked to their
// field, focus on the first error, and an answer that screen readers announce.
export function NoteForm() {
  const [state, formAction, pending] = useActionState(createNote, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormFeedback(state, formRef);

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={form.onInput}
      className="grid gap-4"
      noValidate
    >
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={form.value("title")}
          {...form.aria("title")}
        />
        <FieldError id="title" errors={form.errors("title")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="body">Note</Label>
        <Textarea id="body" name="body" rows={3} defaultValue={form.value("body")} />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add note"}
        </Button>
        <FormStatus message={state.message} error={state.status === "error"} />
      </div>
    </form>
  );
}
