"use client";

import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { sendFeedback } from "@/app/(site)/events/[slug]/actions";
import { Turnstile } from "@/components/turnstile";

/**
 * After an event: "Was this information right?" Anonymous; the answer reaches the crew. Public, so
 * in production it carries a Turnstile token like every other public form (the API refuses it
 * without one once TURNSTILE_SECRET_KEY is set).
 */
export function EventFeedback({ slug }: { slug: string }) {
  const [answer, setAnswer] = useState<boolean | undefined>();
  const [note, setNote] = useState("");
  const [result, setResult] = useState<"sent" | "error" | undefined>();
  const [pending, startTransition] = useTransition();

  if (result === "sent") {
    return (
      <p role="status" className="font-semibold">
        Thanks. It helps the next person who looks this up.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="font-semibold" id="feedback-question">
        Were you there? Was this information right?
      </p>
      <div role="group" aria-labelledby="feedback-question" className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant={answer === true ? "default" : "outline"}
          aria-pressed={answer === true}
          onClick={() => setAnswer(true)}
        >
          <ThumbsUpIcon aria-hidden="true" /> Yes
        </Button>
        <Button
          type="button"
          variant={answer === false ? "default" : "outline"}
          aria-pressed={answer === false}
          onClick={() => setAnswer(false)}
        >
          <ThumbsDownIcon aria-hidden="true" /> Something was off
        </Button>
      </div>
      {answer !== undefined ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const token = new FormData(event.currentTarget).get("cf-turnstile-response");
            startTransition(async () =>
              setResult(
                await sendFeedback(
                  slug,
                  answer,
                  note,
                  typeof token === "string" ? token : undefined,
                ),
              ),
            );
          }}
        >
          <label htmlFor="feedback-note" className="text-sm font-semibold">
            {answer ? "Anything to add? (optional)" : "What was off? (optional)"}
          </label>
          <Textarea
            id="feedback-note"
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Turnstile />
          <Button type="submit" className="justify-self-start" disabled={pending}>
            {pending ? "Sending…" : "Send"}
          </Button>
          {result === "error" ? (
            <p role="alert" className="text-sm text-destructive">
              Could not send. Try again in a minute.
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
