import {
  type APIRequestContext,
  type Browser,
  expect,
  type Locator,
  type Page,
  type PlaywrightWorkerArgs,
} from "@playwright/test";
import { addEvent, type NewEvent } from "./data.ts";
import { API } from "./env.ts";
import { inbox, type Mail } from "./mail.ts";
import { crewPage, FROM_APP } from "./people.ts";

// Helpers for the end-to-end tests of the public forms and the crew's inbox (contact.send,
// community.share-build, messages.create, try.request, events.feedback, corrections.create,
// submissions.create, search.misses, crew.inbox, crew.feedback). Many tests write to the crew at
// the same time, so a test always finds its own message, email or row by a unique text.

/** The `playwright` fixture (@playwright/test exports no `Playwright` type). */
export type PlaywrightApi = PlaywrightWorkerArgs["playwright"];

/**
 * A word of random letters that matches nothing on the site: no digits, so it never looks like a
 * phone number to the search (`looksPersonal`), and no street words.
 */
export function nonsense(length = 12): string {
  let word = "";
  while (word.length < length)
    word += Math.random()
      .toString(36)
      .replace(/[^a-z]/g, "");
  return word.slice(0, length);
}

/**
 * The crew adds a published fly-in by hand (addEvent in data.ts, whose default kind "fun-fly" the
 * API refuses: the kinds are fly-in, competition, race, show, swap-meet, open-day, course, other).
 */
export function addFlyIn(playwright: PlaywrightApi, event: NewEvent = {}) {
  return addEvent(playwright, { kind: "fly-in", ...event });
}

/** Every email to `to` whose text contains `text`. */
export function mailsWith(to: string, text: string): Mail[] {
  return inbox(to).filter((mail) => mail.text.includes(text));
}

/**
 * Waits for the email to `to` whose text contains `text` (a unique marker the test wrote).
 * `waitForMail` matches the subject only, and the crew's inbox gets other tests' emails at the same
 * time.
 */
export async function waitForMailWith(to: string, text: string): Promise<Mail> {
  let found: Mail | undefined;
  await expect
    .poll(
      () => {
        found = mailsWith(to, text).at(-1);
        return !!found;
      },
      { message: `No email to ${to} mentioning "${text}"`, timeout: 15_000 },
    )
    .toBe(true);
  return found!;
}

/** The crew console (/crew), signed in as the crew. Close its context when done. */
export async function openCrewConsole(browser: Browser): Promise<Page> {
  const page = await crewPage(browser);
  await page.goto("/crew");
  await expect(page.getByRole("heading", { level: 1, name: "Crew console" })).toBeVisible();
  return page;
}

/** The message in the crew console's inbox that contains `text`. */
export function inboxItem(page: Page, text: string): Locator {
  return page
    .getByRole("region", { name: "Inbox", exact: true })
    .getByRole("listitem")
    .filter({ hasText: text });
}

/** The feedback in the crew console that contains `text` (the note, or the event's name). */
export function feedbackItem(page: Page, text: string): Locator {
  return page
    .getByRole("region", { name: "Feedback after events", exact: true })
    .getByRole("listitem")
    .filter({ hasText: text });
}

export type CrewMessage = {
  id: string;
  kind: string;
  topic: string | null;
  name: string;
  email: string;
  body: string;
  link: string | null;
  createdAt: string;
  handled: boolean;
};

/** The crew's inbox as the API gives it (GET /crew/messages), read with the crew's session. */
export async function crewMessages(crew: APIRequestContext): Promise<CrewMessage[]> {
  const response = await crew.get(`${API}/crew/messages`);
  expect(response.status(), "GET /crew/messages as the crew").toBe(200);
  return (await response.json()) as CrewMessage[];
}

/** Sends a message to the crew through the API, as the contact form's Server Action does. */
export async function sendMessage(
  request: APIRequestContext,
  message: {
    kind?: "contact" | "build";
    topic?: string;
    name: string;
    email: string;
    body: string;
    link?: string;
  },
) {
  const response = await request.post(`${API}/messages`, {
    data: { kind: "contact", ...message },
    headers: FROM_APP,
  });
  expect(
    response.status(),
    `POST /messages answered ${response.status()}: ${await response.text()}`,
  ).toBe(204);
}
