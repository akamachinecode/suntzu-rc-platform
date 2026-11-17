"use client";

import { CircleAlertIcon } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

/**
 * How every form answers the person filling it in (spec 0010, modern web guidance `forms/forms` and
 * `accessibility/accessible-error-announcement`):
 *
 * - What they typed stays after an error: React 19 resets a form after its action, so actions
 *   return the typed values (`typedValues`) and fields start from them (`value`).
 * - Each error is linked to its field (`aria-describedby`) only while it has one, and starts with
 *   an icon and a hidden "Error:", so it isn't told by colour alone.
 * - After a failed send, the cursor goes to the first field with an error: the forms use
 *   `noValidate`, so the browser doesn't do it for them.
 * - Typing in a field clears its error until the next send.
 */
export type TypedValues = Partial<Record<string, string>>;

type FormState = {
  errors?: Partial<Record<string, string[]>>;
  values?: TypedValues;
};

export function useFormFeedback(state: FormState, ref: RefObject<HTMLFormElement | null>) {
  // Fields edited since this answer: their errors are hidden until the next send.
  const [edited, setEdited] = useState<{ state: FormState; names: string[] }>({
    state,
    names: [],
  });
  const names = edited.state === state ? edited.names : [];

  useEffect(() => {
    if (!state.errors) return;
    ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state, ref]);

  const errors = (name: string) => (names.includes(name) ? undefined : state.errors?.[name]);

  return {
    onInput(event: FormEvent<HTMLFormElement>) {
      const name = (event.target as HTMLInputElement).name;
      if (!name || !state.errors?.[name] || names.includes(name)) return;
      setEdited({ state, names: [...names, name] });
    },
    errors,
    /** `aria-invalid` and `aria-describedby` for a field: its hint, then its error if it has one. */
    aria(name: string, { id = name, hint }: { id?: string; hint?: string } = {}) {
      const ids = [hint, errors(name)?.length ? `${id}-error` : undefined].filter(Boolean);
      return {
        "aria-invalid": !!errors(name)?.length,
        "aria-describedby": ids.length ? ids.join(" ") : undefined,
      };
    },
    /** What was typed in this field before the last failed send. */
    value(name: string) {
      return state.values?.[name];
    },
  };
}

/** A field's error, under it. `id` is the field's id. */
export function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-destructive">
      <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="sr-only">Error: </span>
        {errors.join(" ")}
      </span>
    </p>
  );
}

/**
 * The form's answer ("Thanks!", "Please fix the highlighted fields."). Always in the page, so a
 * screen reader announces the text when it changes: a live region added with its text isn't
 * announced reliably.
 */
export function FormStatus({ message, error }: { message?: string; error?: boolean }) {
  return (
    <p role="status" className={cn("text-sm", error ? "text-destructive" : "font-semibold")}>
      {message}
    </p>
  );
}

/**
 * The title of a new step that replaces the form ("Check your email", "Sent."). It takes the
 * focus when it appears, so keyboard and screen reader users carry on from there instead of the
 * top of the page.
 */
export function StepHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  /** "p" for a short answer inside a page section, where a heading would break the outline. */
  as?: "h2" | "h3" | "p";
}) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <Tag ref={ref} tabIndex={-1} className={cn("focus:outline-none", className)}>
      {children}
    </Tag>
  );
}
