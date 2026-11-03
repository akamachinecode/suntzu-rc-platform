"use client";

import { MailCheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { authClient } from "@/lib/auth-client";

// What the API answers when a code can't be used (Better Auth's email-otp plugin).
const CODE_ERRORS: Record<string, { message: string; spent: boolean }> = {
  INVALID_OTP: { message: "That code isn't right. Check the email and try again.", spent: false },
  OTP_EXPIRED: { message: "That code has expired.", spent: true },
  TOO_MANY_ATTEMPTS: { message: "That code was typed wrong too many times.", spent: true },
};

/**
 * No passwords: one email with a one-time link and a 6-digit code (spec 0006), or Google when
 * it's set up. The code signs in on this screen, in this browser, whichever app opens the email.
 */
export function SignInForm({ next, google }: { next: string; google: boolean }) {
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  // Each email sent starts a fresh code screen (empty field, no old errors).
  const [sent, setSent] = useState(0);
  const [pending, setPending] = useState(false);
  const callbackURL = new URL(next, window.location.origin).toString();

  async function sendEmail(email: string) {
    setPending(true);
    setError(undefined);
    try {
      const { error } = await authClient.signIn.magicLink({ email, callbackURL });
      if (error) return setError(error.message ?? "Something went wrong. Try again.");
      setSentTo(email);
      setSent((count) => count + 1);
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendEmail(String(new FormData(event.currentTarget).get("email")).trim());
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
      <CheckEmail
        key={sent}
        email={sentTo}
        callbackURL={callbackURL}
        resending={pending}
        resendError={error}
        onResend={() => sendEmail(sentTo)}
        onChangeEmail={() => {
          setError(undefined);
          setSentTo(undefined);
        }}
      />
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

function CheckEmail({
  email,
  callbackURL,
  resending,
  resendError,
  onResend,
  onChangeEmail,
}: {
  email: string;
  callbackURL: string;
  resending: boolean;
  resendError?: string;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
}) {
  const [error, setError] = useState<string>();
  // The code can't be used any more (expired or too many tries): only a new email helps.
  const [spent, setSpent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // People copy "482 913" or "482-913" from the email: keep the digits.
    const otp = String(new FormData(event.currentTarget).get("code")).replace(/\D/g, "");
    if (otp.length !== 6) return setError("The code has 6 digits.");
    setPending(true);
    setError(undefined);
    try {
      const { error } = await authClient.signIn.emailOtp({ email, otp });
      if (error) {
        const known = error.code ? CODE_ERRORS[error.code] : undefined;
        setSpent(known?.spent ?? false);
        setPending(false);
        if (known) return setError(known.message);
        if (error.status === 429) return setError("Too many tries in a row. Wait a minute.");
        return setError("Something went wrong. Try again.");
      }
      // A full page load, so the pages read the new session.
      window.location.assign(callbackURL);
    } catch {
      setPending(false);
      setError("Can't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="grid gap-5 rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard">
      <div role="status" className="grid gap-4">
        <MailCheckIcon aria-hidden="true" className="size-8" />
        <p className="text-xl font-black font-wide">Check your email</p>
        <p className="text-pretty">
          We sent a sign-in link and a 6-digit code to <strong>{email}</strong>. Tap the link, or
          type the code here to sign in on this screen. Both work once, for 15 minutes.
        </p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3">
        <Label htmlFor="code" className="font-semibold">
          Code from the email
        </Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={9}
          required
          disabled={spent}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "code-error" : undefined}
          className="font-mono text-2xl tracking-[0.3em]"
        />
        {error && (
          <p id="code-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {spent ? (
          <Button type="button" size="lg" disabled={resending} onClick={onResend}>
            {resending ? "Sending…" : "Email me a new one"}
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Signing in…" : "Sign in with the code"}
          </Button>
        )}
        {resendError && (
          <p role="alert" className="text-sm text-destructive">
            {resendError}
          </p>
        )}
      </form>
      <Button
        type="button"
        variant="link"
        className="justify-self-start px-0"
        onClick={onChangeEmail}
      >
        Use another address
      </Button>
    </div>
  );
}
