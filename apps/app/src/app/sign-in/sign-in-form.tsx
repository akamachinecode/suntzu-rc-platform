"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { authClient } from "@/lib/auth-client";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    try {
      const { error } =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: String(form.get("name")) });
      if (error) return setError(error.message ?? "Something went wrong. Try again.");
    } catch {
      return setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {mode === "sign-up" && (
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={12}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </Button>
      <Button
        type="button"
        variant="link"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
      >
        {mode === "sign-in" ? "No account yet? Create one" : "Already have an account? Sign in"}
      </Button>
    </form>
  );
}
