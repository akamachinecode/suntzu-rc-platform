"use client";

import dynamic from "next/dynamic";

// The form builds its return link from the browser's address, so it renders only in the browser.
export const SignInClient = dynamic(
  () => import("./sign-in-form").then((module) => module.SignInForm),
  { ssr: false, loading: () => <div className="h-40" aria-hidden="true" /> },
);
