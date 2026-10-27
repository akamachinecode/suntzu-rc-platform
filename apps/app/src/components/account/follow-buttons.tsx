"use client";

import { BellIcon, BellRingIcon, CheckIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { FollowKey, ViewerState } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { setFollow, setGoing, viewerState } from "@/lib/follow-actions";

/**
 * "Follow" (and "I'm going" for events). The page around it is cached for everyone, so the
 * visitor's own state is fetched after it loads.
 */
export function FollowButtons({
  target,
  id,
  going: canGo = false,
  label = "Follow",
}: FollowKey & { going?: boolean; label?: string }) {
  const pathname = usePathname();
  const [state, setState] = useState<ViewerState | null | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    viewerState({ target, id }).then((value) => live && setState(value));
    return () => {
      live = false;
    };
  }, [target, id]);

  if (state === null) {
    return (
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`}>
            <BellIcon aria-hidden="true" /> {label}
          </Link>
        </Button>
        {canGo && (
          <Button asChild variant="outline">
            <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`}>
              <PlusIcon aria-hidden="true" /> I&apos;m going
            </Link>
          </Button>
        )}
      </div>
    );
  }

  const loading = state === undefined || pending;
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        variant={state?.following ? "default" : "outline"}
        aria-pressed={state?.following ?? false}
        disabled={loading}
        onClick={() =>
          startTransition(async () => {
            const next = await setFollow({ target, id }, !state?.following);
            if (next) setState(next);
          })
        }
      >
        {state?.following ? <BellRingIcon aria-hidden="true" /> : <BellIcon aria-hidden="true" />}
        {state?.following ? "Following" : label}
      </Button>
      {canGo && (
        <Button
          type="button"
          variant={state?.going ? "default" : "outline"}
          aria-pressed={state?.going ?? false}
          disabled={loading}
          onClick={() =>
            startTransition(async () => {
              const next = await setGoing(id, !state?.going);
              if (next) setState(next);
            })
          }
        >
          {state?.going ? <CheckIcon aria-hidden="true" /> : <PlusIcon aria-hidden="true" />}
          {state?.going ? "Going" : "I'm going"}
        </Button>
      )}
    </div>
  );
}
