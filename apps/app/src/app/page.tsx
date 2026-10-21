import type { Metadata } from "next";
import Link from "next/link";
import { DriftWord } from "@/components/home/drift-word";
import { ServoHero } from "@/components/home/servo-hero";
import { DecalSheet } from "@/components/home/decal-sheet";
import { DraftCover, ManualCover } from "@/components/home/manual-cover";
import { PitPasses } from "@/components/home/pit-passes";
import { SectionTitle } from "@/components/home/section-title";
import { SignalBench } from "@/components/home/signal-bench";
import { ToyStage } from "@/components/home/toy-stage";
import { Button } from "@workspace/ui/components/button";
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
    scene: "airfield",
    sceneLabel: "A high-wing trainer flying circuits over a grass club field, its prop spinning.",
    body: "Four channels, one wing and a lot of patience with the wind. A high-wing trainer forgives almost everything while your thumbs learn that left is right when it's flying towards you.",
    tone: "bg-sky",
    facts: [
      ["Self-levelling", "A high-wing trainer rights itself when you let go of the sticks."],
      ["8 to 12 minutes", "of flying from one battery, so charge a few before you go."],
      [
        "A free test first",
        "The FAA's TRUST test and a $5 registration come before your first flight.",
      ],
    ],
    guide: { href: "/guides/rc-planes", label: "The RC plane, taken apart" },
  },
  {
    id: "rotor",
    word: "Rotor",
    title: "Helicopters",
    scene: "helipad",
    sceneLabel: "A 450-class helicopter lifting off a helipad and hovering, its rotor spinning.",
    body: "The hardest thing in the hobby to fly, and the most satisfying to get right. A swashplate tilts the spinning blades, and a flybarless gyro corrects them many times a second.",
    tone: "bg-primary",
    facts: [
      ["Hover first", "Lessons start with hovering, one control at a time."],
      ["Up to 50 turns a second", "A 450 rotor spins 2,500 to 3,000 rpm, so give it room."],
      ["A gyro on board", "It steadies the heli many times a second: you fly, it corrects."],
    ],
    guide: { href: "/guides/rc-helicopters", label: "The RC helicopter, taken apart" },
  },
  {
    id: "ground",
    word: "Ground",
    title: "Cars and crawlers",
    scene: "dirt-track",
    sceneLabel: "A short-course truck lapping a dirt track while a crawler climbs a pile of rocks.",
    body: "The easiest way in. Bash a short-course truck across a field, race on carpet, or crawl a rock garden at walking pace. If it breaks, you walk over and pick it up.",
    tone: "bg-lead",
    facts: [
      ["Nothing to fall from", "No altitude, no airspace and no wind to fight."],
      [
        "50 km/h and up",
        "from a 1/10 basher on a 2S pack. A crawler climbs at walking pace instead.",
      ],
      ["No FAA paperwork", "Cars only need a track, or a lot you're allowed to use."],
    ],
    guide: { href: "/guides/cars-and-crawlers", label: "Cars and crawlers, taken apart" },
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
        {disciplines.map((d) => (
          <article
            key={d.id}
            id={d.id}
            aria-labelledby={`${d.id}-title`}
            className={`scroll-mt-16 ${d.tone}`}
          >
            <DriftWord className="pt-10">{d.word}</DriftWord>
            <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 pt-6 pb-20 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.45fr)] md:gap-10">
              <div>
                <h3 id={`${d.id}-title`} className="text-3xl font-black font-wide sm:text-4xl">
                  {d.title}
                </h3>
                <p className="mt-4 max-w-[52ch] text-lg text-pretty">{d.body}</p>
                <ul className="mt-8 grid max-w-lg gap-5">
                  {d.facts.map(([lead, text]) => (
                    <li key={lead} className="border-l-4 border-foreground pl-4">
                      <p className="text-xl leading-tight font-black font-wide">{lead}</p>
                      <p className="mt-1 text-lg text-pretty">{text}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-9">
                  <Button asChild size="lg" variant="outline">
                    <Link href={d.guide.href}>Read: {d.guide.label}</Link>
                  </Button>
                </p>
              </div>
              <ToyStage
                scene={d.scene}
                label={d.sceneLabel}
                className="aspect-[5/4] w-full max-md:-order-1"
              />
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
          <SectionTitle
            id="inside-title"
            lead="You move a stick."
            tag="Six parts do the rest."
            tone="primary"
          />
          <SignalBench />
          <p className="mt-10 text-center">
            <Button asChild size="lg">
              <Link href="/guides/rc-planes#parts">See them inside a real plane</Link>
            </Button>
          </p>
        </div>
      </section>

      <section aria-labelledby="guides-title" className="overflow-x-clip px-4 py-24 text-center">
        <SectionTitle
          id="guides-title"
          lead="From the bench."
          tag="Machines, taken apart."
          tone="sky"
        />
        <p className="mt-8 text-lg">Every part and every rule, explained by the crew.</p>
        {/* Three to a row; a short last row sits in the middle. */}
        <ul className="mx-auto mt-12 flex max-w-6xl flex-wrap justify-center gap-8 [&>li]:w-full md:[&>li]:w-[calc((100%-2rem)/2)] lg:[&>li]:w-[calc((100%-4rem)/3)]">
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
        className="relative isolate overflow-x-clip px-4 py-32 text-center"
      >
        {/* The workshop wall fades up out of the page and back into it: no hard edges. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-pegboard [mask-image:linear-gradient(to_bottom,transparent,black_12rem,black_calc(100%-12rem),transparent)]"
        />
        <SectionTitle
          id="calendar-title"
          lead="On the calendar."
          tag="Worth the drive."
          tone="lead"
        />
        <p className="mt-8 text-lg">
          Fly-ins, races and shows, close to home and a road trip away.
        </p>
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
