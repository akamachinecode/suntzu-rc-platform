# Bits

A **bit** is the smallest piece of behaviour someone can trigger and check end to end: "a visitor sends the contact form", "an owner adds a property". Like a trace in a distributed system, it crosses every layer it touches (page, server, database, external services), and the same name is used in its specification, its test and, when the project has request logs, its log lines.

A system is its catalog of bits. Reading this catalog is the fastest way to know what the project does.

## Catalog

| Bit                                                     | What it does                                           | Status       | Test                                            |
| ------------------------------------------------------- | ------------------------------------------------------ | ------------ | ----------------------------------------------- |
| [auth.email-link](./auth.email-link.md)                 | Someone signs in with a link by email                  | verified     | `e2e/auth.email-link.e2e.ts`, + 1 unit test     |
| [auth.email-code](./auth.email-code.md)                 | Someone signs in by typing the code from the email     | verified     | `e2e/auth.email-code.e2e.ts`, + 3 unit tests    |
| [auth.google](./auth.google.md)                         | Someone signs in with Google                           | not verified | manual (needs Google credentials)               |
| [account.get](./account.get.md)                         | A member opens My SunTzu RC                            | verified     | `e2e/account.get.e2e.ts`                        |
| [account.update](./account.update.md)                   | A member changes their settings                        | verified     | `e2e/account.update.e2e.ts`                     |
| [account.delete](./account.delete.md)                   | A member deletes their account                         | verified     | `e2e/account.delete.e2e.ts`                     |
| [follows.toggle](./follows.toggle.md)                   | A member follows or unfollows something                | verified     | `e2e/follows.toggle.e2e.ts`                     |
| [follows.state](./follows.state.md)                     | A page's buttons show whether the member follows it    | verified     | `e2e/follows.state.e2e.ts`                      |
| [follows.list](./follows.list.md)                       | A member sees what they follow and where they're going | verified     | `e2e/follows.list.e2e.ts`                       |
| [follows.count](./follows.count.md)                     | Anyone sees how many people follow something           | verified     | `e2e/follows.count.e2e.ts`                      |
| [rsvp.toggle](./rsvp.toggle.md)                         | A member says they're going                            | verified     | `e2e/rsvp.toggle.e2e.ts`                        |
| [me.calendar](./me.calendar.md)                         | A member's calendar app reads their private feed       | verified     | `e2e/me.calendar.e2e.ts`                        |
| [events.list](./events.list.md)                         | A visitor finds events                                 | verified     | `e2e/events.list.e2e.ts`                        |
| [events.get](./events.get.md)                           | A visitor opens an event's page                        | verified     | `e2e/events.get.e2e.ts`                         |
| [events.calendar](./events.calendar.md)                 | Someone subscribes to the events calendar              | verified     | `e2e/events.calendar.e2e.ts`                    |
| [events.event-calendar](./events.event-calendar.md)     | A visitor adds one event to their calendar             | verified     | `e2e/events.event-calendar.e2e.ts`              |
| [events.share-image](./events.share-image.md)           | An event's page is shared                              | verified     | `e2e/events.share-image.e2e.ts`                 |
| [events.feedback](./events.feedback.md)                 | Someone says whether an event's information was right  | verified     | `e2e/events.feedback.e2e.ts`                    |
| [corrections.create](./corrections.create.md)           | A member suggests a correction                         | verified     | `e2e/corrections.create.e2e.ts`, + 1 unit test  |
| [submissions.create](./submissions.create.md)           | A member sends an event                                | verified     | `e2e/submissions.create.e2e.ts`, + 1 unit test  |
| [places.list](./places.list.md)                         | A visitor browses every field and track                | verified     | `e2e/places.list.e2e.ts`                        |
| [places.get](./places.get.md)                           | A visitor opens a field's or track's page              | verified     | `e2e/places.get.e2e.ts`                         |
| [airspace.check](./airspace.check.md)                   | Someone asks "Can I fly here?"                         | verified     | `e2e/airspace.check.e2e.ts`                     |
| [hosts.list](./hosts.list.md)                           | A visitor browses every club and track                 | verified     | `e2e/hosts.list.e2e.ts`                         |
| [hosts.get](./hosts.get.md)                             | A visitor opens a club's or track's page               | verified     | `e2e/hosts.get.e2e.ts`                          |
| [search.query](./search.query.md)                       | A visitor searches the whole site                      | verified     | `e2e/search.query.e2e.ts`                       |
| [search.misses](./search.misses.md)                     | The crew sees what people searched for and didn't find | verified     | `e2e/search.misses.e2e.ts`, + 2 unit tests      |
| [contact.send](./contact.send.md)                       | A visitor sends the contact form                       | verified     | `e2e/contact.send.e2e.ts`, + 1 unit test        |
| [messages.create](./messages.create.md)                 | A visitor writes to the crew                           | verified     | `e2e/messages.create.e2e.ts`                    |
| [community.share-build](./community.share-build.md)     | A visitor shares a build                               | verified     | `e2e/community.share-build.e2e.ts`              |
| [try.request](./try.request.md)                         | A newcomer asks to try RC                              | broken       | `e2e/try.request.e2e.ts`, + 1 unit test         |
| [crew.queue](./crew.queue.md)                           | The crew sees what needs a person                      | verified     | `e2e/crew.queue.e2e.ts`                         |
| [crew.decide](./crew.decide.md)                         | The crew decides a review                              | verified     | `e2e/crew.decide.e2e.ts`                        |
| [crew.add-event](./crew.add-event.md)                   | The crew adds an event by hand                         | verified     | `e2e/crew.add-event.e2e.ts`                     |
| [crew.edit-event](./crew.edit-event.md)                 | The crew changes an event directly                     | verified     | `e2e/crew.edit-event.e2e.ts`                    |
| [crew.inbox](./crew.inbox.md)                           | The crew reads the inbox and marks messages as handled | verified     | `e2e/crew.inbox.e2e.ts`                         |
| [crew.feedback](./crew.feedback.md)                     | The crew reads the feedback left after events          | verified     | `e2e/crew.feedback.e2e.ts`                      |
| [hosts.claim](./hosts.claim.md)                         | Someone claims a club or track                         | verified     | `e2e/hosts.claim.e2e.ts`                        |
| [hosts.verify](./hosts.verify.md)                       | A claim is proved                                      | verified     | `e2e/hosts.verify.e2e.ts`                       |
| [organiser.dashboard](./organiser.dashboard.md)         | An organiser opens the club dashboard                  | verified     | `e2e/organiser.dashboard.e2e.ts`                |
| [organiser.publish](./organiser.publish.md)             | An organiser publishes or changes an event             | verified     | `e2e/organiser.publish.e2e.ts`                  |
| [organiser.update-club](./organiser.update-club.md)     | An organiser keeps the club's page current             | verified     | `e2e/organiser.update-club.e2e.ts`              |
| [places.confirm](./places.confirm.md)                   | A steward confirms a place's details                   | verified     | `e2e/places.confirm.e2e.ts`                     |
| [organiser.widget](./organiser.widget.md)               | A club's website shows its SunTzu RC calendar          | verified     | `e2e/organiser.widget.e2e.ts`                   |
| [notify.changes](./notify.changes.md)                   | Followers hear that an event moved or was cancelled    | broken       | `e2e/notify.changes.e2e.ts`                     |
| [notify.digest](./notify.digest.md)                     | Members get "this weekend near you"                    | verified     | `e2e/notify.digest.e2e.ts`                      |
| [notify.organiser-report](./notify.organiser-report.md) | Organisers get their club's monthly report             | verified     | `e2e/notify.organiser-report.e2e.ts`            |
| [notify.unsubscribe](./notify.unsubscribe.md)           | Someone stops an email with one click                  | verified     | `e2e/notify.unsubscribe.e2e.ts`                 |
| [engine.run](./engine.run.md)                           | The engine reads its sources                           | verified     | `ics.test.ts`, `json-ld.test.ts`, + 6 more      |
| [engine.resolve](./engine.resolve.md)                   | What the sources say becomes events                    | verified     | `match.test.ts`, `resolve.test.ts`              |
| [census.import](./census.import.md)                     | Public registers become places and hosts               | verified     | `fria.test.ts`, `fixed-sites.test.ts`, + 8 more |
| [db.seed](./db.seed.md)                                 | The starting data is loaded                            | verified     | `e2e/db.seed.e2e.ts`                            |
| [docs.publish](./docs.publish.md)                       | The docs portal is published                           | verified     | `e2e/docs.publish.e2e.ts`, + 1 unit test        |
| [notes.list](./notes.list.md)                           | A user sees their notes                                | verified     | `e2e/notes.list.e2e.ts`                         |
| [notes.get](./notes.get.md)                             | The API returns one of the user's notes                | verified     | `e2e/notes.get.e2e.ts`                          |
| [notes.create](./notes.create.md)                       | A user adds a note                                     | verified     | `e2e/notes.create.e2e.ts`                       |
| [notes.delete](./notes.delete.md)                       | A user deletes one of their notes                      | verified     | `e2e/notes.delete.e2e.ts`                       |

**Status:** `verified` (its test passes, or someone ran it and saw the result) · `read in code` (followed in the code, not run) · `not verified` · `broken`.

## Adding or changing a bit

1. Copy [`_template.md`](./_template.md) to `<area>.<action>.md` (for example `contact.send.md`, `notes.create.md`).
2. Fill in every field; write "none yet" rather than leaving one out (except **Test**, which every bit needs).
3. Write its end-to-end test in `e2e/<area>.<action>.e2e.ts`, inside `test.describe("<area>.<action>", …)`, so `pnpm test:e2e --grep <area>.<action>` runs it. It does what a person would do (open the page, fill the form, read the answer) and checks what they would see. If it touches someone's data, add the "another member can't" and "signed out can't" cases. Jobs that read the internet (the engine, the census) are proved by the tests that run their code on saved copies of real pages and files.
4. Add or update its row in the catalog above, in the same pull request as the code change.

`pnpm check` runs `pnpm check:bits`, which fails when a bit has no doc, no catalog row or no test, or when a test or the code (`@Bit("…")`) names a bit that has no doc.
