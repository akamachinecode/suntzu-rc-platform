"use client";

import { useActionState, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FieldError, FormStatus, useFormFeedback } from "@/components/forms/feedback";
import { Turnstile } from "@/components/turnstile";
import { type BuildState, submitBuild } from "./actions";

const initialState: BuildState = { status: "idle" };

export function BuildForm() {
  const [state, formAction, pending] = useActionState(submitBuild, initialState);
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Your name" name="name" errors={form.errors("name")}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            defaultValue={form.value("name")}
            {...form.aria("name")}
          />
        </Field>
        <Field label="Email (never published)" name="email" errors={form.errors("email")}>
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
      <Field label="What did you build or fly?" name="model" errors={form.errors("model")}>
        <Input
          id="model"
          name="model"
          required
          placeholder="A scratch-built foam Cub, a 1/10 crawler, a 450 heli rebuild…"
          defaultValue={form.value("model")}
          {...form.aria("model")}
        />
      </Field>
      <Field label="The story" name="story" errors={form.errors("story")}>
        <Textarea
          id="story"
          name="story"
          rows={6}
          required
          placeholder="What it is, what went wrong, what you'd do differently, and where you fly it."
          defaultValue={form.value("story")}
          {...form.aria("story")}
        />
      </Field>
      <Field label="Link to photos or video (optional)" name="link" errors={form.errors("link")}>
        <Input
          id="link"
          name="link"
          type="url"
          inputMode="url"
          spellCheck={false}
          placeholder="https://"
          defaultValue={form.value("link")}
          {...form.aria("link")}
        />
      </Field>
      <div className="grid gap-2">
        <label className="flex items-start gap-3 text-pretty">
          <input
            key={form.value("consent") ?? "unchecked"}
            id="consent"
            type="checkbox"
            name="consent"
            required
            defaultChecked={form.value("consent") === "on"}
            {...form.aria("consent")}
            className="mt-1 size-5 shrink-0 accent-foreground"
          />
          It&apos;s my own work and SunTzu RC can publish it with my first name.
        </label>
        <FieldError id="consent" errors={form.errors("consent")} />
      </div>
      <Turnstile />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send your build"}
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
