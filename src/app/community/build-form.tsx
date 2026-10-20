"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type BuildState, submitBuild } from "./actions";

const initialState: BuildState = { status: "idle" };

export function BuildForm() {
  const [state, formAction, pending] = useActionState(submitBuild, initialState);
  const e = state.errors ?? {};

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name" name="name" errors={e.name}>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={!!e.name} />
        </Field>
        <Field label="Email (never published)" name="email" errors={e.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!e.email}
          />
        </Field>
      </div>
      <Field label="What did you build or fly?" name="model" errors={e.model}>
        <Input
          id="model"
          name="model"
          required
          placeholder="A scratch-built foam Cub, a 1/10 crawler, a 450 heli rebuild…"
          aria-invalid={!!e.model}
        />
      </Field>
      <Field label="The story" name="story" errors={e.story}>
        <Textarea
          id="story"
          name="story"
          rows={6}
          required
          placeholder="What it is, what went wrong, what you'd do differently, and where you fly it."
          aria-invalid={!!e.story}
        />
      </Field>
      <Field label="Link to photos or video (optional)" name="link" errors={e.link}>
        <Input
          id="link"
          name="link"
          type="url"
          inputMode="url"
          placeholder="https://"
          aria-invalid={!!e.link}
        />
      </Field>
      <div className="grid gap-2">
        <label className="flex items-start gap-3 text-pretty">
          <input
            type="checkbox"
            name="consent"
            required
            aria-invalid={!!e.consent}
            className="mt-1 size-5 shrink-0 accent-foreground"
          />
          It&apos;s my own work and Servo can publish it with my first name.
        </label>
        {e.consent?.map((error) => (
          <p key={error} className="text-sm text-destructive">
            {error}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send your build"}
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
