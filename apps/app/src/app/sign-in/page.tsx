import type { Metadata } from "next";
import Link from "next/link";
import { SignInClient } from "./sign-in-client";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Servo to follow events, clubs and fields, and get told when they change.",
  robots: { index: false },
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  // Only redirect inside this app after signing in (never to another site).
  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/me";
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="text-5xl leading-[0.92] font-black tracking-tight font-wide">Sign in</h1>
      <p className="mt-4 mb-8 text-lg text-pretty">
        Follow events, clubs and fields, mark where you&apos;re going and get told when something
        changes. Free, forever, and no password to remember.
      </p>
      <SignInClient next={target} google={process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === "true"} />
      <p className="mt-8 text-sm text-muted-foreground">
        New here? The same link creates your account. See what we keep and why in our{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          privacy policy
        </Link>
        .
      </p>
    </section>
  );
}
