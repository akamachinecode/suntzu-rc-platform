import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TryForm } from "./try-form";

export const metadata: Metadata = {
  title: "Try RC flying or racing near you",
  description:
    "Curious about RC planes, helicopters, cars or FPV drones? Tell us where you are and a club or track near you that welcomes beginners gets in touch. Free.",
};

const STEPS = [
  ["Tell us where and what", "Your ZIP code and what you'd like to try. Nothing else."],
  [
    "A club near you gets it",
    "Only clubs and tracks that said they welcome newcomers, through their own organisers.",
  ],
  [
    "They write to you",
    "Most clubs have trainers and a buddy box: your first flight is usually free.",
  ],
] as const;

export default function TryPage() {
  return (
    <>
      <PageHeader
        title="Want to try it?"
        lead="The fastest way into RC is a club field on a Saturday morning, with someone who's done it for twenty years holding the other transmitter. We'll put you in touch."
      />
      <section aria-label="How it works" className="mx-auto max-w-7xl px-5 pb-12 sm:px-6">
        <ol className="grid gap-5 sm:grid-cols-3">
          {STEPS.map(([title, body], index) => (
            <li
              key={title}
              className="rounded-xl border-2 border-foreground bg-panel p-5 shadow-hard"
            >
              <p className="text-4xl font-black font-wide">{index + 1}</p>
              <h2 className="mt-2 text-lg font-black font-wide">{title}</h2>
              <p className="mt-1 text-pretty">{body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="ask-title" className="bg-cutting-mat text-mat-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="ask-title" className="text-3xl font-black font-wide">
              Find me a club
            </h2>
            <p className="mt-3 max-w-[46ch] text-pretty">
              Not sure which kind of RC is for you? Start with our{" "}
              <Link href="/guides" className="font-semibold underline underline-offset-4">
                guides
              </Link>
              , or look for events marked{" "}
              <Link
                href="/events?beginners=1"
                className="font-semibold underline underline-offset-4"
              >
                beginners welcome
              </Link>
              .
            </p>
          </div>
          <div className="rounded-xl border-2 border-foreground bg-panel p-6 text-foreground shadow-hard sm:p-8">
            <TryForm />
          </div>
        </div>
      </section>
    </>
  );
}
