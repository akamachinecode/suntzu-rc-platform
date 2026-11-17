"use client";

import { useActionState, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FieldError, FormStatus, useFormFeedback } from "@/components/forms/feedback";
import { Turnstile } from "@/components/turnstile";
import { TOPICS, type Topic } from "@workspace/shared";
import { type ContactState, submitContact } from "./actions";

const initialState: ContactState = { status: "idle" };

export function ContactForm({ topic }: { topic?: Topic }) {
  const [state, formAction, pending] = useActionState(submitContact, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormFeedback(state, formRef);

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={form.onInput}
      className="grid gap-6"
      noValidate
    >
      <p className="text-sm text-muted-foreground">Every field is needed.</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Name" name="name" errors={form.errors("name")}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            defaultValue={form.value("name")}
            {...form.aria("name")}
          />
        </Field>
        <Field label="Email" name="email" errors={form.errors("email")}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            defaultValue={form.value("email")}
            {...form.aria("email")}
          />
        </Field>
      </div>
      <Field label="What can we help with?" name="topic" errors={form.errors("topic")}>
        <select
          // React only reads a select's defaultValue when it mounts: a new key brings back the
          // choice after an error.
          key={form.value("topic") ?? "first"}
          id="topic"
          name="topic"
          required
          defaultValue={form.value("topic") ?? topic ?? ""}
          {...form.aria("topic")}
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
      <Field label="Tell us a bit about you" name="message" errors={form.errors("message")}>
        <Textarea
          id="message"
          name="message"
          rows={6}
          required
          placeholder="What you fly or drive (if anything yet), where you are, and what you'd like to do."
          defaultValue={form.value("message")}
          {...form.aria("message")}
        />
      </Field>
      <Turnstile />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
        <FormStatus message={state.message} error={state.status === "error"} />
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
      <FieldError id={name} errors={errors} />
    </div>
  );
}
