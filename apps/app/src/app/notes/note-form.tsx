"use client";

import { useActionState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { createNote, type NoteFormState } from "./actions";

const initialState: NoteFormState = { status: "idle" };

export function NoteForm() {
  const [state, formAction, pending] = useActionState(createNote, initialState);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required aria-invalid={!!state.errors?.title} />
        {state.errors?.title?.map((error) => (
          <p key={error} className="text-sm text-destructive">
            {error}
          </p>
        ))}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="body">Note</Label>
        <Textarea id="body" name="body" rows={3} />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add note"}
        </Button>
        {state.message && (
          <p
            role="status"
            className={
              state.status === "error"
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
