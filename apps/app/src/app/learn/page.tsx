import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@workspace/ui/components/button";
import { SERVICES, STEPS } from "@workspace/shared";

export const metadata: Metadata = {
  title: "Learn RC in South Florida",
  description:
    "Lessons, first-model help, advanced courses, introductions to shops and clubs, and help with FAA rules, from three RC fans in South Florida.",
};

export default function LearnPage() {
  return (
    <>
      <PageHeader
        title="Learn RC with people who still crash."
        lead="We're three RC fans in South Florida. We'll teach you to fly, hover or drive, help you pick a first model that won't end up in a closet, and introduce you to the shops, clubs and fields that make the hobby fun here."
      >
        <div className="mt-8 flex flex-wrap gap-4">
          <Button asChild size="lg">
            <Link href="/contact?topic=lessons">Book a lesson</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact?topic=first-model">Help me pick a model</Link>
          </Button>
        </div>
      </PageHeader>

      <section aria-labelledby="services-title" className="bg-panel">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <h2 id="services-title" className="text-3xl font-black font-wide sm:text-5xl">
            What we can do for you
          </h2>
          <div className="mt-12 grid gap-x-12 gap-y-14 md:grid-cols-2">
            {SERVICES.map((service) => (
              <article key={service.id} id={service.id} className="scroll-mt-24">
                <h3 className="text-2xl font-bold">{service.title}</h3>
                <p className="mt-2 text-lg text-pretty">{service.lead}</p>
                <ul className="mt-5 grid gap-3 border-l-4 border-primary pl-5">
                  {service.points.map((point) => (
                    <li key={point} className="text-pretty text-muted-foreground">
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/contact?topic=${service.id}`}
                  className="mt-5 inline-block font-semibold underline underline-offset-4 hover:decoration-2"
                >
                  Ask about {service.title.toLowerCase()}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 py-20">
        <h2 id="how-title" className="text-3xl font-black font-wide sm:text-5xl">
          How it works
        </h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard"
            >
              <span
                aria-hidden="true"
                className="grid size-12 place-items-center rounded-full border-2 border-foreground bg-primary text-xl font-black font-wide"
              >
                {index + 1}
              </span>
              <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
              <p className="mt-2 text-pretty text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="who-title" className="mx-auto max-w-7xl px-4 pb-24">
        <div className="grid gap-8 rounded-xl border-2 border-foreground bg-primary p-8 shadow-hard-lg sm:p-12 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <h2 id="who-title" className="text-3xl font-black font-wide sm:text-4xl">
              Who you&apos;ll be flying with
            </h2>
            <p className="mt-4 max-w-[52ch] text-lg text-pretty">
              Between the three of us we fly planes, helicopters and cars, and we&apos;ve broken
              most of them at least once. We teach the way we wish someone had taught us: slowly, on
              a simulator first, and with spare props in the truck.
            </p>
          </div>
          <div className="md:justify-self-end">
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Tell us what you want to do</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
