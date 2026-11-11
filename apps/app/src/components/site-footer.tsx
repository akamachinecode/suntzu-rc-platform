import { ArrowUp, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Wordmark } from "@/components/wordmark";
import { GUIDES, IN_THE_WORKS, AMA, FAA_RULES, SERVICES } from "@workspace/shared";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Learn with us",
    links: SERVICES.map((service) => ({ label: service.title, href: `/learn#${service.id}` })),
  },
  {
    title: "Guides",
    links: [
      ...GUIDES.map((guide) => ({ label: guide.title, href: guide.href })),
      { label: "Every guide", href: "/guides" },
    ],
  },
  {
    title: "The local scene",
    links: [
      { label: "Events calendar", href: "/events" },
      { label: "Where to fly and race", href: "/places" },
      { label: "Can I fly here?", href: "/places/can-i-fly-here" },
      { label: "Clubs and tracks", href: "/clubs" },
      { label: "Try RC near you", href: "/try" },
      { label: "For clubs and tracks", href: "/organise" },
      { label: "Share your build", href: "/community#share-title" },
      { label: "Talk to the crew", href: "/contact" },
    ],
  },
  {
    title: "Fly legal",
    links: [
      ...FAA_RULES.slice(0, 3).map((rule) => ({ ...rule.source, external: true })),
      { ...AMA.source, external: true },
      { label: "Our guide to the rules", href: "/guides/flying-legally" },
    ],
  },
];

const INKS = ["bg-primary", "bg-sky", "bg-lead", "bg-mat", "bg-panel"];

/** The site's sign-off: a finish line, the way in, every page and the official links. */
export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      {/* the finish line */}
      <div
        aria-hidden="true"
        className="h-6 bg-[repeating-conic-gradient(var(--foreground)_0_25%,var(--panel)_0_50%)] [background-size:24px_24px]"
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="flex flex-col gap-8 border-b-2 border-background/15 py-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-4xl leading-[0.95] font-black text-balance font-wide sm:text-6xl">
              Bring the model.
              <br />
              <span className="text-primary">We&apos;ll bring the field.</span>
            </p>
            <p className="mt-5 max-w-md text-background/70">
              Three RC fans in South Florida. Lessons, local events and guides to planes,
              helicopters and cars, from people who have crashed all three.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={SITE.cta.href}>{SITE.cta.label}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/learn">See what we teach</Link>
            </Button>
          </div>
        </div>

        <nav
          aria-label="Footer"
          className="grid grid-cols-1 gap-x-8 gap-y-10 py-12 sm:grid-cols-2 lg:grid-cols-4"
        >
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-xs font-black tracking-[0.2em] text-primary uppercase">
                {column.title}
              </h2>
              <ul className="mt-4 grid gap-2.5 pointer-coarse:gap-0">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group tap inline-flex items-baseline gap-1 text-background/80 underline-offset-4 hover:text-background hover:underline"
                      >
                        {link.label}
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-3.5 shrink-0 self-center opacity-60 group-hover:opacity-100"
                        />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="tap text-background/80 underline-offset-4 hover:text-background hover:underline"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {column.title === "Guides" ? (
                <>
                  <p className="mt-6 text-xs font-bold tracking-[0.2em] text-background/50 uppercase">
                    In the works
                  </p>
                  <ul className="mt-2 grid gap-1.5 text-sm text-background/50">
                    {IN_THE_WORKS.map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ))}
        </nav>
      </div>

      {/* the big sign-off */}
      <div aria-hidden="true" className="overflow-hidden px-5 sm:px-6">
        {/* Fills the width: "suntzu rc" is 4.67em wide, so the size is the room left over 4.8. */}
        <Wordmark className="mx-auto block max-w-7xl text-center text-[length:min(calc((100vw_-_3rem)/4.8),16.5rem)] leading-[0.78] whitespace-nowrap text-primary select-none" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 text-sm text-background/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {SITE.name}. Made in {SITE.region}.{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-background">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-background">
            Terms
          </Link>
        </p>
        <span aria-hidden="true" className="flex gap-1">
          {INKS.map((ink) => (
            <span key={ink} className={cn("size-3 border border-background/40", ink)} />
          ))}
        </span>
        <a
          href="#"
          className="tap inline-flex items-center gap-1.5 font-semibold text-background/80 hover:text-background"
        >
          Back to the top
          <ArrowUp aria-hidden="true" className="size-4" />
        </a>
      </div>
    </footer>
  );
}
