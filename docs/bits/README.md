# Bits

A **bit** is the smallest piece of behaviour someone can trigger and check end to end: "a visitor sends the contact form", "an owner adds a property". Like a trace in a distributed system, it crosses every layer it touches (page, server, database, external services), and the same name is used in its specification, its test and, when the project has request logs, its log lines.

A system is its catalog of bits. Reading this catalog is the fastest way to know what the project does.

## Catalog

| Bit                                                 | What it does                                                             | Status       | Test                 |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ------------ | -------------------- |
| [auth.sign-up](./auth.sign-up.md)                   | A visitor creates an account                                             | read in code | none yet             |
| [auth.sign-in](./auth.sign-in.md)                   | A user signs in                                                          | read in code | none yet             |
| [notes.list](./notes.list.md)                       | A user sees their notes (example)                                        | read in code | none yet             |
| [notes.get](./notes.get.md)                         | The API returns one of the user's notes (example; no screen uses it yet) | read in code | none yet             |
| [notes.create](./notes.create.md)                   | A user adds a note (example)                                             | read in code | none yet             |
| [notes.delete](./notes.delete.md)                   | A user deletes one of their notes (example)                              | read in code | none yet             |
| [events.list](./events.list.md)                     | A visitor browses upcoming events                                        | read in code | none yet             |
| [events.get](./events.get.md)                       | A visitor opens an event's page                                          | read in code | none yet             |
| [events.calendar](./events.calendar.md)             | Someone subscribes to the events calendar                                | read in code | `ics-writer.test.ts` |
| [events.event-calendar](./events.event-calendar.md) | A visitor adds one event to their calendar                               | read in code | `ics-writer.test.ts` |
| [places.list](./places.list.md)                     | The events map gets its places                                           | read in code | none yet             |
| [contact.send](./contact.send.md)                   | A visitor sends the contact form                                         | read in code | none yet             |
| [community.share-build](./community.share-build.md) | A visitor shares a build                                                 | read in code | none yet             |
| [engine.run](./engine.run.md)                       | The engine reads its sources                                             | read in code | engine tests         |
| [db.seed](./db.seed.md)                             | The starting data is loaded                                              | read in code | none yet             |
| [census.import](./census.import.md)                 | Public registers become places, hosts, airports, airspace and ZIP codes  | verified     | census tests         |

**Status:** `verified` (someone ran it and saw the result) · `read in code` (followed in the code, not run) · `not verified` · `broken`.

## Adding or changing a bit

1. Copy [`_template.md`](./_template.md) to `<area>.<action>.md` (for example `contact.send.md`, `notes.create.md`).
2. Fill in every field; write "none yet" rather than leaving one out.
3. Add or update its row in the catalog above, in the same pull request as the code change.
