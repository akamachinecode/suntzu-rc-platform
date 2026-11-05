import { BarChart3, CalendarCheck, Code2, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { PageHeader } from "@/components/page-header";
import { getApi, getPublicApi } from "@/lib/api";
import { ClaimForm } from "./claim-form";
import { VerifyPanel } from "./verify-panel";

export const metadata: Metadata = {
  title: "For clubs and tracks",
  description:
    "Run an RC club, field or track in Florida? Publish your events on SunTzu RC for free: a verified page, a calendar widget for your site, and people who follow and show up.",
};

export const dynamic = "force-dynamic";

const PERKS = [
  {
    icon: ShieldCheck,
    title: "A verified page",
    body: "Your club, fields and events in one place Google understands, with a Verified badge.",
  },
  {
    icon: CalendarCheck,
    title: "Publish in a minute",
    body: "Your events go live at once, and changes reach everyone who follows or is going.",
  },
  {
    icon: Code2,
    title: "A widget for your site",
    body: "Paste one line and your website shows your upcoming events, always current.",
  },
  {
    icon: Users,
    title: "People who show up",
    body: "See how many follow your club and say they're going, and get newcomers who ask to try.",
  },
  {
    icon: BarChart3,
    title: "A monthly report",
    body: "Followers, going, and what's coming up, in your inbox on the first of each month.",
  },
] as const;

export default async function OrganisePage({ searchParams }: PageProps<"/organise">) {
  const { club } = await searchParams;
  const api = await getApi();
  const [mine, hosts] = await Promise.all([api.GET("/organise"), getPublicApi().GET("/hosts")]);
  const signedIn = mine.response.status !== 401;

  return (
    <>
      <PageHeader
        title="Run a club or track? Publish with us."
        lead="Free, forever. SunTzu RC puts your events in front of every RC pilot and racer in Florida, and gives you something back for it."
      />
      <section aria-label="What you get" className="mx-auto max-w-7xl px-4 pb-16">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {PERKS.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-xl border-2 border-foreground bg-panel p-5 shadow-hard"
            >
              <Icon aria-hidden className="size-7" />
              <h2 className="mt-3 text-lg font-black font-wide">{title}</h2>
              <p className="mt-2 text-pretty">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="claim-title" className="bg-cutting-mat text-mat-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <h2 id="claim-title" className="text-3xl font-black font-wide">
              Claim your club
            </h2>
            <p className="mt-3 max-w-[50ch] text-pretty">
              Prove you run it with an email at your club&apos;s domain, a code on its website, or a
              quick check by the crew. Several officers can manage the same club.
            </p>
            {signedIn && mine.data?.length ? (
              <ul className="mt-8 grid gap-4 text-foreground">
                {mine.data.map((claim) => (
                  <VerifyPanel key={claim.host.slug} claim={claim} />
                ))}
              </ul>
            ) : null}
          </div>
          <div className="rounded-xl border-2 border-foreground bg-panel p-6 text-foreground shadow-hard sm:p-8">
            {signedIn ? (
              <ClaimForm
                hosts={hosts.data ?? []}
                {...(typeof club === "string" && { preselected: club })}
              />
            ) : (
              <div className="grid gap-4">
                <p className="text-lg text-pretty">
                  Sign in first: it takes an email and one click, no password.
                </p>
                <Button asChild size="lg" className="justify-self-start">
                  <Link
                    href={`/sign-in?next=${encodeURIComponent(`/organise${typeof club === "string" ? `?club=${club}` : ""}`)}`}
                  >
                    Sign in to claim
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
