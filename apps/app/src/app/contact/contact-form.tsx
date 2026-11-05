"use client";

import { useActionState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Turnstile } from "@/components/turnstile";
import { TOPICS, type Topic } from "@workspace/shared";
import { type ContactState, submitContact } from "./actions";

const initialState: ContactState = { status: "idle" };

export function ContactForm({ topic }: { topic?: Topic }) {
  const [state, formAction, pending] = useActionState(submitContact, initialState);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
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
      </div>
      <Field label="What can we help with?" name="topic" errors={state.errors?.topic}>
        <select
          id="topic"
          name="topic"
          required
          defaultValue={topic ?? ""}
          aria-invalid={!!state.errors?.topic}
          className="h-11 rounded-md border-2 border-foreground bg-background px-3 text-base focus-visible:shadow-hard-sm"
        >
          <option value="" disabled>
            Choose one
          </option>
          {TOPICS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tell us a bit about you" name="message" errors={state.errors?.message}>
        <Textarea
          id="message"
          name="message"
          rows={6}
          required
          placeholder="What you fly or drive (if anything yet), where you are, and what you'd like to do."
          aria-invalid={!!state.errors?.message}
        />
      </Field>
      <Turnstile />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
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
      <Label htmlFor={name} className="font-semibold">
        {label}
      </Label>
      {children}
      {errors?.map((error) => (
        <p key={error} className="text-sm text-destructive">
          {error}
        </p>
      ))}
    </div>
  );
}
