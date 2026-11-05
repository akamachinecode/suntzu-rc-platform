import { XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { FollowKey } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { SignOutButton } from "@/app/notes/sign-out-button";
import { EventCard } from "@/components/events/event-card";
import { CalendarSubscribe } from "@/components/events/calendar-subscribe";
import { getApi } from "@/lib/api";
import { DISCIPLINE_LABELS } from "@/lib/events";
import { deleteAccount, unfollow } from "./actions";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "My SunTzu RC",
  description: "What you follow, where you're going and how SunTzu RC keeps you posted.",
  robots: { index: false },
};

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const { delete: deletion } = await searchParams;
  const api = await getApi();
  const [profile, following] = await Promise.all([api.GET("/me"), api.GET("/me/following")]);
  if (profile.response.status === 401 || !profile.data) redirect("/sign-in?next=/me");
  const me = profile.data;
  const follows = following.data;

  return (
    <>
      <header className="mx-auto max-w-7xl px-4 pt-16 pb-10 sm:pt-24">
        <h1 className="text-5xl leading-[0.92] font-black tracking-tight font-wide sm:text-7xl">
          {me.name ? `Hi, ${me.name.split(" ")[0]}.` : "My SunTzu RC"}
        </h1>
        <p className="mt-6 max-w-[56ch] text-lg text-pretty">
          Everything you follow lands in your own calendar, and we tell you when it changes. Signed
          in as {me.email}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {me.role === "crew" && (
            <Button asChild>
              <Link href="/crew">Crew console</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/organise">
              {me.organiserOf.length ? "Your clubs" : "Run a club or track?"}
            </Link>
          </Button>
          <SignOutButton />
        </div>
      </header>

      <section aria-labelledby="going-title" className="mx-auto max-w-7xl px-4 pb-16">
        <h2 id="going-title" className="text-3xl font-black font-wide">
          Where you&apos;re going
        </h2>
        {follows?.going.length ? (
          <div className="mt-6 grid gap-5">
            {follows.going.map((event) => (
              <EventCard key={event.slug} event={event} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-pretty text-muted-foreground">
            Nothing yet. Open an event and tap &ldquo;I&apos;m going&rdquo;.{" "}
            <Link
              href="/events"
              className="font-semibold text-foreground underline underline-offset-4"
            >
              Browse the calendar
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby="following-title" className="bg-cutting-mat text-mat-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <h2 id="following-title" className="text-3xl font-black font-wide">
              What you follow
            </h2>
            <p className="mt-3 max-w-[48ch] text-pretty">
              Events, clubs, fields and whole disciplines. Their upcoming events go in your
              calendar.
            </p>
            <ul className="mt-6 grid gap-3">
              {follows?.events.map((event) => (
                <FollowRow
                  key={event.slug}
                  href={`/events/${event.slug}`}
                  label={event.name}
                  kind="Event"
                  followKey={{ target: "event", id: event.slug }}
                />
              ))}
              {follows?.hosts.map((host) => (
                <FollowRow
                  key={host.slug}
                  href={`/clubs/${host.slug}`}
                  label={host.name}
                  kind="Club"
                  followKey={{ target: "host", id: host.slug }}
                />
              ))}
              {follows?.places.map((place) => (
                <FollowRow
                  key={place.slug}
                  href={`/places/${place.slug}`}
                  label={place.name}
                  kind="Place"
                  followKey={{ target: "place", id: place.slug }}
                />
              ))}
              {follows?.disciplines.map((discipline) => (
                <FollowRow
                  key={discipline}
                  href={`/events?discipline=${discipline}`}
                  label={DISCIPLINE_LABELS[discipline]}
                  kind="Every event"
                  followKey={{ target: "discipline", id: discipline }}
                />
              ))}
              {!follows ||
              follows.events.length +
                follows.hosts.length +
                follows.places.length +
                follows.disciplines.length ===
                0 ? (
                <li className="text-pretty">
                  Nothing yet. Look for the bell on events, clubs and fields.
                </li>
              ) : null}
            </ul>
          </div>
          <div className="text-foreground">
            <CalendarSubscribe
              feed={me.calendarUrl}
              title="Your own calendar"
              lead="Everything you follow and every event you're going to, in your phone's calendar. Keep this link to yourself: anyone with it can see your calendar."
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="settings-title" className="mx-auto max-w-3xl px-4 py-16">
        <h2 id="settings-title" className="text-3xl font-black font-wide">
          Settings
        </h2>
        <div className="mt-6 rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard sm:p-8">
          <ProfileForm profile={me} />
        </div>
      </section>

      <section aria-labelledby="delete-title" className="mx-auto max-w-3xl px-4 pb-24">
        <h2 id="delete-title" className="text-2xl font-black font-wide">
          Delete your account
        </h2>
        <p className="mt-3 max-w-[60ch] text-pretty">
          Your email, settings, follows and &ldquo;going&rdquo; are deleted at once. Events and
          corrections you sent stay on SunTzu RC, without your name.
        </p>
        {deletion === "failed" ? (
          <p role="alert" className="mt-3 font-semibold text-destructive">
            We couldn&apos;t delete your account just now. Nothing was deleted: try again, or write
            to us.
          </p>
        ) : null}
        <form action={deleteAccount} className="mt-5 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            Type &ldquo;delete&rdquo; to confirm
            <input
              name="confirm"
              required
              pattern="delete"
              autoComplete="off"
              className="h-11 rounded-md border-2 border-foreground bg-background px-3"
            />
          </label>
          <Button type="submit" variant="destructive" size="lg">
            Delete my account
          </Button>
        </form>
      </section>
    </>
  );
}

function FollowRow({
  href,
  label,
  kind,
  followKey,
}: {
  href: string;
  label: string;
  kind: string;
  followKey: FollowKey;
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border-2 border-foreground bg-panel px-4 py-3 text-foreground shadow-hard-sm">
      <span>
        <span className="block text-xs font-semibold tracking-wide uppercase">{kind}</span>
        <Link href={href} className="font-bold underline-offset-4 hover:underline">
          {label}
        </Link>
      </span>
      <form action={unfollow.bind(null, followKey)}>
        <Button type="submit" variant="ghost" size="icon" aria-label={`Stop following ${label}`}>
          <XIcon aria-hidden="true" />
        </Button>
      </form>
    </li>
  );
}
