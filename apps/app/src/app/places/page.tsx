import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PlacesExplorer } from "@/components/places/places-explorer";
import { Button } from "@workspace/ui/components/button";
import { getPublicApi } from "@/lib/api";

export const metadata: Metadata = {
  title: "Where to fly and race RC in Florida",
  description:
    "Every RC flying field, car track and FAA-recognised identification area in Florida on one map, with how to visit and who runs each one.",
};

export const dynamic = "force-dynamic";

export default async function PlacesPage({ searchParams }: PageProps<"/places">) {
  // "?near=me" (the "Near me" shortcut in search): closest first, as soon as the page opens.
  const nearMe = (await searchParams).near === "me";
  const { data: places } = await getPublicApi().GET("/places");
  return (
    <>
      <PageHeader
        title="Where to fly and race."
        lead="Flying fields, car tracks and FAA-recognised areas across Florida. Most belong to clubs: each page says how to visit, who to ask and when we last checked it."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/places/can-i-fly-here">Can I fly here?</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/clubs">Clubs and tracks</Link>
          </Button>
        </div>
      </PageHeader>
      <section aria-label="Places" className="mx-auto max-w-7xl px-4 pb-24">
        {places ? (
          <PlacesExplorer places={places} nearMe={nearMe} />
        ) : (
          <p className="rounded-xl border-2 border-foreground bg-panel p-6 text-lg shadow-hard">
            The map is taking a break. Try again in a minute.
          </p>
        )}
      </section>
    </>
  );
}
