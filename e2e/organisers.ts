import {
  type APIRequestContext,
  type APIResponse,
  expect,
  type Page,
  type PlaywrightWorkerArgs,
} from "@playwright/test";
import { API } from "./env.ts";
import { addEvent, becomeOrganiser, crewApi, type NewEvent } from "./data.ts";
import { inbox, type Mail } from "./mail.ts";
import { FROM_APP, newEmail, signIn, signedIn } from "./people.ts";

/** The `playwright` fixture (its own type isn't exported by @playwright/test). */
export type Playwright = PlaywrightWorkerArgs["playwright"];

// Helpers for the crew's and the organisers' tests (crew.*, hosts.*, organiser.*, places.confirm).

/**
 * The crew adds a published event (data.ts `addEvent`), as an open day unless told otherwise:
 * `addEvent`'s own default kind, "fun-fly", isn't one the API takes. Open days aren't yearly, so
 * no series is started for them.
 */
export function addOpenDay(playwright: Playwright, event: NewEvent = {}) {
  return addEvent(playwright, { kind: "open-day", ...event });
}

/** A new member signed in through the API, in a request context of their own. Dispose it when done. */
export async function newMember(
  playwright: Playwright,
  label = "member",
): Promise<{ request: APIRequestContext; email: string }> {
  const request = await playwright.request.newContext();
  const email = await signIn(request, newEmail(label));
  return { request, email };
}

/** Signs a new member in on `page` and makes them a verified organiser of `host`. */
export async function signedInOrganiser(
  page: Page,
  playwright: Playwright,
  host: string,
): Promise<string> {
  const email = await signedIn(page, "organiser");
  await becomeOrganiser(playwright, page.request, email, host);
  return email;
}

/** An address at a club's own domain, new each time (the test mailbox catches it; nothing is sent). */
export function addressAt(domain: string, label = "secretary"): string {
  return newEmail(label).replace("@example.test", `@${domain}`);
}

/** Checks a response's status, with what the API answered in the message when it differs. */
export async function expectStatus(response: APIResponse, status: number): Promise<void> {
  expect(
    response.status(),
    `${response.url()} answered ${response.status()}: ${await response.text()}`,
  ).toBe(status);
}

/** Waits for an email to `to` sent after `since` whose text contains `text` (several tests share an inbox). */
export async function waitForMailWith(to: string, text: string, since: Date): Promise<Mail> {
  let found: Mail | undefined;
  await expect
    .poll(
      () => {
        found = inbox(to)
          .filter((mail) => new Date(mail.sentAt) >= since && mail.text.includes(text))
          .at(-1);
        return !!found;
      },
      { message: `No email to ${to} containing "${text}"`, timeout: 15_000 },
    )
    .toBe(true);
  return found!;
}

/** A published event as anyone reads it (GET /events/{slug}). */
export async function publicEvent(request: APIRequestContext, slug: string) {
  const response = await request.get(`${API}/events/${slug}`);
  await expectStatus(response, 200);
  return (await response.json()) as {
    name: string;
    status: string;
    startDate: string;
    endDate: string | null;
    url: string | null;
    summary: string;
    resultsUrl: string | null;
    beginnerFriendly: boolean;
    placeText: string | null;
    place: { slug: string; name: string } | null;
    host: { slug: string; name: string } | null;
  };
}

/** The crew's open review of the event `slug` (GET /crew/reviews), or undefined. */
export async function openReviewOf(
  playwright: Playwright,
  slug: string,
): Promise<{ id: string; kind: string } | undefined> {
  const crew = await crewApi(playwright);
  const response = await crew.get(`${API}/crew/reviews`);
  await expectStatus(response, 200);
  const reviews = (await response.json()) as {
    id: string;
    kind: string;
    event: { slug: string } | null;
  }[];
  await crew.dispose();
  return reviews.find((review) => review.event?.slug === slug);
}

/** A member suggests a correction to an event (corrections.create): it waits for the crew as a review. */
export async function suggestCorrection(
  playwright: Playwright,
  slug: string,
  correction: {
    startDate?: string;
    endDate?: string;
    cancelled?: boolean;
    url?: string;
    note: string;
    sourceUrl?: string;
  },
): Promise<void> {
  const { request } = await newMember(playwright, "corrector");
  const response = await request.post(`${API}/events/${slug}/corrections`, {
    data: correction,
    headers: FROM_APP,
  });
  await expectStatus(response, 204);
  await request.dispose();
}

/** "Nov 30" as an event page's history writes a date. */
export function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** "Nov 30, 2026" as an event page writes a one-day event's date. */
export function longDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
