import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PLACES } from "@/content/places";
import { BuildForm } from "./build-form";

export const metadata: Metadata = {
  title: "South Florida RC community",
  description:
    "Clubs, flying fields and RC car tracks in Miami-Dade, Broward and Palm Beach, and a place to share your builds.",
};

const COUNTIES = ["Miami-Dade", "Broward", "Palm Beach"] as const;

export default function CommunityPage() {
  return (
    <>
      <PageHeader
        title="The hobby is better with people."
        lead="Clubs give you instructors, insured fields and someone to help when a servo strips on the flight line. Here's where South Florida flies and races, and a place to show us what you've built."
      />

      <section aria-labelledby="places-title" className="bg-cutting-mat text-mat-foreground">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <h2 id="places-title" className="text-3xl font-black font-wide sm:text-5xl">
            Clubs, fields and tracks
          </h2>
          <p className="mt-4 max-w-[56ch] text-lg text-pretty">
            Every club sets its own rules for guests and new members. Visit on a flying day and ask;
            most will hand you a buddy box before you&apos;ve finished saying hello.
          </p>
          <div className="mt-12 grid gap-10 lg:grid-cols-3">
            {COUNTIES.map((county) => (
              <div key={county}>
                <h3 className="text-xl font-black font-wide">{county}</h3>
                <ul className="mt-4 grid gap-5">
                  {PLACES.filter((place) => place.county === county).map((place) => (
                    <li
                      key={place.name}
                      className="rounded-lg border-2 border-foreground bg-panel p-5 text-foreground shadow-hard"
                    >
                      <p className="text-sm font-semibold">{place.kind}</p>
                      <h4 className="mt-1 text-lg font-bold">{place.name}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{place.where}</p>
                      <p className="mt-3 text-sm text-pretty">{place.notes}</p>
                      <a
                        href={place.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm font-semibold underline underline-offset-4"
                      >
                        Visit their site<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="share-title" className="mx-auto max-w-7xl px-4 py-24">
        <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 id="share-title" className="text-3xl font-black text-balance font-wide sm:text-5xl">
              Show us your build
            </h2>
            <p className="mt-5 max-w-[46ch] text-lg text-pretty">
              A first foam trainer counts as much as a turbine jet. Send us the story and a link to
              photos; we&apos;ll pick our favourites for the site and check with you before anything
              goes live.
            </p>
            <p className="mt-4 max-w-[46ch] text-pretty text-muted-foreground">
              Member profiles, where you can post yourself, are on the way.
            </p>
          </div>
          <div className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard-lg sm:p-10">
            <BuildForm />
          </div>
        </div>
      </section>
    </>
  );
}
