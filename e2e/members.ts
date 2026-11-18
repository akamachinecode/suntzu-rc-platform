import { type APIRequestContext, expect, type PlaywrightWorkerArgs } from "@playwright/test";
import { API } from "./env.ts";
import { FROM_APP, newEmail, signIn } from "./people.ts";

// Members and what they follow, for the end-to-end tests of My SunTzu RC (account.*, follows.*,
// rsvp.toggle, me.calendar, notify.unsubscribe) and the notes example. Everything goes through the
// API, as the screens do; the tests check the screens themselves.

/** The `playwright` fixture (its type isn't exported by name). */
export type Playwright = PlaywrightWorkerArgs["playwright"];

export type Target = "event" | "host" | "place" | "discipline";

export type Profile = {
  name: string;
  email: string;
  role: "member" | "crew";
  zip: string | null;
  radiusMiles: number;
  disciplines: string[];
  weeklyDigest: boolean;
  changeAlerts: boolean;
  calendarUrl: string;
  organiserOf: { slug: string; name: string; verified: boolean }[];
};

export type Following = {
  events: { slug: string; name: string }[];
  going: { slug: string; name: string }[];
  hosts: { slug: string; name: string }[];
  places: { slug: string; name: string }[];
  disciplines: string[];
};

/** A new member signed in on their own API context (not a browser). Dispose `request` when done. */
export async function newMember(playwright: Playwright, label = "member") {
  const request = await playwright.request.newContext();
  const email = await signIn(request, newEmail(label));
  return { request, email };
}

/** A request context with no session: a visitor, a calendar app, a mail app. Dispose it. */
export function signedOut(playwright: Playwright): Promise<APIRequestContext> {
  return playwright.request.newContext();
}

/** GET /me as the member in `request`: what My SunTzu RC shows (it also creates their settings). */
export async function profileOf(request: APIRequestContext): Promise<Profile> {
  const response = await request.get(`${API}/me`);
  expect(response.status(), "GET /me").toBe(200);
  return (await response.json()) as Profile;
}

/** GET /me/following as the member in `request`. */
export async function followingOf(request: APIRequestContext): Promise<Following> {
  const response = await request.get(`${API}/me/following`);
  expect(response.status(), "GET /me/following").toBe(200);
  return (await response.json()) as Following;
}

/** Follows (or stops following) something by its public slug, as the bell button does. */
export async function follow(request: APIRequestContext, target: Target, id: string, on = true) {
  const url = `${API}/me/follows/${target}/${id}`;
  const response = on
    ? await request.put(url, { headers: FROM_APP })
    : await request.delete(url, { headers: FROM_APP });
  expect(response.status(), `${on ? "PUT" : "DELETE"} ${url}`).toBe(200);
  return (await response.json()) as { following: boolean; going: boolean };
}

/** Says "I'm going" (or not any more) to an event, as the button does. */
export async function go(request: APIRequestContext, slug: string, on = true) {
  const url = `${API}/me/going/${slug}`;
  const response = on
    ? await request.put(url, { headers: FROM_APP })
    : await request.delete(url, { headers: FROM_APP });
  expect(response.status(), `${on ? "PUT" : "DELETE"} ${url}`).toBe(200);
  return (await response.json()) as { following: boolean; going: boolean };
}

/** The public counts of an event, club, place or discipline (GET /people/…), as anyone sees them. */
export async function peopleOf(playwright: Playwright, target: Target, id: string) {
  const anyone = await signedOut(playwright);
  const response = await anyone.get(`${API}/people/${target}/${id}`);
  expect(response.status(), `GET /people/${target}/${id}`).toBe(200);
  const counts = (await response.json()) as { following: number; going: number };
  await anyone.dispose();
  return counts;
}

/** The event names (SUMMARY) in an iCalendar feed, with folded lines joined again. */
export function summariesIn(ics: string): string[] {
  return ics
    .replace(/\r\n[ \t]/g, "")
    .split(/\r\n/)
    .filter((line) => line.startsWith("SUMMARY:"))
    .map((line) => line.slice("SUMMARY:".length).replace(/\\([,;\\])/g, "$1"));
}

/** Creates a note through the API as the member in `request` (POST /notes answers 201). */
export async function createNote(request: APIRequestContext, title: string, body = "") {
  const response = await request.post(`${API}/notes`, { data: { title, body }, headers: FROM_APP });
  expect(response.status(), "POST /notes").toBe(201);
  return (await response.json()) as { id: string; title: string; body: string };
}
