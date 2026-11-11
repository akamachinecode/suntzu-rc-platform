import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { GUIDES, IN_THE_WORKS } from "@workspace/shared";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Long reads that take RC planes, helicopters and cars apart, plus practical guides to flying in South Florida.",
};

export default function GuidesPage() {
  return (
    <>
      <PageHeader
        title="Guides from the bench."
        lead="We take the machines apart so you can see how they work, then put them back together with real numbers. No listicles, no affiliate links."
      />
      <section aria-label="Published guides" className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
        <ul className="grid gap-8 md:grid-cols-2">
          {GUIDES.map((guide, index) => (
            <li key={guide.href}>
              <Link
                href={guide.href}
                className={`group flex h-full flex-col justify-between gap-10 rounded-xl border-2 border-foreground p-8 shadow-hard-lg transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 motion-reduce:transform-none ${index === 0 ? "bg-primary" : "bg-panel"}`}
              >
                <div>
                  <h2 className="text-3xl leading-tight font-black text-balance font-wide sm:text-4xl">
                    {guide.title}
                  </h2>
                  <p className="mt-4 max-w-[52ch] text-lg text-pretty">{guide.dek}</p>
                </div>
                <p className="font-semibold">
                  <span className="underline underline-offset-4 group-hover:decoration-2">
                    Read the guide
                  </span>
                  <span className="text-muted-foreground"> {guide.minutes} min</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="works-title" className="mx-auto max-w-7xl px-5 pb-24 sm:px-6">
        <h2 id="works-title" className="text-xl font-bold">
          On the bench right now
        </h2>
        <ul className="mt-4 grid gap-2 text-lg">
          {IN_THE_WORKS.map((title) => (
            <li key={title} className="text-muted-foreground">
              {title}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
