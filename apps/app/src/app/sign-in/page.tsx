import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create an account.",
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  // Only redirect inside this app after signing in (never to another site).
  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/notes";
  return (
    <section className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 font-heading text-4xl font-semibold tracking-tight">Sign in</h1>
      <p className="mb-8 text-muted-foreground">
        Use your email and password, or create an account.
      </p>
      <SignInForm next={target} />
    </section>
  );
}
