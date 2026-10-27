"use client";

import { MailCheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { authClient } from "@/lib/auth-client";

/** No passwords: an email with a one-time link, or Google when it's set up. */
export function SignInForm({ next, google }: { next: string; google: boolean }) {
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [pending, setPending] = useState(false);
  const callbackURL = new URL(next, window.location.origin).toString();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    try {
      const { error } = await authClient.signIn.magicLink({ email, callbackURL });
      if (error) return setError(error.message ?? "Something went wrong. Try again.");
      setSentTo(email);
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function withGoogle() {
    setPending(true);
    setError(undefined);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL });
    if (error) {
      setError(error.message ?? "Google sign-in isn't available right now.");
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div
        role="status"
        className="grid gap-4 rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard"
      >
        <MailCheckIcon aria-hidden="true" className="size-8" />
        <p className="text-xl font-black font-wide">Check your email</p>
        <p className="text-pretty">
          We sent a sign-in link to <strong>{sentTo}</strong>. It works once, for 15 minutes. You
          can close this tab.
        </p>
        <Button
          type="button"
          variant="link"
          className="justify-self-start px-0"
          onClick={() => setSentTo(undefined)}
        >
          Use another address
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {google && (
        <>
          <Button type="button" size="lg" variant="outline" disabled={pending} onClick={withGoogle}>
            Continue with Google
          </Button>
          <p className="text-center text-sm text-muted-foreground">or</p>
        </>
      )}
      <form onSubmit={onSubmit} className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email" className="font-semibold">
            Email
          </Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Email me a sign-in link"}
        </Button>
      </form>
    </div>
  );
}
