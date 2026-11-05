import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { getApi } from "@/lib/api";
import { searchUrl } from "@/lib/search";
import { handleMessage, seeFeedback } from "./actions";
import { AddEventForm } from "./add-event-form";
import { ReviewCard } from "./review-card";

export const metadata: Metadata = {
  title: "Crew console",
  description:
    "Review what the engine isn't sure about, read messages and feedback, and see what people searched for and didn't find.",
  robots: { index: false },
};

export default async function CrewPage() {
  const api = await getApi();
  const [summary, reviews, messages, feedback, places, misses] = await Promise.all([
    api.GET("/crew/summary"),
    api.GET("/crew/reviews"),
    api.GET("/crew/messages"),
    api.GET("/crew/feedback"),
    api.GET("/places"),
    api.GET("/search/misses"),
  ]);
  if (summary.response.status === 401) redirect("/sign-in?next=/crew");
  if (!summary.data) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24">
        <h1 className="text-5xl font-black font-wide">Crew only</h1>
        <p className="mt-4 text-lg">
          This console is for the SunTzu RC crew. Ask the owner to add your email.
        </p>
        <Button asChild className="mt-6">
          <Link href="/me">Back to My SunTzu RC</Link>
        </Button>
      </section>
    );
  }
  const counts = summary.data;

  return (
    <>
      <header className="mx-auto max-w-7xl px-4 pt-16 pb-8 sm:pt-20">
        <h1 className="text-5xl leading-[0.92] font-black tracking-tight font-wide sm:text-6xl">
          Crew console
        </h1>
        <ul className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
          <li className="rounded-md border-2 border-foreground bg-primary px-3 py-1">
            {counts.openReviews} to review
          </li>
          <li className="rounded-md border-2 border-foreground bg-panel px-3 py-1">
            {counts.openMessages} messages
          </li>
          <li className="rounded-md border-2 border-foreground bg-panel px-3 py-1">
            {counts.newFeedback} feedback
          </li>
          <li className="rounded-md border-2 border-foreground bg-panel px-3 py-1">
            {counts.openTryRequests} &ldquo;try it&rdquo; requests
          </li>
          <li className="rounded-md border-2 border-foreground bg-panel px-3 py-1">
            {counts.pendingClaims} club claims
          </li>
        </ul>
        <nav
          aria-label="Sections"
          className="mt-6 flex flex-wrap gap-4 text-sm font-semibold underline underline-offset-4"
        >
          <a href="#queue">Queue</a>
          <a href="#add">Add an event</a>
          <a href="#inbox">Inbox</a>
          <a href="#feedback">Feedback</a>
          <a href="#searches">Searched, not found</a>
          <Link href="/crew/claims">Club claims and try-it requests</Link>
        </nav>
      </header>

      <section id="queue" aria-labelledby="queue-title" className="mx-auto max-w-7xl px-4 pb-16">
        <h2 id="queue-title" className="text-3xl font-black font-wide">
          Queue
        </h2>
        <p className="mt-2 max-w-[70ch] text-pretty text-muted-foreground">
          What the engine isn&apos;t sure about. The source&apos;s exact words are under each field:
          check them against the page before you decide.
        </p>
        <div className="mt-6 grid gap-6">
          {reviews.data?.length ? (
            reviews.data.map((review) => <ReviewCard key={review.id} review={review} />)
          ) : (
            <p className="rounded-xl border-2 border-dashed border-foreground p-6 text-lg">
              Nothing to review. The engine is happy.
            </p>
          )}
        </div>
      </section>

      <section id="add" aria-labelledby="add-title" className="bg-cutting-mat text-mat-foreground">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 id="add-title" className="text-3xl font-black font-wide">
            Add an event
          </h2>
          <p className="mt-2 max-w-[60ch] text-pretty">
            From a flyer, a Facebook post or a phone call. It&apos;s published at once and the
            engine links to it when it finds it on the web.
          </p>
          <div className="mt-6 rounded-xl border-2 border-foreground bg-panel p-6 text-foreground shadow-hard sm:p-8">
            <AddEventForm places={places.data ?? []} />
          </div>
        </div>
      </section>

      <section id="inbox" aria-labelledby="inbox-title" className="mx-auto max-w-7xl px-4 py-16">
        <h2 id="inbox-title" className="text-3xl font-black font-wide">
          Inbox
        </h2>
        <ul className="mt-6 grid gap-4">
          {messages.data?.length ? (
            messages.data.map((message) => (
              <li
                key={message.id}
                className={`grid gap-2 rounded-xl border-2 border-foreground p-5 ${message.handled ? "bg-background opacity-70" : "bg-panel shadow-hard-sm"}`}
              >
                <p className="text-sm font-semibold">
                  {message.kind === "build" ? "Build" : (message.topic ?? "Message")} ·{" "}
                  {message.name} &lt;
                  <a href={`mailto:${message.email}`} className="underline underline-offset-4">
                    {message.email}
                  </a>
                  &gt; ·{" "}
                  {new Date(message.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="text-pretty whitespace-pre-wrap">{message.body}</p>
                {message.link ? (
                  <a
                    href={message.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline underline-offset-4"
                  >
                    {message.link}
                  </a>
                ) : null}
                {!message.handled ? (
                  <form action={handleMessage.bind(null, message.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      Mark as handled
                    </Button>
                  </form>
                ) : null}
              </li>
            ))
          ) : (
            <li className="text-muted-foreground">No messages.</li>
          )}
        </ul>
      </section>

      <section
        id="feedback"
        aria-labelledby="feedback-title"
        className="mx-auto max-w-7xl px-4 pb-16"
      >
        <h2 id="feedback-title" className="text-3xl font-black font-wide">
          Feedback after events
        </h2>
        <ul className="mt-6 grid gap-4">
          {feedback.data?.length ? (
            feedback.data.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-foreground bg-panel p-5"
              >
                <p>
                  <strong>{item.right ? "Right" : "Wrong"}</strong> about{" "}
                  <Link
                    href={`/events/${item.event.slug}`}
                    className="underline underline-offset-4"
                  >
                    {item.event.name}
                  </Link>
                  {item.note ? `: “${item.note}”` : ""}
                </p>
                <form action={seeFeedback.bind(null, item.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    Seen
                  </Button>
                </form>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground">No new feedback.</li>
          )}
        </ul>
      </section>

      <section
        id="searches"
        aria-labelledby="searches-title"
        className="mx-auto max-w-7xl px-4 pb-24"
      >
        <h2 id="searches-title" className="text-3xl font-black font-wide">
          Searched, not found
        </h2>
        <p className="mt-2 max-w-[70ch] text-pretty text-muted-foreground">
          What people looked for in the last 90 days and found nothing, or nothing with every word,
          most frequent first. The words only: never who searched, from where or on what. Add the
          event or the place, or ask for a pinned answer in{" "}
          <code>apps/api/src/search/query.ts</code>.
        </p>
        {misses.data?.length ? (
          <div className="mt-6 overflow-x-auto rounded-xl border-2 border-foreground bg-panel">
            <table className="w-full text-left">
              <thead className="border-b-2 border-foreground text-sm">
                <tr>
                  <th scope="col" className="px-4 py-2">
                    Search
                  </th>
                  <th scope="col" className="px-4 py-2 text-right">
                    Times
                  </th>
                  <th scope="col" className="px-4 py-2 text-right">
                    Results
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Last
                  </th>
                </tr>
              </thead>
              <tbody>
                {misses.data.map((miss) => (
                  <tr key={miss.words} className="border-t border-foreground/20">
                    <td className="px-4 py-2">
                      <Link href={searchUrl(miss.words)} className="underline underline-offset-4">
                        {miss.words}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{miss.searches}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{miss.results}</td>
                    <td className="px-4 py-2">
                      {new Date(`${miss.lastOn}T12:00:00Z`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-muted-foreground">Nothing yet: every search found something.</p>
        )}
      </section>
    </>
  );
}
