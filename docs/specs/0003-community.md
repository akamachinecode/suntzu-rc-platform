# 0003 — Community: members, contributors and organisers

- **Status:** Approved 2026-10-27 · Done 2026-10-28 (locally; deploy in spec 0004)
- **Requested by:** the owner (Alejandro), 2026-10-27
- **Approved by:** the owner, 2026-10-27 (sign-in with Google or an email link; club verification by domain email or a code on their site; Florida-wide, community first in South Florida)

## Problem

The hobby grows through people, but RC communities are scattered across Facebook groups, forums and club sites, and organisers have no reason to publish anywhere else. SunTzu RC's community page is a static list and a form that goes nowhere.

## Goals

- Following events, clubs, places and disciplines, marking "going" and getting told about changes is free and takes seconds.
- People can add and fix events, and every contribution is credited and checked.
- Organisers get something back for publishing with SunTzu RC: a verified page, a calendar widget for their own site and a monthly report.
- A curious newcomer can ask to try the hobby and reach a nearby club, track or shop.

## Out of scope

- Forums, chat, comments and social feeds (Facebook groups already exist; moderation is expensive).
- Pilot profiles and a "hangar" of builds with photos (later, see `ROADMAP.md`).
- Payments of any kind: everything here is free, forever (principle 1 in `LANDSCAPE.md`).

## User stories

- As a pilot, I want to sign in with Google or an email link, without a password.
- As a member, I want to follow events, clubs, places and disciplines, mark "going" and have my own calendar feed with all of it.
- As a member, I want an email when something I follow changes or is cancelled, and a weekly "this weekend near you".
- As a member, I want to send an event by pasting a link or its text, and suggest a correction to an event.
- As a club officer, I want to claim my club, get a verified badge, publish and edit our events, put our calendar on our site and see how many people follow and go.
- As a newcomer, I want to tell SunTzu RC where I live and what I'd like to try, and hear from someone nearby.
- As a member, I want to delete my account and my data whenever I want.

## Capabilities touched

- **Identity:** sign-in with Google or a one-time email link (no passwords); roles `member`, `crew`; organisers per host, verified by an email at the club's domain or a code on its website, or by the crew.
- **Data (personal):** email, display name, optional home ZIP code, follows, "going", preferences. Nothing about a member is public except an aggregate "N going". Members can delete their account and all their data. Messages and try-it requests are kept 12 months.
- **Processes:** emails (Amazon SES) for sign-in links, alerts, the weekly digest, organisers' monthly report and try-it requests; commands to send them, scheduled once deployed (spec 0004).
- **AI:** extracting an event from pasted text with a language model (Claude on Amazon Bedrock), with the exact quote behind each field; without a quote the field is dropped. Optional: without access it goes to the crew as plain text.
- **Front door:** public forms protected with Cloudflare Turnstile (spec 0004).

## Bits

- New: `auth.email-link`, `auth.google`, `account.update`, `account.delete`.
- New: `follows.toggle`, `rsvp.toggle`, `me.calendar` (private feed).
- New: `notify.changes`, `notify.digest`, `notify.organiser-report`.
- New: `submissions.create`, `corrections.create`, `messages.create` (contact and builds reach the crew).
- New: `hosts.claim`, `hosts.verify`, `organiser.publish`, `organiser.widget`.
- New: `try.request`.

## Acceptance criteria

- When someone signs in with Google or with the link we email them, then they have an account without ever choosing a password.
- When a member follows an event, club, place or discipline, or marks "going", then it appears on `/me` and in their private calendar feed, and the event page shows the number going.
- When an event a member follows or goes to changes date or is cancelled, then they get one email about it (at most one per event per run), with a link to stop those emails.
- When a member opted in to the weekly digest with a ZIP code, then every Thursday they get "this weekend near you" for their disciplines and distance.
- When a member pastes a link, then the engine reads it; when they paste text, the AI extracts the fields with quotes; either way the event goes to the crew's queue credited to them.
- When someone suggests a correction, then it reaches the crew next to the current value and the source.
- When a club officer proves control of the club's domain email or website, then they become its organiser, the club and its events show "Verified", and they can publish events that appear without waiting for the crew.
- When an organiser copies the widget code, then their site shows their upcoming events from SunTzu RC.
- When a newcomer asks to try a discipline, then the nearest verified organisers who accept newcomers (or the crew, when there are none) receive the request.
- When a member deletes their account, then their email, follows, "going" and preferences are gone, and their past contributions stay without their name.

## Slices

- [x] 1. Accounts: email link and Google, `/me` with name, ZIP, preferences and delete (blocked by: —)
- [x] 2. Follow, "going" and the private calendar feed (blocked by: 1)
- [x] 3. Contribute: send an event (link or text, AI with quotes), suggest a correction; contact and builds reach the crew's inbox (blocked by: 1, 0001-2)
- [x] 4. Organisers: claim and verify a club, badge, publish and edit events, the widget (blocked by: 1, 0002-2)
- [x] 5. Newcomers: "Try it" requests and beginner-friendly events; stewards confirm their places yearly (blocked by: 4)
- [x] 6. Emails: change alerts, weekly digest, organiser's monthly report (blocked by: 2, 4)

## Open questions

- The sender address and the name in emails depend on the final name and domain (C3) — who should answer: the owner.
- Whether Claude on Amazon Bedrock is enabled in the AWS project's region — who should answer: the owner, in the AWS console (spec 0004).

## Needs Itaca engineering

- Accounts, sessions and personal data, the organiser role, emails and AI: approved by the owner acting as Itaca engineering, 2026-10-27 (recorded in `DECISIONS.md`). An Itaca review before production is still recommended.
