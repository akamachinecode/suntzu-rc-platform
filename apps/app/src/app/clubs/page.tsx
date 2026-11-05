import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getPublicApi } from "@/lib/api";

export const metadata: Metadata = {
  title: "RC clubs and tracks in Florida",
  description:
    "Flying clubs, car tracks, shops and organisers across Florida, with their fields and upcoming events.",
};

export const dynamic = "force-dynamic";

const KIND = {
  club: "Club",
  track: "Track",
  shop: "Shop",
  "sanctioning-body": "Sanctioning body",
  organiser: "Organiser",
} as const;

export default async function ClubsPage() {
  const { data: hosts } = await getPublicApi().GET("/hosts");
  const groups = new Map<string, NonNullable<typeof hosts>>();
  for (const host of hosts ?? []) {
    const key = host.county ? `${host.county} County` : "Across Florida";
    groups.set(key, [...(groups.get(key) ?? []), host]);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) =>
    a === "Across Florida" ? 1 : b === "Across Florida" ? -1 : a.localeCompare(b),
  );

  return (
    <>
      <PageHeader
        title="Find your people."
        lead="Clubs give you instructors, insured fields and someone to help when a servo strips on the flight line. Every club and track in Florida we know of, with its fields and events."
      />
      <section aria-label="Clubs and tracks" className="mx-auto max-w-7xl px-4 pb-24">
        {ordered.length ? (
          <div className="grid gap-12">
            {ordered.map(([county, list]) => (
              <div key={county}>
                <h2 className="text-2xl font-black font-wide">{county}</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((host) => (
                    <li
                      key={host.slug}
                      className="relative rounded-xl border-2 border-foreground bg-panel p-4 shadow-hard-sm"
                    >
                      <p className="text-xs font-semibold tracking-wide uppercase">
                        {KIND[host.kind]}
                        {host.city ? ` · ${host.city}` : ""}
                      </p>
                      <h3 className="mt-1 font-bold">
                        <Link href={`/clubs/${host.slug}`} className="after:absolute after:inset-0">
                          {host.name}
                        </Link>
                      </h3>
                      {host.verified ? (
                        <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold">
                          <ShieldCheck aria-hidden className="size-4" /> Verified on SunTzu RC
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-lg">The list is taking a break. Try again in a minute.</p>
        )}
      </section>
    </>
  );
}
