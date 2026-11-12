<div align="center">

# SunTzu RC

**Every RC event, field and track in Florida. In one place. Free, forever.**

Fly-ins, races, swap meets and club open days, read from the organisers' own pages and checked before they go live. Every flying field and track on one map, with the airspace around it. Guides that take planes, helicopters and cars apart.

**[www.suntzurc.com](https://www.suntzurc.com)** · [Events](https://www.suntzurc.com/events) · [Places](https://www.suntzurc.com/places) · [Can I fly here?](https://www.suntzurc.com/places/can-i-fly-here) · [For clubs](https://www.suntzurc.com/organise) · [Guides](https://www.suntzurc.com/guides)

[![CI](https://github.com/akamachinecode/suntzu-rc-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/akamachinecode/suntzu-rc-platform/actions/workflows/ci.yml)
[![Licence: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](./LICENSE)
[![Content: CC BY 4.0](https://img.shields.io/badge/guides-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

</div>

---

## The RC hobby, finally on one map

RC in Florida is everywhere and nowhere: a fly-in on a club's Facebook page, a race on a registration site, a swap meet on a flyer at the hobby shop. If you didn't know where to look, you missed it.

SunTzu RC fixes that. It watches the places organisers already publish, merges the duplicates, checks every date, and puts the result on one calendar and one map, for **planes, helicopters, cars, crawlers, FPV and boats**.

## For pilots and racers

- 🗓️ **One calendar for everything.** Every discipline, every corner of Florida. Filter by what you fly and how far you'll drive.
- 📍 **"Near me", for real.** Search by town or ZIP code and see what's on this weekend, on a map.
- ✅ **Information you can trust.** Every event shows where it came from and when it was last checked. When an organiser changes a date or cancels, the page changes too.
- 🔔 **Never miss a change.** Follow an event, a club or a discipline, mark yourself "going", and get an email when something moves.
- 📆 **In your own calendar.** Subscribe once and every event lands in Google Calendar, Apple Calendar or Outlook, and stays current.
- 🔎 **One search box** for events, fields, tracks, clubs, guides and rules.

## Can I fly here?

Tap a spot on the map, or use your location, and SunTzu RC tells you in plain words whether it sits in controlled airspace, which airports are nearby, and whether you're at an FAA-recognised identification area (FRIA) or a club field, plus what that means for you. Built on the FAA's own registers, for every inch of Florida.

## For clubs, tracks and shops

**Publish with us. It's free, forever, and you get something back.**

| What you get               | What it does                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| **A verified page**        | Claim your club or track, get the verified badge and a page Google understands            |
| **Publish in a minute**    | Your events go live at once, and changes reach everyone who follows or is going           |
| **A widget for your site** | Paste one line and your own website shows your upcoming events, always current            |
| **People who show up**     | See how many follow your club and say they're going, and receive newcomers who ask to try |
| **A monthly report**       | Followers, "going" and what's coming up, in your inbox on the first of each month         |

→ **[Claim your club or track](https://www.suntzurc.com/organise)**

## For newcomers

Curious about RC but don't know where to start? SunTzu RC is the way in:

- **Try it.** Tell us your ZIP code and what you'd like to fly or drive, and a nearby club, track or shop gets in touch. → [suntzurc.com/try](https://www.suntzurc.com/try)
- **Learn how it works.** Interactive guides take [RC planes](https://www.suntzurc.com/guides/rc-planes), [helicopters](https://www.suntzurc.com/guides/rc-helicopters) and [cars and crawlers](https://www.suntzurc.com/guides/cars-and-crawlers) apart, piece by piece.
- **Fly legally.** [Flying legally](https://www.suntzurc.com/guides/flying-legally) explains the FAA rules, TRUST and Remote ID without the jargon.
- **Find your people.** Beginner-friendly events are flagged, and every club page tells you how to visit.

## Why SunTzu RC

SunTzu RC was started by three RC enthusiasts who want the hobby to grow. A few promises we keep:

1. **Free to take part, forever.** Following, "going", alerts and listing an event never cost anything.
2. **Trust you can see.** Sources and "last checked" dates on every page. Nobody else shows them.
3. **On the open web.** Every event, club and field is a fast page anyone can find on Google, not locked inside an app.
4. **Private stays private.** Private fields are never listed without permission, and nothing about a member is public unless they choose it.
5. **Open source.** The code is MIT and the guides are CC BY 4.0. Anyone can see how it works and help make it better.

## Built to last

SunTzu RC runs on AWS behind Cloudflare, with infrastructure as code (Terraform), continuous integration on every change, monitoring and uptime alarms, daily database backups, automated security scanning (CodeQL, secrets, dependencies) and automatic dependency updates. The events engine runs on a schedule, so the calendar keeps itself current without anyone pressing a button.

---

## For developers

SunTzu RC is a pnpm monorepo built on the **Itaca Technologies standard stack** (`platform`): one Next.js app for the public site and signed-in screens, and one API behind it, ready for a mobile app.

| Folder                                         | What                                      | Built on                           | Dev URL               | Production                                                           |
| ---------------------------------------------- | ----------------------------------------- | ---------------------------------- | --------------------- | -------------------------------------------------------------------- |
| [`apps/app`](./apps/app)                       | Public site and web application           | Next.js 16 (App Router) · React 19 | http://localhost:3000 | https://www.suntzurc.com                                             |
| [`apps/api`](./apps/api)                       | Backend: sign-in, business rules, data    | NestJS · Better Auth · OpenAPI     | http://localhost:3001 | https://api.suntzurc.com                                             |
| [`apps/docs`](./apps/docs)                     | Docs portal, built from `docs/`           | Fumadocs · Next.js (static)        | http://localhost:3002 | [GitHub Pages](https://akamachinecode.github.io/suntzu-rc-platform/) |
| [`packages/db`](./packages/db)                 | Database schema and migrations            | PostgreSQL · Drizzle ORM           | —                     | Amazon RDS                                                           |
| [`packages/shared`](./packages/shared)         | Validation schemas shared by API and apps | Zod                                | —                     | —                                                                    |
| [`packages/api-client`](./packages/api-client) | Typed API client (generated from OpenAPI) | openapi-fetch                      | —                     | —                                                                    |
| [`packages/ui`](./packages/ui)                 | Shared shadcn/ui components and theme     | Tailwind CSS 4 · shadcn/ui         | —                     | —                                                                    |

### Run it locally

Requirements: Node.js 24 (`nvm use`), pnpm (`corepack enable pnpm`) and Docker for the local database.

```bash
pnpm install
pnpm db:up && pnpm db:migrate
cp apps/api/.env.example apps/api/.env && cp apps/app/.env.example apps/app/.env
pnpm db:seed && pnpm census && pnpm engine
pnpm dev
```

`db:seed` loads the hand-checked events, places and sources, `census` the FAA's fields, airports and airspace for Florida, and `engine` reads every active source. Then open http://localhost:3000 and sign in with any email: locally the sign-in link is printed in the API's console instead of being emailed. Put your address in `CREW_EMAILS` (`apps/api/.env`) to open the crew console at `/crew`. API docs: http://localhost:3001/docs.

### Scripts

| Command        | What it does                                                      |
| -------------- | ----------------------------------------------------------------- |
| `pnpm dev`     | Development servers (site, API, docs)                             |
| `pnpm build`   | Production build                                                  |
| `pnpm check`   | Format check, lint, typecheck, tests and build. Must pass         |
| `pnpm format`  | Format every file with Prettier                                   |
| `pnpm test`    | Unit tests (Vitest)                                               |
| `pnpm db:seed` | Load the events engine's starting data into the local database    |
| `pnpm engine`  | Run the events engine once (`pnpm engine <source>` for one)       |
| `pnpm census`  | Load the FAA registers and ZIP codes (`pnpm census fria` for one) |

### Working with AI agents

Open this folder in Claude Code, Cursor, GitHub Copilot or Codex: they read [`AGENTS.md`](./AGENTS.md) automatically. Describe what you need in business terms and the agent follows the standard, suggesting the right way of working for each request:

| Skill       | Use it to…                                                        |
| ----------- | ----------------------------------------------------------------- |
| `/guide`    | See what you can ask for and where to start                       |
| `/plan`     | Plan something new before building it (questions → spec → slices) |
| `/fix`      | Fix something that's broken, with proof                           |
| `/document` | Document the project or a part of it                              |
| `/ship`     | Deliver a finished change as a pull request, ready for review     |
| `/takeover` | Pick up someone else's unfinished work                            |

### Reference project for `create-itaca@0.3.1`

SunTzu RC is the reference project for the `platform` stack with the `terraform` deploy target: a real product built entirely inside the Itaca standard.

| To see…                                                                    | Look at                                                                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A feature end to end (schema → contract → API → screen)                    | `packages/db/src/schema/`, `packages/shared/`, `apps/api/src/search/`, `apps/app/src/app/search/`             |
| Specs written with `/plan` and built slice by slice                        | [`docs/specs/`](./docs/specs)                                                                                 |
| The catalog of bits, one per piece of behaviour                            | [`docs/bits/`](./docs/bits/README.md)                                                                         |
| Terraform beyond the template: email, S3, scheduled jobs, optional secrets | [`infra/`](./infra) (`email.tf`, `storage.tf`, `jobs.tf`, `secrets.tf`), [`docs/DEPLOY.md`](./docs/DEPLOY.md) |
| Running a job by hand from GitHub Actions                                  | [`.github/workflows/task.yml`](./.github/workflows/task.yml)                                                  |
| Every deviation from the template, and why                                 | [`docs/DECISIONS.md`](./docs/DECISIONS.md) (search for "on purpose")                                          |

Deviations on purpose: no `apps/web` (the public pages are the product, so they live in `apps/app` on `www`), PostgreSQL 18, Vitest, and AWS resources prefixed with the repository's former name (`rc-landing`). `itaca.json` records the version.

### Documentation

Everything is also one website with search: the **[SunTzu RC docs portal](https://akamachinecode.github.io/suntzu-rc-platform/)**, published from `docs/` whenever it changes on `main`.

- [`docs/guides/`](./docs/guides) — [run it locally](./docs/guides/RUN-LOCALLY.md) and [your first contribution](./docs/guides/FIRST-CONTRIBUTION.md), step by step
- [`docs/SYSTEM.md`](./docs/SYSTEM.md) — the map: what runs where and how the pieces connect
- [`docs/EVENTS-ENGINE.md`](./docs/EVENTS-ENGINE.md) — how the engine finds, merges and verifies events
- [`docs/DELIVERY.md`](./docs/DELIVERY.md) — from code to production: CI, deploys, Docker images, OIDC and the scheduled jobs
- [`docs/bits/`](./docs/bits/README.md) — the catalog of bits: each piece of behaviour, end to end
- [`docs/specs/`](./docs/specs/README.md) — specifications of features, written with `/plan`
- [`docs/OPERATIONS.md`](./docs/OPERATIONS.md) — running, deploying, rolling back, access and backups
- [`docs/DEPLOY.md`](./docs/DEPLOY.md), [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md), [`docs/GITHUB.md`](./docs/GITHUB.md) — hosting, domain and repository setup
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — why things are the way they are
- [`AGENTS.md`](./AGENTS.md) — rules and recipes for AI agents (and humans)

## Contributing

SunTzu RC is open: anyone can run it, improve it and send a pull request. Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md) (running it locally, the rules, how review works), ask questions in [Discussions](https://github.com/akamachinecode/suntzu-rc-platform/discussions), and report security problems privately as [`SECURITY.md`](./SECURITY.md) explains. Everyone follows the [code of conduct](./CODE_OF_CONDUCT.md).

## Licence

- **Code:** [MIT](./LICENSE). Use it, change it and share it, keeping the copyright notice.
- **Guides and figures:** the text of the guides and other site content in `apps/app/src/content/`, and the drawings in `apps/app/src/components/figures/`, are licensed under [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). Reuse them with credit to SunTzu RC and a link to https://www.suntzurc.com.
- **Name and logo:** the SunTzu RC name, the wordmark (`apps/app/src/components/wordmark.tsx`) and the icons aren't licensed. A copy of the project that runs as its own service needs its own name and logo.
- **Third-party material** keeps its own licence: the Anatomy figure kit in `apps/app/src/components/iso/` (MIT, see its `LICENSE`), and the facts, quotes and data credited to their sources where they appear (FAA and US Census data are public).
