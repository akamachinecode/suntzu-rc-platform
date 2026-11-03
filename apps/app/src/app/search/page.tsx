import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { SEARCH_MILES, type SearchResult } from "@workspace/shared";
import { ReportMiss } from "@/components/search/report-miss";
import { SearchForm } from "@/components/search/search-form";
import { SearchShortcuts } from "@/components/search/search-shortcuts";
import { getPublicApi } from "@/lib/api";
import {
  formatResultDates,
  groupResults,
  SEARCH_GROUPS,
  type SearchGroup,
  searchUrl,
  TYPE_LABELS,
} from "@/lib/search";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Servo's events, fields, tracks, clubs, guides and rules in one place.",
  // Google indexes the pages themselves, not our searches.
  robots: { index: false },
};

// Rendered on request (answers cached for 5 minutes, like the pages they point to).
export const dynamic = "force-dynamic";

const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

const EXAMPLES = [
  "Markham Park",
  "33441",
  "how high can I fly",
  "pista de carros cerca de Hialeah",
];

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = (one(params.q) ?? "").trim().slice(0, 100);
  const group = SEARCH_GROUPS.find((each) => each.key === one(params.in));
  const miles = SEARCH_MILES.find((each) => String(each) === one(params.miles));
  const { data } = q
    ? await getPublicApi().GET("/search", {
        params: {
          query: {
            q,
            limit: 30,
            ...(group && { type: [...group.types] }),
            ...(miles && { miles }),
          },
        },
      })
    : { data: undefined };
  const near = data?.near ?? null;

  // The same search with another tab or radius.
  const href = (change: { in?: SearchGroup["key"] | null; miles?: number }) => {
    const next = new URLSearchParams({ q });
    const tab = change.in === undefined ? group?.key : change.in;
    if (tab) next.set("in", tab);
    const radius = change.miles ?? miles;
    if (radius && radius !== SEARCH_MILES[0]) next.set("miles", String(radius));
    return `/search?${next.toString()}`;
  };

  return (
    <>
      <header className="mx-auto max-w-7xl px-4 pt-16 pb-8 sm:pt-20">
        <h1 className="text-4xl leading-[0.95] font-black tracking-tight text-balance break-words font-wide sm:text-6xl">
          {q ? <>Results for &ldquo;{q}&rdquo;</> : "Search Servo"}
        </h1>
        <SearchForm q={q} />
      </header>

      {!q ? (
        <section aria-labelledby="start-title" className="mx-auto max-w-7xl px-4 pb-24">
          <h2 id="start-title" className="text-2xl font-black font-wide">
            Events, fields, tracks, clubs, guides and rules
          </h2>
          <p className="mt-2 max-w-[60ch] text-lg text-pretty">
            Type a name, a town or a ZIP code, or ask a question. Typos and half-typed words are
            fine, and so is Spanish. For example:
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-semibold">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <Link href={searchUrl(example)} className="underline underline-offset-4">
                  {example}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <SearchShortcuts />
          </div>
        </section>
      ) : (
        <>
          <nav aria-label="Kinds of result" className="mx-auto max-w-7xl px-4">
            <ul className="flex flex-wrap gap-2 border-b-2 border-foreground pb-4">
              {[{ key: null, label: "All" } as const, ...SEARCH_GROUPS].map((tab) => {
                const current = (group?.key ?? null) === tab.key;
                return (
                  <li key={tab.label}>
                    <Link
                      href={href({ in: tab.key })}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "inline-block rounded-md border-2 border-foreground px-3 py-1.5 text-sm font-semibold",
                        current ? "bg-primary shadow-hard-sm" : "bg-panel",
                      )}
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {near ? (
            <div className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4">
              <p className="flex items-center gap-2 font-semibold">
                <MapPin aria-hidden="true" className="size-4" />
                Within {near.miles} miles of {near.label}, closest first.
              </p>
              <ul aria-label="How far" className="flex gap-2">
                {SEARCH_MILES.map((radius) => (
                  <li key={radius}>
                    <Link
                      href={href({ miles: radius })}
                      aria-current={radius === near.miles ? "true" : undefined}
                      className={cn(
                        "inline-block rounded-md border-2 border-foreground px-2.5 py-1 text-sm font-semibold",
                        radius === near.miles ? "bg-primary" : "bg-panel",
                      )}
                    >
                      {radius} mi
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/places/can-i-fly-here?at=${near.latitude.toFixed(4)},${near.longitude.toFixed(4)}`}
                className="text-sm font-semibold underline underline-offset-4"
              >
                Can I fly near {near.label}?
              </Link>
            </div>
          ) : null}

          <section aria-label="Results" className="mx-auto max-w-7xl px-4 pt-8 pb-24">
            {!data ? (
              <p className="rounded-xl border-2 border-foreground bg-panel p-6 text-lg shadow-hard">
                Search is taking a break. Try again in a minute.
              </p>
            ) : data.results.length ? (
              <div className="grid gap-12">
                {data.partial ? (
                  <p className="max-w-[60ch] text-lg text-pretty">
                    Nothing matches every word of &ldquo;{q}&rdquo;. These come closest; try fewer
                    words, or one of the shortcuts below.
                  </p>
                ) : null}
                {groupResults(data.results).map((each) => (
                  <section key={each.key} aria-labelledby={`group-${each.key}`}>
                    <h2 id={`group-${each.key}`} className="text-2xl font-black font-wide">
                      {each.label}
                    </h2>
                    <ul className="mt-4 grid gap-4 md:grid-cols-2">
                      {each.results.map((result) => (
                        <ResultItem key={result.id} result={result} />
                      ))}
                    </ul>
                  </section>
                ))}
                {data.partial ? <SearchShortcuts /> : null}
              </div>
            ) : (
              <div className="grid gap-6">
                <p className="max-w-[60ch] text-lg text-pretty">
                  Nothing found for &ldquo;{q}&rdquo;
                  {group ? ` in ${group.label.toLowerCase()}` : ""}. Try fewer words, a town or a
                  ZIP code
                  {group ? (
                    <>
                      , search{" "}
                      <Link href={href({ in: null })} className="underline underline-offset-4">
                        everything
                      </Link>
                    </>
                  ) : null}
                  , or start from one of these:
                </p>
                <SearchShortcuts />
              </div>
            )}
            {data && !group ? <ReportMiss response={data} /> : null}
          </section>
        </>
      )}
    </>
  );
}

function ResultItem({ result }: { result: SearchResult }) {
  const dates = formatResultDates(result);
  const next = result.next && formatResultDates(result.next);
  return (
    <li
      className={cn(
        "grid content-start gap-1 rounded-xl border-2 border-foreground p-4",
        result.past ? "bg-background" : "bg-panel shadow-hard-sm",
      )}
    >
      <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        <span>{TYPE_LABELS[result.type]}</span>
        {result.past ? (
          <span className="rounded border-2 border-foreground px-1.5 py-px">Past</span>
        ) : null}
        {result.miles !== null ? <span>{result.miles} mi away</span> : null}
      </p>
      <h3 className="text-lg leading-tight font-bold">
        <Link href={result.url} className="underline-offset-4 hover:underline">
          {result.title}
        </Link>
      </h3>
      {result.subtitle ? <p className="text-muted-foreground">{result.subtitle}</p> : null}
      {dates ? <p className="text-sm font-semibold">{dates}</p> : null}
      {result.next ? (
        <p className="text-sm">
          Next edition:{" "}
          <Link href={result.next.url} className="font-semibold underline underline-offset-4">
            {result.next.title}
          </Link>
          , {next}
        </p>
      ) : null}
    </li>
  );
}
