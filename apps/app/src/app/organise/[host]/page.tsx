import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { AddEventForm } from "@/app/crew/add-event-form";
import { getApi } from "@/lib/api";
import { ACCESS_LABELS } from "@/lib/places";
import { SITE } from "@/lib/site";
import { confirmPlace, publishEvent } from "../actions";
import { ClubForm } from "./club-form";
import { EventRow } from "./event-row";

export const metadata: Metadata = {
  title: "Club dashboard",
  description: "Publish your club's events, keep its page current and share its calendar.",
  robots: { index: false },
};

export default async function ClubDashboard({ params }: PageProps<"/organise/[host]">) {
  const { host } = await params;
  const api = await getApi();
  const { data, response } = await api.GET("/organise/{host}", { params: { path: { host } } });
  if (response.status === 401) redirect(`/sign-in?next=/organise/${host}`);
  if (!data) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24">
        <h1 className="text-5xl font-black font-wide">Not yet</h1>
        <p className="mt-4 text-lg">
          Only this club&apos;s verified organisers can open its dashboard.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/organise?club=${host}`}>Claim it</Link>
        </Button>
      </section>
    );
  }
  const widget = `<iframe src="${new URL(`/embed/clubs/${data.host.slug}`, SITE.url).toString()}" title="${data.host.name} events on Servo" width="100%" height="480" style="border:0" loading="lazy"></iframe>`;

  return (
    <>
      <header className="mx-auto max-w-7xl px-4 pt-16 pb-8 sm:pt-20">
        <p className="text-sm font-semibold">Club dashboard</p>
        <h1 className="mt-2 text-5xl leading-[0.92] font-black tracking-tight font-wide sm:text-6xl">
          {data.host.name}
        </h1>
        <ul className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
          <li className="rounded-md border-2 border-foreground bg-primary px-3 py-1">
            {data.followers} follow the club
          </li>
          <li className="rounded-md border-2 border-foreground bg-panel px-3 py-1">
            {data.goingTotal} going to upcoming events
          </li>
          <li className="rounded-md border-2 border-foreground bg-panel px-3 py-1">
            {data.events.length} events
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/clubs/${data.host.slug}`}>See the public page</Link>
          </Button>
        </div>
      </header>

      <section aria-labelledby="publish-title" className="bg-cutting-mat text-mat-foreground">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 id="publish-title" className="text-3xl font-black font-wide">
            Publish an event
          </h2>
          <p className="mt-2 max-w-[60ch] text-pretty">
            It goes live at once with your club&apos;s Verified badge, in the calendar feeds and in
            followers&apos; inboxes.
          </p>
          <div className="mt-6 rounded-xl border-2 border-foreground bg-panel p-6 text-foreground shadow-hard sm:p-8">
            <AddEventForm places={data.places} action={publishEvent.bind(null, data.host.slug)} />
          </div>
        </div>
      </section>

      <section aria-labelledby="events-title" className="mx-auto max-w-7xl px-4 py-16">
        <h2 id="events-title" className="text-3xl font-black font-wide">
          Your events
        </h2>
        {data.events.length ? (
          <ul className="mt-6 grid gap-4">
            {data.events.map((event) => (
              <EventRow key={event.slug} host={data.host.slug} event={event} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted-foreground">No upcoming events yet.</p>
        )}
      </section>

      <section aria-labelledby="places-title" className="mx-auto max-w-7xl px-4 pb-16">
        <h2 id="places-title" className="text-3xl font-black font-wide">
          Your fields and tracks
        </h2>
        <p className="mt-2 max-w-[60ch] text-pretty">
          Confirm the details once a year: the page shows &ldquo;last checked&rdquo; with
          today&apos;s date, which is what visitors trust.
        </p>
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {data.places.map((place) => (
            <li
              key={place.slug}
              className="rounded-xl border-2 border-foreground bg-panel p-5 shadow-hard-sm"
            >
              <p className="font-bold">
                <Link href={`/places/${place.slug}`} className="underline-offset-4 hover:underline">
                  {place.name}
                </Link>
              </p>
              <form
                action={confirmPlace.bind(null, data.host.slug, place.slug)}
                className="mt-3 grid gap-3"
              >
                <label className="grid gap-1 text-sm font-semibold">
                  Who can use it
                  <select
                    name="access"
                    defaultValue={place.access === "unknown" ? "permission" : place.access}
                    className="h-10 rounded-md border-2 border-foreground bg-background px-2"
                  >
                    {(["public", "guests", "members", "permission"] as const).map((value) => (
                      <option key={value} value={value}>
                        {ACCESS_LABELS[value].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Notes for visitors
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={place.notes}
                    className="rounded-md border-2 border-foreground bg-background px-2 py-1 font-normal"
                  />
                </label>
                <Button type="submit" size="sm" className="justify-self-start">
                  Confirm details
                </Button>
              </form>
            </li>
          ))}
          {data.places.length === 0 ? (
            <li className="text-muted-foreground">
              No fields linked to the club yet. Tell the crew which one is yours.
            </li>
          ) : null}
        </ul>
      </section>

      <section aria-labelledby="widget-title" className="mx-auto max-w-7xl px-4 pb-16">
        <h2 id="widget-title" className="text-3xl font-black font-wide">
          Your calendar on your website
        </h2>
        <p className="mt-2 max-w-[60ch] text-pretty">
          Paste this where you want your upcoming events to show. It updates itself.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border-2 border-foreground bg-panel p-4 text-sm whitespace-pre-wrap shadow-hard-sm">
          <code>{widget}</code>
        </pre>
        <p className="mt-3 text-sm">
          <a
            href={`/embed/clubs/${data.host.slug}`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Preview the widget
          </a>
        </p>
      </section>

      <section aria-labelledby="club-title" className="mx-auto max-w-3xl px-4 pb-24">
        <h2 id="club-title" className="text-3xl font-black font-wide">
          The club&apos;s page
        </h2>
        <div className="mt-6 rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard sm:p-8">
          <ClubForm data={data} />
        </div>
      </section>
    </>
  );
}
