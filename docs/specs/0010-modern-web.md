# 0010 — Modern web: safe, accessible and fast for everyone

- **Status:** Approved 2026-11-17
- **Requested by:** the owner (Alejandro), 2026-11-17
- **Approved by:** the owner, 2026-11-17 ("yes to all, go ahead")

## Problem

An audit against Google Chrome's [modern web guidance](https://github.com/GoogleChrome/modern-web-guidance) (about 200 guides, 2026-11-17) found the site mostly modern, with gaps that hurt real people:

- **Security:** after typing the sign-in code, a crafted link can send a member to another website.
- **Accessibility:** forms forget what was typed after an error, errors aren't read out with their field, focus gets lost when screens change, there's no skip link, and moving figures can't be paused.
- **Accuracy:** an event can show as over from 7–8 pm Florida time on its last day.
- **Speed:** public pages can't be restored instantly with Back, and nothing shows until the events API answers.

SunTzu RC wants newcomers and older hobbyists, so a screen reader user, a keyboard user and an older phone must all work.

## Goals

- Nobody can be redirected off the site by a link, and dates follow each event's own time zone.
- Every form keeps what was typed, says what's wrong next to the field, announces it, and puts the cursor where it's needed.
- The whole site works with a keyboard and a screen reader, and respects reduced motion; anything that moves on its own can be paused.
- The home and public pages show their headline before the data arrives and don't jump when the font loads.
- A written browser rule says what must fully work (see "Browser support" below), and an automatic accessibility check runs on every pull request, so this doesn't slip back.
- Security headers and a Content-Security-Policy in report-only mode; traces no longer store a visitor's location or calendar token.
- The site can be installed on a phone's home screen.

## Browser support

Everything works fully in the last two years of Safari (iOS and Mac), Chrome, Firefox and Edge: Baseline "Widely available" features. Newer features are only extras that quietly do nothing where they're missing. No polyfills. Written in `AGENTS.md`.

## Out of scope

- **Replacing the Radix dialogs with native `<dialog>` or `popover`**: Radix already gives focus trap, Esc, light dismiss and focus return, and shadcn/ui is the project's rule.
- **Page transition animations** (view transitions): polish, not a defect.
- **Passkeys**: they touch `apps/api/src/auth`, a separate decision.
- **Dark mode**: the site is light only by design.
- **Real-visitor speed data** (CloudWatch RUM): new infrastructure.
- **Enforcing the Content-Security-Policy and Trusted Types**: report-only first; enforcing is a later decision once reports are clean.

## User stories

- As a member, I want the sign-in to only ever take me back to SunTzu RC, so a link can't trick me.
- As a visitor who made a mistake in a form, I want to keep what I typed and hear what's wrong, so I can fix it in one go.
- As a keyboard or screen reader user, I want to skip the header, never lose my place, and know where I am.
- As someone sensitive to motion, I want to pause anything that moves by itself.
- As a pilot on Florida time, I want an event to count as over only when its last day is over where it happens.
- As a visitor on a slow phone, I want to see the page's headline right away.
- As a regular, I want SunTzu RC on my phone's home screen.

## Capabilities touched

- **Front door:** security headers and a Content-Security-Policy in report-only mode (`apps/app/next.config.ts`, `apps/app/src/proxy.ts`). No new domains.
- **Identity:** the sign-in page's redirect check only (in `apps/app`); nothing in `apps/api/src/auth`.
- **Data:** no new tables. Event links must be `http(s)` (`packages/shared`). Fewer personal details in traces.
- **Operations:** the trace clean-up touches `apps/app/src/instrumentation.node.ts` and `apps/api/src/otel.ts` ("When to stop": approved by the owner as engineer, see "Needs Itaca engineering"). The accessibility check runs in CI (`.github/workflows/ci.yml`, edited at the owner's request).

## Bits

- Changed: `auth.email-code` — only redirects inside the site.
- Changed: `events.get` — "over" in the event's time zone.
- Changed: `organiser.widget` — escaped links, own strict policy.
- Changed: `contact.send`, `community.share-build`, `try.request`, `submissions.create`, `crew.add-event`, `corrections.create`, `account.update`, `account.delete`, `hosts.verify`, `notes.create` — forms keep values, link and announce errors, move focus.
- Changed: `airspace.check`, `me.calendar` — no location or token in traces.

## Acceptance criteria

- When someone opens `/sign-in?next=/%5Cevil.com` and signs in with the code, then they land on `/me`, not on another site.
- When an event's last day is today in its own time zone, then its page still shows "Going" and "Add to calendar" until midnight there.
- When a form is sent with a mistake, then every field keeps its value, the cursor moves to the first wrong field, and a screen reader reads the field's error with it.
- When a form shows a status message, then a screen reader announces it.
- When a keyboard user presses Tab on any page, then the first stop is "Skip to content".
- When a menu, sheet or search closes, then focus goes back to what opened it.
- When something moves by itself for more than five seconds, then a visible Pause button stops it.
- When the visitor asks for reduced motion, then dialogs fade without zooming or sliding and loading placeholders don't pulse.
- When the home is opened, then its headline is sent before the events data, and it doesn't shift when Archivo loads.
- When `pnpm test:a11y` runs, then axe-core finds no serious or critical issue on the main pages, and CI runs it on every pull request.
- When any page is served, then it carries a report-only Content-Security-Policy, `Cross-Origin-Opener-Policy` and `color-scheme: light`.
- When "Can I fly here?" is used, then the trace shows neither the coordinates nor a calendar token.
- When the site is opened on a phone, then it can be added to the home screen with the SunTzu RC icon.

## Slices

- [x] 1. Security and dates: sign-in redirect, events' time zones (event page, crew dates, Panhandle on Central time), the widget escapes links, event links must be `http(s)` (blocked by: —)
- [x] 2. Checking tools: Playwright + axe-core `pnpm test:a11y` locally and in CI, `.claude/launch.json` attaches to dekit, the browser rule in `AGENTS.md` (blocked by: 1)
- [x] 3. Forms: keep values, linked errors, focus on the first error and on each new step, announced status, the organiser code field, the delete confirmation, required marks, clear names for repeated buttons (blocked by: 2)
- [x] 4. Site-wide accessibility: skip link, focus rings in high contrast, menu and search return focus, current page in the desktop menu, anchors clear the header, reduced motion for dialogs and placeholders, the copy button, `color-scheme`, "Near me" explains itself (blocked by: 3)
- [x] 5. Pause buttons on the moving figures and 3D scenes (blocked by: 4)
- [x] 6. Speed: headline before data (Suspense), wide-heading font fallback, 3D scenes yield while building, maps load near view, measured before and after (blocked by: 5)
- [x] 7. Layout polish: event cards by container, footer wordmark, fluid headings, CSS clean-ups (blocked by: 6)
- [x] 8. Security headers and clean traces: report-only Content-Security-Policy, COOP, HSTS on subdomains, no location or token in traces (blocked by: 7)
- [ ] 9. Installable site: manifest and app icons, drawn from the wordmark and approved by the owner (blocked by: 8)

Each slice's pull request is stacked on the one before, so the owner merges them in order.

## Open questions

- Does the owner want the CSP enforced once the reports are clean? — the owner, after slice 8 has run on staging for a while.
- A real iPhone + VoiceOver pass after each slice (checklist in each pull request) — the owner or a teammate.

## Needs Itaca engineering

- **Tracing** (`apps/app/src/instrumentation.node.ts`, `apps/api/src/otel.ts`) and the **Content-Security-Policy**: on the "When to stop" list. The owner approved both as engineer on 2026-11-17; recorded in `docs/DECISIONS.md`.
- **CI** (`.github/workflows/ci.yml`): edited at the owner's explicit request (rule 7).
