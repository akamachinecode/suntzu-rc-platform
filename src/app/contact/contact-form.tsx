"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ContactState, submitContact } from "./actions";

const initialState: ContactState = { status: "idle" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initialState);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <Field label="Name" name="name" errors={state.errors?.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          aria-invalid={!!state.errors?.name}
        />
      </Field>
      <Field label="Email" name="email" errors={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={!!state.errors?.email}
        />
      </Field>
      <Field label="Message" name="message" errors={state.errors?.message}>
        <Textarea
          id="message"
          name="message"
          rows={5}
          required
          aria-invalid={!!state.errors?.message}
        />
      </Field>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
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

function Field({
  label,
  name,
  errors,
  children,
}: {
  label: string;
  name: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {errors?.map((error) => (
        <p key={error} className="text-sm text-destructive">
          {error}
        </p>
      ))}
    </div>
  );
}
