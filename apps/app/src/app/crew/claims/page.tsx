import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { getApi } from "@/lib/api";
import { DISCIPLINE_LABELS } from "@/lib/events";
import { decideClaim, markTrySent } from "./actions";

export const metadata: Metadata = {
  title: "Club claims and try-it requests",
  description: "Claims the crew checks by hand, and newcomers no club could take yet.",
  robots: { index: false },
};

interface Claim {
  host: { slug: string; name: string };
  userId: string;
  name: string;
  email: string;
  requestedAt: string;
}

interface TryRequest {
  id: string;
  name: string;
  email: string;
  zip: string;
  discipline: keyof typeof DISCIPLINE_LABELS;
  message: string;
  createdAt: string;
}

export default async function ClaimsPage() {
  const api = await getApi();
  const [claims, requests] = await Promise.all([api.GET("/crew/claims"), api.GET("/crew/try")]);
  if (claims.response.status === 401) redirect("/sign-in?next=/crew/claims");
  if (claims.response.status === 403) redirect("/crew");
  const pending = (claims.data ?? []) as unknown as Claim[];
  const open = (requests.data ?? []) as unknown as TryRequest[];

  return (
    <div className="mx-auto max-w-7xl px-5 pt-16 pb-24 sm:px-6">
      <Link href="/crew" className="font-semibold underline underline-offset-4">
        ← Crew console
      </Link>
      <h1 className="mt-6 text-5xl font-black font-wide">Claims and try-it</h1>

      <section aria-labelledby="claims-title" className="mt-10">
        <h2 id="claims-title" className="text-3xl font-black font-wide">
          Clubs to check by hand
        </h2>
        <p className="mt-2 max-w-[70ch] text-pretty text-muted-foreground">
          Check the person against the club&apos;s own page or Facebook group before you approve.
          Approving makes them its organiser.
        </p>
        <ul className="mt-6 grid gap-4">
          {pending.length ? (
            pending.map((claim) => (
              <li
                key={`${claim.host.slug}-${claim.userId}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-foreground bg-panel p-5 shadow-hard-sm"
              >
                <p>
                  <strong>{claim.name || claim.email}</strong> (
                  <a href={`mailto:${claim.email}`} className="underline underline-offset-4">
                    {claim.email}
                  </a>
                  ) says they run{" "}
                  <Link
                    href={`/clubs/${claim.host.slug}`}
                    className="font-semibold underline underline-offset-4"
                  >
                    {claim.host.name}
                  </Link>
                </p>
                <div className="flex gap-2">
                  <form action={decideClaim.bind(null, claim.host.slug, claim.userId, true)}>
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={decideClaim.bind(null, claim.host.slug, claim.userId, false)}>
                    <Button type="submit" size="sm" variant="outline">
                      Reject
                    </Button>
                  </form>
                </div>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground">No claims waiting.</li>
          )}
        </ul>
      </section>

      <section aria-labelledby="try-title" className="mt-16">
        <h2 id="try-title" className="text-3xl font-black font-wide">
          Newcomers waiting for a club
        </h2>
        <p className="mt-2 max-w-[70ch] text-pretty text-muted-foreground">
          No club near them takes newcomers on SunTzu RC yet. Find them a club, a track or a shop,
          write to them, then mark it sent.
        </p>
        <ul className="mt-6 grid gap-4">
          {open.length ? (
            open.map((request) => (
              <li
                key={request.id}
                className="grid gap-2 rounded-xl border-2 border-foreground bg-panel p-5 shadow-hard-sm"
              >
                <p className="font-semibold">
                  {request.name} ·{" "}
                  <a href={`mailto:${request.email}`} className="underline underline-offset-4">
                    {request.email}
                  </a>{" "}
                  · ZIP {request.zip} · {DISCIPLINE_LABELS[request.discipline]}
                </p>
                {request.message ? <p className="text-pretty">{request.message}</p> : null}
                <form action={markTrySent.bind(null, request.id)}>
                  <Button type="submit" size="sm" variant="outline">
                    Mark as sent
                  </Button>
                </form>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground">Nobody waiting.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
