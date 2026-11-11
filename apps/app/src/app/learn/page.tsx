import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Hand,
  type LucideIcon,
  MapPin,
  MessageCircle,
  Radar,
  Scale,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { SectionTitle } from "@/components/home/section-title";
import { Tag } from "@/components/home/tag";
import advancedPlate from "@/components/learn/plates/advanced.svg";
import firstModelPlate from "@/components/learn/plates/first-model.svg";
import lessonsPlate from "@/components/learn/plates/lessons.svg";
import { StepTickets } from "@/components/learn/step-tickets";
import { LEARN_ASK, LEARN_FAQ } from "@/content/learn";
import { Button } from "@workspace/ui/components/button";
import { SERVICES, STEPS } from "@workspace/shared";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Learn RC in South Florida",
  description:
    "Lessons, first-model help, advanced courses, introductions to shops and clubs, and help with FAA rules, from three RC fans in South Florida.",
};

type ServiceId = (typeof SERVICES)[number]["id"];

/** A drawing from one of the guides, and where to move it yourself. */
type Plate = { image: StaticImageData; alt: string; caption: string; href: string };

/** Where a service points to on the site instead of a drawing. */
type Shortcut = { href: string; icon: LucideIcon; title: string; body: string };

/**
 * How each service looks: its band's colour, and beside it either a drawing from the guides or
 * the pages of the site that already do that job.
 */
const BANDS: Record<ServiceId, { tone: string; plate?: Plate; shortcuts?: Shortcut[] }> = {
  lessons: {
    tone: "bg-sky",
    plate: {
      image: lessonsPlate,
      alt: "A bench rig: a transmitter stick wired to a receiver and a servo, whose pushrod moves a yellow elevator.",
      caption: "Your thumb, the servo, the elevator: the first thing we teach.",
      href: "/guides/rc-planes#chain",
    },
  },
  "first-model": {
    tone: "bg-primary",
    plate: {
      image: firstModelPlate,
      alt: "A balance beam on a stand, with a yellow battery that slides along it to find the balance point.",
      caption: "Balance checked before day one, so it flies the way it should.",
      href: "/guides/rc-planes#balance",
    },
  },
  advanced: {
    tone: "bg-lead",
    plate: {
      image: advancedPlate,
      alt: "A helicopter rotor head on a bench: three servos tilt the swashplate under two yellow blades.",
      caption: "The swashplate: where helicopter flying gets serious.",
      href: "/guides/rc-helicopters#swashplate",
    },
  },
  connect: {
    tone: "bg-cutting-mat text-mat-foreground",
    shortcuts: [
      {
        href: "/places",
        icon: MapPin,
        title: "Where to fly",
        body: "Club fields, tracks and parks on one map.",
      },
      {
        href: "/clubs",
        icon: Users,
        title: "Clubs and tracks",
        body: "Who runs them and how to join.",
      },
      {
        href: "/events",
        icon: CalendarDays,
        title: "What's on",
        body: "Fly-ins, races and shows worth the drive.",
      },
      {
        href: "/try",
        icon: Hand,
        title: "Try it with a club",
        body: "Tell us where you are, and we'll put you in touch with a club.",
      },
    ],
  },
  rules: {
    tone: "bg-background",
    shortcuts: [
      {
        href: "/places/can-i-fly-here",
        icon: Radar,
        title: "Can I fly here?",
        body: "Tap a spot for a plain answer about airspace and airports nearby.",
      },
      {
        href: "/guides/flying-legally",
        icon: Scale,
        title: "Flying legally",
        body: "TRUST, registration, Remote ID, Florida law and county parks.",
      },
    ],
  },
};

export default function LearnPage() {
  return (
    <>
      <header className="mx-auto grid max-w-7xl gap-12 px-4 pt-14 pb-20 sm:pt-24 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-16">
        <div>
          <p className="text-sm font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Lessons and help, in South Florida
          </p>
          <h1 className="mt-5 text-5xl leading-[0.92] font-black tracking-tight text-balance font-wide sm:text-7xl">
            Learn RC with people who{" "}
            <Tag tone="primary" className="mt-2">
              still crash.
            </Tag>
          </h1>
          <p className="mt-7 max-w-[52ch] text-lg text-pretty sm:text-xl">
            We&apos;re three RC fans in South Florida. We&apos;ll teach you to fly, hover or drive,
            help you pick a first model that won&apos;t end up in a closet, and introduce you to the
            shops, clubs and fields that make the hobby fun here.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/contact?topic=lessons">Book a lesson</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact?topic=first-model">Help me pick a model</Link>
            </Button>
          </div>
          <ul className="mt-9 grid gap-2 text-base font-semibold sm:flex sm:flex-wrap sm:gap-x-6">
            {["Free to ask", "Your model or ours", "Planes, helicopters and cars"].map((fact) => (
              <li key={fact} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-foreground" />
                {fact}
              </li>
            ))}
          </ul>
        </div>

        {/* The menu: every service, one tap from here. */}
        <nav
          aria-labelledby="menu-title"
          className="rounded-xl border-2 border-foreground bg-panel shadow-hard-lg"
        >
          <p
            id="menu-title"
            className="rounded-t-[10px] border-b-2 border-foreground bg-primary px-5 py-3 text-sm font-black tracking-[0.2em] uppercase"
          >
            What we can do for you
          </p>
          <ol className="divide-y-2 divide-foreground/10">
            {SERVICES.map((service, index) => (
              <li key={service.id}>
                <a
                  href={`#${service.id}`}
                  className="group flex min-h-16 items-center gap-4 px-5 py-3 hover:bg-background"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-foreground text-sm font-black font-wide"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-lg leading-tight font-bold">
                    {service.title}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 shrink-0 transition-transform group-hover:translate-x-1"
                  />
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      {SERVICES.map((service, index) => {
        const band = BANDS[service.id];
        const flip = index % 2 === 1;
        return (
          <article
            key={service.id}
            id={service.id}
            aria-labelledby={`${service.id}-title`}
            className={cn("scroll-mt-16 border-t-2 border-foreground", band.tone)}
          >
            <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:py-24 md:grid-cols-2 md:items-center md:gap-16">
              <div className={cn(flip && "md:order-2")}>
                <p className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-12 place-items-center rounded-full border-2 border-foreground bg-panel text-lg font-black text-foreground font-wide"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="-rotate-2 rounded-md border-2 border-foreground bg-panel px-2.5 py-1 text-xs font-black tracking-[0.2em] text-foreground uppercase shadow-hard-sm">
                    {service.short}
                  </span>
                </p>
                <h2
                  id={`${service.id}-title`}
                  className="mt-7 text-4xl leading-[0.95] font-black text-balance font-wide sm:text-5xl"
                >
                  {service.title}
                </h2>
                <p className="mt-5 max-w-[46ch] text-lg text-pretty sm:text-xl">{service.lead}</p>
                <ul className="mt-9 grid max-w-xl gap-6">
                  {service.points.map((point) => (
                    <li key={point} className="border-l-4 border-current pl-4 text-lg text-pretty">
                      {point}
                    </li>
                  ))}
                </ul>
                <p className="mt-10">
                  <Button
                    asChild
                    size="lg"
                    variant={service.id === "lessons" ? "default" : "outline"}
                  >
                    <Link href={`/contact?topic=${service.id}`}>
                      <MessageCircle aria-hidden="true" />
                      {LEARN_ASK[service.id]}
                    </Link>
                  </Button>
                </p>
              </div>

              {band.plate ? (
                <figure className="rounded-xl border-2 border-foreground bg-panel p-4 text-foreground shadow-hard-lg sm:p-6">
                  <Image
                    src={band.plate.image}
                    alt={band.plate.alt}
                    unoptimized
                    className="mx-auto block h-auto w-full max-w-lg"
                  />
                  <figcaption className="mt-4 grid gap-2 border-t-2 border-foreground pt-4 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                    <span className="font-bold text-pretty">{band.plate.caption}</span>
                    <Link
                      href={band.plate.href}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold underline underline-offset-4 sm:min-h-0"
                    >
                      Move it yourself in the guide
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </figcaption>
                </figure>
              ) : null}

              {band.shortcuts ? (
                <ul className="grid gap-4">
                  {band.shortcuts.map((shortcut) => {
                    const Icon = shortcut.icon;
                    return (
                      <li key={shortcut.href}>
                        <Link
                          href={shortcut.href}
                          className="group flex min-h-20 items-center gap-4 rounded-xl border-2 border-foreground bg-panel p-4 text-foreground shadow-hard transition-transform hover:-translate-y-0.5 sm:p-5"
                        >
                          <span
                            aria-hidden="true"
                            className="grid size-12 shrink-0 place-items-center rounded-lg border-2 border-foreground bg-primary"
                          >
                            <Icon className="size-6" strokeWidth={2.25} />
                          </span>
                          <span className="grid min-w-0 flex-1">
                            <span className="text-lg leading-tight font-bold group-hover:underline">
                              {shortcut.title}
                            </span>
                            <span className="text-pretty text-muted-foreground">
                              {shortcut.body}
                            </span>
                          </span>
                          <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </article>
        );
      })}

      <section
        aria-labelledby="how-title"
        className="relative isolate overflow-x-clip border-t-2 border-foreground px-4 py-24 text-center"
      >
        {/* The workshop wall, faded out at the bottom like the home page's. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-pegboard [mask-image:linear-gradient(to_bottom,black,black_calc(100%-12rem),transparent)]"
        />
        <SectionTitle id="how-title" lead="How it works." tag="Three steps." tone="sky" />
        <p className="mx-auto mt-8 max-w-[44ch] text-lg text-pretty">
          From a few lines to us to your first time at the field.
        </p>
        <StepTickets steps={STEPS} />
      </section>

      <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 py-24">
        <h2
          id="faq-title"
          className="text-center text-4xl leading-[0.95] font-black text-balance font-wide sm:text-5xl"
        >
          Before your first lesson
        </h2>
        <div className="mt-12 grid gap-4">
          {LEARN_FAQ.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border-2 border-foreground bg-panel shadow-hard [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg leading-snug font-bold">
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className="size-5 shrink-0 transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="px-5 pb-5 text-pretty">
                <p className="text-muted-foreground">{item.answer}</p>
                {"link" in item ? (
                  <Link
                    href={item.link.href}
                    className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-4"
                  >
                    {item.link.label}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="ready-title" className="mx-auto max-w-7xl px-4 pb-24">
        <div className="flex flex-col items-start gap-7 rounded-xl border-2 border-foreground bg-primary p-7 shadow-hard-lg sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2
              id="ready-title"
              className="max-w-[18ch] text-3xl leading-tight font-black text-balance font-wide sm:text-4xl"
            >
              Ready when you are.
            </h2>
            <p className="mt-3 max-w-[46ch] text-lg text-pretty">
              A few lines are enough: what you want to fly, hover or drive, and where you are.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="outline">
              <Link href="/contact?topic=lessons">Book a lesson</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Tell us what you want to do</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
