import type { Metadata } from "next";
import Link from "next/link";
import { DriftWord } from "@/components/home/drift-word";
import { ServoHero } from "@/components/home/servo-hero";
import { DecalSheet } from "@/components/home/decal-sheet";
import { Button } from "@/components/ui/button";
import { EVENTS, KINDS, byDate } from "@/content/events";
import { GUIDES } from "@/content/guides";
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

const parts = [
  {
    name: "Brushless motor",
    role: "Spins the prop, rotor or wheels.",
    figure: "KV rating",
    detail: "rpm per volt, unloaded. 1000 KV on 11.1 V is about 11,100 rpm.",
    tilt: "-rotate-2",
  },
  {
    name: "ESC",
    role: "Turns battery power into three-phase pulses the motor can use.",
    figure: "Amps",
    detail:
      "Pick one rated above your motor's peak draw. Most include a BEC to power the receiver.",
    tilt: "rotate-1",
  },
  {
    name: "LiPo battery",
    role: "Light, punchy and unforgiving if mistreated.",
    figure: "3.7 V per cell",
    detail:
      "4.2 V full, never below 3.0 V, around 3.8 to 3.9 V for storage. Always balance charge.",
    tilt: "rotate-2",
  },
  {
    name: "Receiver",
    role: "Listens to your transmitter on 2.4 GHz.",
    figure: "Channels",
    detail: "One per thing you control. A plane needs four, a heli needs six.",
    tilt: "-rotate-1",
  },
  {
    name: "Servo",
    role: "Moves a control surface or linkage to an exact angle.",
    figure: "1000 to 2000 µs",
    detail: "The pulse width it reads every 20 ms. Torque is quoted in kg·cm.",
    tilt: "rotate-1",
  },
  {
    name: "Gyro",
    role: "Holds the model steady faster than your thumbs can.",
    figure: "3 axes",
    detail:
      "Roll, pitch and yaw. Essential on helicopters, helpful on planes, and it keeps cars straight.",
    tilt: "-rotate-2",
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

      <section aria-labelledby="crew-title" className="overflow-hidden px-4 py-24">
        <DecalSheet decals={SERVICES.map(({ id, short, tag }) => ({ id, short, tag }))} />
      </section>

      <section aria-labelledby="disciplines-title" className="border-t-2 border-foreground">
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
        className="scroll-mt-16 border-y-2 border-foreground bg-cutting-mat text-mat-foreground"
      >
        <div className="mx-auto max-w-7xl px-4 py-24">
          <h2
            id="inside-title"
            className="max-w-3xl text-4xl leading-[0.95] font-black text-balance font-wide sm:text-6xl"
          >
            Same six parts in every one of them.
          </h2>
          <p className="mt-5 max-w-[52ch] text-lg text-pretty">
            Plane, heli or truck, the electronics are close cousins. Learn these once and you can
            work on anything.
          </p>
          <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {parts.map((p) => (
              <li
                key={p.name}
                className={`${p.tilt} rounded-lg border-2 border-foreground bg-panel p-6 text-foreground shadow-hard motion-reduce:rotate-0`}
              >
                <h3 className="text-xl font-black font-wide">{p.name}</h3>
                <p className="mt-1 text-sm">{p.role}</p>
                <p className="mt-5 inline-block rounded-md border-2 border-foreground bg-primary px-2.5 py-1 text-lg font-bold">
                  {p.figure}
                </p>
                <p className="mt-3 text-sm text-pretty text-muted-foreground">{p.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="bench-title" className="mx-auto max-w-7xl px-4 py-24">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2
              id="bench-title"
              className="text-4xl leading-[0.95] font-black text-balance font-wide sm:text-6xl"
            >
              From the bench
            </h2>
            <Link
              href={GUIDES[0].href}
              className="group mt-8 block rounded-xl border-2 border-foreground bg-primary p-8 shadow-hard-lg transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 motion-reduce:transform-none sm:p-10"
            >
              <h3 className="text-3xl leading-tight font-black text-balance font-wide sm:text-4xl">
                {GUIDES[0].title}
              </h3>
              <p className="mt-4 max-w-[52ch] text-lg text-pretty">{GUIDES[0].dek}</p>
              <p className="mt-8 font-semibold underline underline-offset-4 group-hover:decoration-2">
                Read the guide
              </p>
            </Link>
          </div>
          <div>
            <h2 className="text-2xl font-black font-wide sm:text-3xl">Next on the calendar</h2>
            <ul className="mt-6 grid gap-4">
              {upcoming.map((event) => (
                <li
                  key={event.id}
                  className="rounded-lg border-2 border-foreground bg-panel p-5 shadow-hard-sm"
                >
                  <p className="text-lg font-black font-wide">{event.when}</p>
                  <p className="mt-1 text-lg font-bold">{event.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {KINDS[event.kind].label}, {event.place}
                  </p>
                </li>
              ))}
            </ul>
            <Link
              href="/events"
              className="mt-6 inline-block font-semibold underline underline-offset-4"
            >
              The whole calendar
            </Link>
          </div>
        </div>
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
