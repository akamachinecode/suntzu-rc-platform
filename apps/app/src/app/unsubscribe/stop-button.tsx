"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import { unsubscribe } from "./actions";

/** A button, not a link that acts on its own: mail scanners open links, people press buttons. */
export function StopButton({ token, what, label }: { token: string; what: string; label: string }) {
  const [result, setResult] = useState<"done" | "error" | undefined>();
  const [pending, start] = useTransition();
  if (result === "done") {
    return (
      <p role="status" className="text-lg font-semibold">
        Done. You won&apos;t get {label} any more. Change your mind in{" "}
        <Link href="/me" className="underline underline-offset-4">
          My Servo
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="grid gap-3">
      <Button
        size="lg"
        className="justify-self-start"
        disabled={pending}
        onClick={() => start(async () => setResult(await unsubscribe(token, what)))}
      >
        {pending ? "One moment…" : `Stop ${label}`}
      </Button>
      {result === "error" ? (
        <p role="alert" className="text-destructive">
          That link doesn&apos;t work any more. Change your emails in My Servo.
        </p>
      ) : null}
    </div>
  );
}
