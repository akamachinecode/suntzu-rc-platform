"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ClaimStatus } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { checkWebsite, type ClaimState, enterCode } from "./actions";

/** One claim: verified (open the dashboard) or the next step to prove it. */
export function VerifyPanel({ claim }: { claim: ClaimStatus }) {
  const [codeState, codeAction, codePending] = useActionState<ClaimState, FormData>(
    enterCode.bind(null, claim.host.slug),
    { status: "idle" },
  );
  const [siteState, siteAction, sitePending] = useActionState<ClaimState>(
    checkWebsite.bind(null, claim.host.slug),
    { status: "idle" },
  );

  return (
    <li className="grid gap-4 rounded-xl border-2 border-foreground bg-panel p-5 shadow-hard">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-xl font-black font-wide">{claim.host.name}</h3>
        <p className="text-sm font-semibold">
          {claim.verified ? "Verified" : "Waiting to be verified"}
        </p>
      </div>
      {claim.verified ? (
        <Button asChild className="justify-self-start">
          <Link href={`/organise/${claim.host.slug}`}>Open the club dashboard</Link>
        </Button>
      ) : claim.method === "domain-email" ? (
        <form action={codeAction} className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label htmlFor={`code-${claim.host.slug}`}>
              Code from the email to your {claim.domain ?? "club"} address
            </Label>
            <Input
              id={`code-${claim.host.slug}`}
              name="code"
              inputMode="numeric"
              maxLength={6}
              className="max-w-40"
            />
          </div>
          <Button type="submit" disabled={codePending}>
            {codePending ? "Checking…" : "Verify"}
          </Button>
          {codeState.message ? (
            <p role="status" className="basis-full text-sm">
              {codeState.message}
            </p>
          ) : null}
        </form>
      ) : claim.method === "website-code" ? (
        <div className="grid gap-3">
          <p className="text-pretty">
            Put this code anywhere on your home page, or in a text file at <code>/servo.txt</code>{" "}
            on your site:
          </p>
          <code className="justify-self-start rounded-md border-2 border-foreground bg-background px-3 py-2 font-mono">
            {claim.websiteCode}
          </code>
          <form action={siteAction} className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={sitePending}>
              {sitePending ? "Checking…" : "Check my website"}
            </Button>
            {siteState.message ? (
              <p role="status" className="text-sm">
                {siteState.message}
              </p>
            ) : null}
          </form>
        </div>
      ) : (
        <p className="text-pretty">
          The crew is checking. We&apos;ll email you when it&apos;s done.
        </p>
      )}
    </li>
  );
}
