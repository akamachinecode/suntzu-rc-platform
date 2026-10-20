import type { Metadata } from "next";
import Link from "next/link";
import { DriftWord } from "@/components/home/drift-word";
import { ServoHero } from "@/components/home/servo-hero";
import { DecalSheet } from "@/components/home/decal-sheet";
import { DraftCover, ManualCover } from "@/components/home/manual-cover";
import { PitPasses } from "@/components/home/pit-passes";
import { SectionTag } from "@/components/home/section-tag";
import { SignalBench } from "@/components/home/signal-bench";
import { Button } from "@/components/ui/button";
import { EVENTS, byDate } from "@/content/events";
import { GUIDES, IN_THE_WORKS } from "@/content/guides";
import { SERVICES } from "@/content/services";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name}: RC planes, helicopters and cars in South Florida` },
  description: SITE.description,
};

const disciplines = [
  {
    id: "air",
    word: "Air",
    title: "Planes",
    body: "Four channels, one wing and a lot of patience with the wind. A high-wing trainer forgives almost everything while your thumbs learn that left is right when it's flying towards you.",
    specs: [
      ["Trainer wingspan", "1.2 to 1.5 m"],
      ["Battery", "3S LiPo, 11.1 V"],
      ["Flight time", "8 to 12 min"],
      ["Controls", "Aileron, elevator, rudder, throttle"],
    ],
  },
  {
    id: "rotor",
    word: "Rotor",
    title: "Helicopters",
    body: "The hardest thing in the hobby to fly, and the most satisfying to get right. A swashplate tilts the spinning blades, and a flybarless gyro corrects them many times a second.",
    specs: [
      ["Common size", "450 class, 710 to 800 mm rotor"],
      ["Head speed", "2,500 to 3,000 rpm"],
      ["Battery", "3S to 6S LiPo"],
      ["Stabilisation", "3-axis flybarless gyro"],
    ],
  },
  {
    id: "ground",
    word: "Ground",
    title: "Cars and crawlers",
    body: "The easiest way in. Bash a short-course truck across a field, race on carpet, or crawl a rock garden at walking pace. If it breaks, you walk over and pick it up.",
    specs: [
      ["Popular scale", "1/10"],
      ["Battery", "2S LiPo, 7.4 V"],
      ["Basher top speed", "50 km/h and up"],
      ["Crawler run time", "Often over an hour"],
    ],
  },
] as const;

const steps = [
  {
    title: "Pick where you want to be",
    body: "Air, rotor or ground. Cars are the gentlest start, planes come next, helicopters ask the most of you.",
  },
  {
    title: "Crash in a simulator first",
    body: "Plug a real transmitter into a flight simulator. A crash costs nothing there, and an hour of sim saves a fuselage.",
  },
  {
    title: "Buy ready to run",
    body: "Start with an RTF or bind-and-fly model. Kits are wonderful, later, once you know what you like.",
  },
  {
    title: "Learn LiPo care before your first charge",
    body: "Balance charge, never leave it unattended, store around 3.8 V per cell, and keep a fireproof bag nearby.",
  },
  {
    title: "Find a club or a field",
    body: "Instructors, buddy boxes, insured fields and people who'll help you fix things. Clubs also make the FAA paperwork easier.",
  },
] as const;

// Re-render once a day so the calendar preview stays current.
export const revalidate = 86400;

export default function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = EVENTS.filter((event) => event.confirmed && (event.end ?? event.start) >= today)
    .sort(byDate)
    .slice(0, 3);

  return (
    <>
      <ServoHero />

      {/* Hero, sheet and "Air" sit the same distance apart: the bottom padding plus the
          drift word's own top padding equals the top padding. */}
      <section
        aria-labelledby="crew-title"
        className="overflow-hidden px-4 pt-20 pb-10 sm:pt-28 sm:pb-18"
      >
        <DecalSheet decals={SERVICES.map(({ id, short, tag }) => ({ id, short, tag }))} />
      </section>

      <section aria-labelledby="disciplines-title">
        <h2 id="disciplines-title" className="sr-only">
          Three ways to play
        </h2>
        {disciplines.map((d, i) => (
          <article
            key={d.id}
            id={d.id}
            aria-labelledby={`${d.id}-title`}
            className={i % 2 === 1 ? "scroll-mt-16 bg-primary" : "scroll-mt-16"}
          >
            <DriftWord className="pt-10">{d.word}</DriftWord>
            <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-6 pb-20 md:grid-cols-[1fr_1.1fr] md:gap-16">
              <div>
                <h3 id={`${d.id}-title`} className="text-3xl font-black font-wide sm:text-4xl">
                  {d.title}
                </h3>
                <p className="mt-4 max-w-[52ch] text-lg text-pretty">{d.body}</p>
              </div>
              <dl className="self-start rounded-xl border-2 border-foreground bg-panel shadow-hard">
                {d.specs.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-6 border-b-2 border-foreground px-5 py-3.5 last:border-b-0"
                  >
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </article>
        ))}
      </section>

      <section
        id="inside"
        aria-labelledby="inside-title"
        className="scroll-mt-16 overflow-hidden bg-cutting-mat text-mat-foreground"
      >
        <div className="mx-auto max-w-7xl px-4 py-24">
          <h2
            id="inside-title"
            className="text-center text-5xl leading-[0.95] font-black text-balance font-wide sm:text-7xl"
          >
            You move a stick.
            <br />
            <span className="text-primary">Six parts do the rest.</span>
          </h2>
          <SignalBench />
          <p className="mt-10 text-center">
            <Button asChild size="lg">
              <Link href="/guides/rc-planes#parts">See them inside a real plane</Link>
            </Button>
          </p>
        </div>
      </section>

      <section aria-labelledby="guides-title" className="px-4 py-24 text-center">
        <SectionTag id="guides-title" tone="sky">
          From the bench
        </SectionTag>
        <p className="mt-6 text-lg">Guides that take the machines apart.</p>
        <ul className="mx-auto mt-12 grid max-w-6xl gap-8 md:grid-cols-3">
          {GUIDES.map((guide, index) => (
            <li key={guide.href}>
              <ManualCover no={index + 1} {...guide} />
            </li>
          ))}
          <li>
            <DraftCover titles={IN_THE_WORKS} />
          </li>
        </ul>
      </section>

      <section
        aria-labelledby="calendar-title"
        className="overflow-x-clip bg-pegboard px-4 py-24 text-center"
      >
        <SectionTag id="calendar-title" tone="lead">
          On the calendar
        </SectionTag>
        <p className="mt-6 text-lg">Fly-ins, races and shows worth the drive.</p>
        <PitPasses events={upcoming} />
        <p className="mt-14">
          <Button asChild size="lg">
            <Link href="/events">The whole calendar</Link>
          </Button>
        </p>
      </section>

      <section id="start" aria-labelledby="start-title" className="scroll-mt-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 md:grid-cols-[1fr_1.4fr]">
          <div className="md:sticky md:top-28 md:self-start">
            <h2
              id="start-title"
              className="text-4xl leading-[0.95] font-black text-balance font-wide sm:text-6xl"
            >
              Your first season, in five moves.
            </h2>
            <p className="mt-5 max-w-[44ch] text-lg text-pretty">
              Most people quit after one expensive crash. Do these in order and you won&apos;t be
              one of them.
            </p>
          </div>
          <ol className="grid gap-6">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="grid grid-cols-[auto_1fr] gap-5 rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard"
              >
                <span
                  aria-hidden="true"
                  className="grid size-12 place-items-center rounded-full border-2 border-foreground bg-primary text-xl font-black font-wide"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                  <p className="mt-1.5 text-pretty text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-24">
          <div className="flex flex-col items-start gap-6 rounded-xl border-2 border-foreground bg-primary p-8 shadow-hard-lg sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <p className="max-w-[30ch] text-2xl leading-tight font-black font-wide sm:text-3xl">
              Got a question before you buy?
            </p>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Ask the Servo crew</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
