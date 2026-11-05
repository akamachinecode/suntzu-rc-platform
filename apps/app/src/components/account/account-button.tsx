"use client";

import { ShieldCheckIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { authClient } from "@/lib/auth-client";

/** The header's account link: "Sign in", or the member's own page (and the crew's console). */
export function AccountButton() {
  const { data, isPending } = authClient.useSession();
  if (isPending) return <span className="inline-block w-20" aria-hidden="true" />;
  if (!data) {
    return (
      <Button asChild variant="ghost">
        <Link href="/sign-in">Sign in</Link>
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {data.user.role === "crew" && (
        <Button asChild variant="ghost" size="icon" className="max-sm:hidden">
          <Link href="/crew" aria-label="Crew console">
            <ShieldCheckIcon aria-hidden="true" />
          </Link>
        </Button>
      )}
      <Button asChild variant="outline">
        <Link href="/me">
          <UserRoundIcon aria-hidden="true" />
          <span className="max-xl:sr-only">My SunTzu RC</span>
        </Link>
      </Button>
    </div>
  );
}
