# Bits

A **bit** is the smallest piece of behaviour someone can trigger and check end to end: "a visitor sends the contact form", "an owner adds a property". Like a trace in a distributed system, it crosses every layer it touches (page, server, database, external services), and the same name is used in its specification, its test and, when the project has request logs, its log lines.

A system is its catalog of bits. Reading this catalog is the fastest way to know what the project does.

## Catalog

| Bit                                                 | What it does                                                             | Status       | Test                                |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ------------ | ----------------------------------- |
| [notes.list](./notes.list.md)                       | A user sees their notes (example)                                        | read in code | none yet                            |
| [notes.get](./notes.get.md)                         | The API returns one of the user's notes (example; no screen uses it yet) | read in code | none yet                            |
| [notes.create](./notes.create.md)                   | A user adds a note (example)                                             | read in code | none yet                            |
| [notes.delete](./notes.delete.md)                   | A user deletes one of their notes (example)                              | read in code | none yet                            |
| [events.list](./events.list.md)                     | A visitor finds events                                                   | verified     | none yet                            |
| [events.get](./events.get.md)                       | A visitor opens an event's page                                          | verified     | none yet                            |
| [events.calendar](./events.calendar.md)             | Someone subscribes to the events calendar                                | read in code | `ics-writer.test.ts`                |
| [events.event-calendar](./events.event-calendar.md) | A visitor adds one event to their calendar                               | read in code | `ics-writer.test.ts`                |
| [places.list](./places.list.md)                     | The events map gets its places                                           | read in code | none yet                            |
| [contact.send](./contact.send.md)                   | A visitor sends the contact form                                         | verified     | none yet                            |
| [community.share-build](./community.share-build.md) | A visitor shares a build                                                 | read in code | none yet                            |
| [engine.run](./engine.run.md)                       | The engine reads its sources                                             | verified     | engine tests         |
| [db.seed](./db.seed.md)                             | The starting data is loaded                                              | read in code | none yet                            |
| [engine.resolve](./engine.resolve.md)               | What the sources say becomes events                                      | verified     | `match.test.ts`                     |
| [auth.email-link](./auth.email-link.md)             | Someone signs in with a link by email                                    | verified     | none yet                            |
| [auth.google](./auth.google.md)                     | Someone signs in with Google                                             | not verified | none yet (needs Google credentials) |
| [account.get](./account.get.md)                     | A member opens My Servo                                                  | verified     | none yet                            |
| [account.update](./account.update.md)               | A member changes their settings                                          | verified     | none yet                            |
| [account.delete](./account.delete.md)               | A member deletes their account                                           | read in code | none yet                            |
| [follows.toggle](./follows.toggle.md)               | A member follows or unfollows something                                  | verified     | none yet                            |
| [rsvp.toggle](./rsvp.toggle.md)                     | A member says they're going                                              | verified     | none yet                            |
| [me.calendar](./me.calendar.md)                     | A member's calendar app reads their private feed                         | verified     | none yet                            |
| [crew.queue](./crew.queue.md)                       | The crew sees what needs a person                                        | verified     | none yet                            |
| [crew.decide](./crew.decide.md)                     | The crew decides a review                                                | verified     | none yet                            |
| [crew.add-event](./crew.add-event.md)               | The crew adds an event by hand                                           | read in code | none yet                            |
| [messages.create](./messages.create.md)             | A visitor writes to the crew                                             | read in code | none yet                            |
| [events.feedback](./events.feedback.md)             | Someone says whether an event's information was right                    | read in code | none yet                            |
| [corrections.create](./corrections.create.md)       | A member suggests a correction                                           | read in code | none yet                            |
| [events.share-image](./events.share-image.md)       | An event's page is shared                                                | verified     | none yet                            |

**Status:** `verified` (someone ran it and saw the result) · `read in code` (followed in the code, not run) · `not verified` · `broken`.

## Adding or changing a bit

1. Copy [`_template.md`](./_template.md) to `<area>.<action>.md` (for example `contact.send.md`, `notes.create.md`).
2. Fill in every field; write "none yet" rather than leaving one out.
3. Add or update its row in the catalog above, in the same pull request as the code change.
