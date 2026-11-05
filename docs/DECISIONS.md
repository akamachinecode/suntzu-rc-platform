# Decisions log

Every non-trivial decision goes here, newest first: new dependencies, environment variables, external services, data model changes, deviations from the Itaca standard. Itaca engineering reads this file when taking over the project.

Format:

```md
## YYYY-MM-DD — Short title

- **What:** what was decided or added.
- **Why:** the business or technical reason.
- **Impact:** new env vars, services, costs, risks, follow-ups for engineering.
```

## 2026-10-23 — Events on the web: from the database, on a map, in your calendar (roadmap P1)

- **What:**
  - **API (public, read-only):** `GET /events` (filters: dates, discipline, kind, region), `GET /events/:slug` (with its sources), `GET /places`, and two iCalendar feeds: `GET /events/calendar.ics` (filterable) and `GET /events/:slug/calendar.ics`. All `@Public()`, cached 5 minutes. Unpublished events answer 404.
  - **Web:** `/events` reads from the API, with filters by discipline and kind, a map, "Near me" (sorts by distance in the browser; the location is never sent anywhere) and a block to subscribe to the calendar (Apple/Outlook via `webcal://`, Google Calendar, copy link). New `/events/[slug]` page: dates, place, map and directions, organiser, "Add to calendar", **where the information comes from and when it was last checked**, a "Something wrong? Tell us" link (new contact topic `correction`) and schema.org `Event` data for Google (only for events with exact dates). The home page's three upcoming events and the sitemap also come from the API.
  - The feeds people subscribe to live on the site's own domain (`/events/calendar.ics`, route handlers that relay the API) because their callers are calendar apps.
  - `apps/app/src/content/events.ts` is gone: the database is now the only copy of the calendar (`places.ts` stays until places get their own pages).
- **Why:** the owner's new order (2026-10-23): what people see and use first. Visible sources and "last checked" are the trust nobody else in RC shows (`LANDSCAPE.md`).
- **Impact:**
  - **New dependency: `maplibre-gl` 6.15.0** (BSD-3, open-source vector maps) in `apps/app`. Its web worker is pointed at with `setWorkerUrl(new URL(..., import.meta.url))` so the bundler ships it as a file; the map loads only in the browser, after the list.
  - **New external service: OpenFreeMap** for the base map (free, no key, commercial use allowed, OpenStreetMap data; MapLibre shows the required attribution). No SLA: Itaca may want Amazon Location Service before production.
  - **Coordinates** come from the FAA FRIA layer (public data) for four fields and the US Census geocoder for the two car tracks; DeLand RC's field isn't in either, so Jets Over DeLand shows without a pin.
  - Calendar feeds include only events with announced dates; a cancelled event stays in the feed marked CANCELLED, which is how subscribers find out.
  - Public pages (`/`, `/events`, `/events/[slug]`) render on request with API data cached 5 minutes (`getPublicApi()`, no cookies), so the build never depends on the API being up.
  - `.claude/launch.json` gained `servo-app` (the web alone on port 3000): the preview tool gives both apps the same `PORT`, so `pnpm dev` there made the API try port 3000.

## 2026-10-22 — Discovery first, designed from first principles

- **What:** [`docs/DISCOVERY.md`](./DISCOVERY.md) designs how the engine finds every RC event in Florida and how we measure that it did: a census of organisers, their channels, four ways to find events (watch known channels, aggregators, open-web sweeps, monitors) and people. A new roadmap track (D) puts it ahead of more site readers. Nothing new is built yet.
- **Why:** the owner's priority: the engine is only as good as what it finds, and Parallel (or similar) was always meant to be part of it.
- **Impact:**
  - **Search tools give leads, never data.** Parallel's terms forbid using outputs to "create databases" (§2(c)(vi)(B)) and let Parallel train on our queries; Exa and Brave restrict storing and republishing too. We use their answers only to learn which URL to read, then fetch the organiser's page ourselves. Whether we may keep lead URLs and query history must be asked in writing before going live.
  - **Florida in numbers (2026-10-22):** ~110 AMA clubs, ~40–50 car tracks, ~7 MultiGP chapters, 36 model-yacht clubs; 163 FAA FRIAs and 104 recreational fixed sites in Florida (public data, the census backbone); ~400–700 headline events a year plus ~2,000–4,000 recurring race and sailing days, stored as venue schedules, not discovered date by date.
  - **Facebook carries an estimated 50–60 % of all occurrences** (mostly recurring days, crawlers, FPV): reachable only through organisers and members. Headline events are mostly on the open web.
  - **Partnerships to request:** AMA, DualRates (8 of 21 sampled club sites run on it; 3 blocked us by region), MultiGP (Florida-based), RCSignup, Google Calendar clubs.
  - **Planned tables** (`discovery_queries`, `discovery_runs`, `leads`, `lead_hits`) and new env vars for API keys come with D3, with their own entry.
  - Scratch downloads made during the research that contained personal contact details (AMA club pages, FAA point-of-contact fields, calendar descriptions) were deleted; nothing personal was committed.

## 2026-10-22 — The engine reads its first sources (roadmap A3, first part)

- **What:** `pnpm engine [source…]` runs the engine once from the command line (`apps/api/src/engine.ts`): it fetches each source, keeps a copy of what it read, extracts events and stores them as sightings. Two readers so far, in `apps/api/src/events/engine/`: ICS calendar feeds (every public Google Calendar) and schema.org JSON-LD event data (Wix, WordPress event plugins, ticketing pages). New dev dependency: **Vitest** 5.0.5 in `apps/api`, the Itaca standard for unit tests; `pnpm test` runs the tests and `pnpm check` now includes them. New variable: `ENGINE_SNAPSHOT_DIR` (default `.snapshots`, git-ignored).
- **Why:** first step to a calendar nobody has to type. First live result: the engine read **AeroFest** (Nov 5–7, landing fee $40) and **Jets Over Miami 2026** straight from the AMPS site.
- **Impact:**
  - **Politeness is built in, with no switch to turn it off:** the fetcher says who it is (`ServoBot/0.1` + a contact URL, to become Servo's own page once the domain exists), obeys `robots.txt` (RFC 9309), waits at least 2 s between requests to the same site (more if the site asks) and asks for a page only if it changed (ETag / Last-Modified).
  - **Google Calendar feeds are blocked:** `calendar.google.com/robots.txt` disallows all automated access, so the DeLand RC and Coral Springs calendars can't run, although they are public. One copy of each was downloaded by hand on 2026-10-22 to build the test fixtures. Options for the owner and Itaca: ask each club for permission or for the feed directly, or decide that a calendar subscription isn't crawling. Until then they stay `candidate` sources. Coral Springs' calendar also has nothing after early 2026.
  - **Club calendars are mostly not events:** DeLand's mixes events with meetings, chores and "no flying" notices. `classify.ts` sorts entries by title (event kind, notice, club business, practice); notices are skipped for now and will feed the "conditions" feature later. Repeating entries are skipped.
  - **No descriptions from calendars:** they hold organisers' names, phones and emails. The engine keeps title, dates, place and link, plus the exact source line behind each field as evidence. JSON-LD descriptions (one-line taglines) are kept, cut to 300 characters.
  - **Fixtures** in `apps/api/src/events/engine/fixtures/` are trimmed copies of the real DeLand calendar and AMPS pages, with personal data removed.
  - **Not done yet:** HTML readers for Extreme Flight, Horizon, ROAR and RCSignup, and resolve (turning sightings into events, needed for the M1 milestone). Both are now separate items in the roadmap.

## 2026-10-22 — Events engine data model (roadmap A2)

- **What:** ten tables in `packages/db/src/schema/events.ts` (migration `0001_events_engine`): `sources`, `fetches`, `sightings` (what the web said), `events`, `series`, `places`, `hosts` (what we believe), `event_sightings`, `changes` and `reviews` (how we got there). The vocabulary (event kinds, disciplines, statuses, regions, source adapters and trust) and the shapes the API and the extractors share are Zod schemas in `packages/shared/src/events.ts`; the PostgreSQL enums are built from the same lists, so `packages/db` now depends on `@workspace/shared`. `pnpm db:seed` loads the 7 hand-checked events, the 6 places, their hosts and series, and the 9 sources researched on 2026-10-21 (as candidates; the AMA calendar as blocked until AMA says yes).
- **Why:** first step of the approved build order. Events, places and hosts are a public catalogue, so unlike `notes` they have no `owner_id`: anyone reads what is published, only the engine and the crew write.
- **Impact:**
  - **Lifecycle:** the statuses are `expected → announced → confirmed → cancelled | held`. The roadmap's "changed" is a row in `changes` and "results" is `results_url`, not statuses.
  - **Sightings** are stored once per distinct content of a source (`fingerprint`); seeing the same thing again only moves `last_seen_at`. Every version a source published is kept without one row per fetch. Raw responses will go to S3 (`fetches.snapshot_key`); until then the worker keeps them on disk.
  - **Seed data is a copy** of `apps/app/src/content/events.ts` and `places.ts` in `apps/api/src/events/seed-data.ts` (apps can't import each other). The app's copy goes away when `/events` reads from the API (A4). Each seeded event is backed by one sighting from the `servo-crew` source.
  - `reviews.reviewer_id` points to `user`; who may review (the `crew` role) is still for Itaca engineering (A5).

## 2026-10-22 — Roadmap approved: what we index, the community ladder and the build order

- **What:** [`docs/ROADMAP.md`](./ROADMAP.md) is the approved plan. The engine indexes events, series, competitions, places and hosts now; results and rules later; flying conditions last. The community is a ladder (visitor, member, contributor, organiser, crew) built as utility around events and places, not a forum. Build order: the engine runs locally first (track A), research in parallel (track B, starting with a hand-verified golden set of Florida events), and AWS deployment waits for the region and worker decisions (track C).
- **Why:** the owner approved the overview on 2026-10-22. Nothing blocked on AWS or the domain stops the engine from being built and tested against the local database.
- **Impact:** competition results are linked, not stored, until organisers publish them with us (they carry people's names). Events cover all of Florida; places and community start with South Florida. Still for Itaca engineering: region (us-east-2), worker infrastructure, SES, S3 uploads and the `crew` and organiser roles.

## 2026-10-22 — AWS Agent Toolkit and the new AWS experience project

- **What:** AI agents working on Servo get AWS access through the AWS Agent Toolkit (`aws/agent-toolkit-for-aws`): the AWS CLI profile `servo`, signed in with `aws login` (browser sign-in, no access keys), the AWS MCP server and the default AWS skills. The toolkit's rules for the new AWS experience are in `AGENTS.md`, between the `AWS Agent Toolkit rules` markers, and Servo's own rules win where they conflict.
- **Why:** the owner wants agents to be able to inspect and build on AWS with current AWS guidance, without handing them long-lived keys.
- **Impact:**
  - **Project:** a new AWS experience project (account `352587389937`, signed in with social sign-in). These projects are locked to one Region: **us-east-2**. They can't use Lambda@Edge, StackSets or cross-Region features, and they may have a spend limit that pauses the project.
  - **Region conflict, needs Itaca engineering:** `sst.config.ts` and `docs/DEPLOY.md` deploy production to **us-east-1**, which this project does not allow for Lambda, Fargate or RDS. Before anyone deploys into this project, engineering must decide whether to move `providers.aws.region` to `us-east-2` or deploy production to a different (advanced) AWS account. Nothing was changed in the infrastructure files.
  - **Machine setup, not in git:** the profile lives in `~/.aws/` and the AWS skills in each agent's global config (for example `~/.claude/skills`). The `aws-mcp` server is configured per environment, one AWS account each, never globally, all with `AWS_MCP_PROXY_PROFILES=servo` here:
    - **Claude Code:** a local-scope server for this repo only (`claude mcp get aws-mcp`).
    - **Cursor, Codex and OpenCode:** `.cursor/mcp.json`, `.codex/config.toml` and `opencode.json` at the repo root. They are listed in `.git/info/exclude`, so they stay on that machine and out of git.
    - Other repos point their own `aws-mcp` at their own profile. Each engineer who wants this runs the setup on their own machine.
  - **Credentials:** they last 12 hours and renew without the browser for up to 90 days. After that, run `aws login --profile servo` again.

## 2026-10-22 — Always on the latest stable versions

- **What:** project policy: every dependency, runtime and service runs its latest stable release. Releases with security or other important fixes are applied as soon as they pass the 1-day `minimumReleaseAge` in `pnpm-workspace.yaml`. Release candidates, betas and canaries don't count as stable. Applied today:
  - Minor and patch updates: Next.js 16.4.2, React 19.3.1, Better Auth 1.7.12, NestJS 12.2.0, Zod 4.6.7, radix-ui 1.8.1, lucide-react 1.60.0, shadcn 4.22.1, cn 0.5.0, typescript-eslint 8.72.0, Prettier 3.9.10, `@types/node` 24.19.2.
  - `apps/app` moves from ESLint 9.39.5 to 10.13.0. ESLint 9 is marked as no longer supported, and `apps/api` was already on 10. `eslint-plugin-react`, `-import` and `-jsx-a11y` (through `eslint-config-next`) still declare `eslint ^9` as a peer, but `pnpm lint` passes. Revisit when they add 10.
- **Why:** the owner's rule. Outdated versions accumulate known vulnerabilities, and large jumps later are riskier than small ones now.
- **Impact / pending:**
  - **PostgreSQL:** the latest stable is 18. Version 19 is at RC 1, with GA planned for 2026-11-19. Local Docker already runs `postgres:18-alpine`, but `sst.config.ts` still asks RDS for `17`. Moving it to `18` needs explicit approval because it is an infrastructure file. Nothing is deployed yet, so no data migration is needed.
  - **Kept on purpose:**
    - Node.js 24, the active LTS. Node 26 only becomes LTS at the end of October 2026; switch then (`.nvmrc`, `engines`, `@types/node`, Dockerfile).
    - TypeScript 5.9. TypeScript 7.0 is the new native compiler, a major change that needs its own check with Next.js and NestJS.
    - `sst` 4.17.1 and OpenNext 4.1.8. The infrastructure tooling is updated only with approval; 4.17.2 and 4.1.12 are available.
  - **`pnpm audit`:**
    - `braces` (high, no patched version yet), pulled in by the `shadcn` CLI.
    - `esbuild` 0.18 (moderate), pulled in by `drizzle-kit` through the deprecated `@esbuild-kit`.
    - Both are development-time tools that never run in production. Re-check when `shadcn` and `drizzle-kit` publish fixes.

## 2026-10-21 — Servo moves to the `platform` stack (Next.js + NestJS API + PostgreSQL)

- **What:** the repo is now a pnpm monorepo built from the `platform` stack of create-itaca 0.2.0. That version is unreleased; it comes from the `docs/platform-stack-design` branch of `itaca-stacks`, commit `f4d3b9e`.
  - **`apps/app`** holds the whole Next.js site, moved with its history.
  - **`apps/api`** is the NestJS 12 API, with Better Auth 1.7.8 for accounts.
  - **`packages/db`** holds the Drizzle schema and migrations for PostgreSQL.
  - **`packages/shared`** holds the Zod contracts.
  - **`packages/api-client`** is the typed client, generated from OpenAPI.
  - **`packages/ui`** holds the shadcn components and the brand theme: tokens, fonts, cutting-mat and pegboard patterns.
  - The site's own styles (Anatomy figures, Lenis) stay in `apps/app/src/app/globals.css`.
  - The template's `notes` and `sign-in` examples are kept as the reference until the first real module (events) replaces them.
- **Why:** the events engine needs a database, scheduled background work and a real API, and a mobile app is likely. `web-app` keeps the backend inside Next.js, so it can't serve a mobile app or run jobs (`docs/EVENTS-ENGINE.md`).
- **Deviation from the template:** there is **no Astro site (`apps/web`)**. Servo's public pages are the product (dynamic events, a page per event for search, interactive figures, member features), so they live in `apps/app`, served on `www.` (production) and `www-<stage>.` (other stages). The bare domain redirects to `www.`; the API is on `api.`. To feed back into the template: a "no public site" variant of `platform`.
- **Impact:**
  - **Local development needs Docker:** `pnpm db:up && pnpm db:migrate`, then `pnpm dev`. If port 5432 is taken, put `DB_PORT=5433` in a root `.env` and use that port in `apps/api/.env`.
  - **Production has a fixed monthly cost** even with no traffic: load balancer, RDS, NAT instance and a Fargate task. See `docs/DEPLOY.md`.
  - **Nothing is deployed yet.** The first deploy goes to a test AWS account (stage `dev`) once the domain is bought; the domain is still `example.com` in `sst.config.ts` and `itaca.json`.
  - **The worker is not added yet.** It will run SQS + Cron for ingestion inside `apps/api`, and it is the next step of the plan.
  - **Checked:** every page renders with computed styles identical to before the move (home, events, community, contact, RC plane guide). Sign-up, sign-in and a note saved through the API to PostgreSQL work locally.

## 2026-10-21 — The cars and crawlers guide

- **What:** `/guides/cars-and-crawlers`, built like the plane and helicopter guides: a hero that comes apart on scroll (`figures/car-apart`, a 1/10 short-course truck in the Team Associated Pro2 SC10's proportions, 85 solids in 10 assemblies), a sourced timeline (`src/content/car-history.ts`, 12 milestones from the 1960s to 2026), three benches, a part-by-part explorer (`components/guides/car-explorer.tsx`), a section on crawlers, an RC10-versus-RB10 then-and-now table and the local section (Coral Springs RC Track, West Delray Regional Park; cars need no FAA paperwork). The benches: `figures/diff` (Fig 2: an open differential you steer; the carrier turns at the average of the two wheels), `figures/shock` (Fig 3: a coil-over on a dyno; oil from 100 to 1000 cSt changes the overshoot and settling) and `figures/gearing` (Fig 4: pinion, spur and transmission into final drive and theoretical top speed; 18T on the Pro2 is 12.57:1 and about 40 km/h on 2S). `figures/bench/` holds the shapes and the slider hook the three share.
- **What:** the home page's guides now wrap three to a row (the short last row centred), and the cars cover is mat green with light lettering.
- **Impact:** no new dependencies. Numbers come from Team Associated's spec pages, manual and FDR calculator, Axial, ARRMA via Horizon Hobby, Britannica, RC Car Action, BigSquidRC and Hobbywing, linked where they're used. Traxxas's site was offline during research, so no Traxxas figures are used. Assumed and said so in the captions: the diff's 0.7 m tightest turn and gear teeth, the shock's spring rate and the linear damping-to-viscosity model. Top speeds are no-load and theoretical. Line checks: 0 floating ends on all four figures.

## 2026-10-21 — The helicopter guide, and a colour per discipline

- **What:** Air, Rotor and Ground each get their own background (sky, yellow, red) and three plain-language facts with a link to their guide, instead of the spec cards. The truck in the Ground diorama is sky blue and the crawler white, so they stand out on red.
- **What:** `/guides/rc-helicopters`, built like the plane guide: a hero that comes apart on scroll (`figures/heli-apart`, a 450 on a display post, 102 solids in 10 assemblies), a sourced timeline (`src/content/heli-history.ts`, 12 milestones from 1931 to 2013), three benches, a part-by-part explorer (`components/guides/heli-explorer.tsx`), a then-and-now table and the local section. The benches: `figures/swashplate` (Fig 2: three servos at 120° under a two-ring swashplate and a turning head; collective lifts the plate, cyclic tilts it and each blade's pitch swings once per turn), `figures/tail-torque` (Fig 3: the body on a turntable against a torsion spring; tail pitch cancels the rotor's torque at about 8°) and `figures/hover-bench` (Fig 4: a 762 g 450 strapped to a bench scale that reads zero at about +6° of collective).
- **What:** the exploded-figure machinery is shared: `figures/apart/` (`spec.ts`, `live.tsx`, `stage.tsx`, `preview.tsx`, `faded.tsx`) now drives the plane, the helicopter and the truck, and `figures/live-solid.tsx` is the painter every animated bench uses. Guide covers on the home page are stills of each guide's own hero (`ApartPreview`).
- **Why:** the user asked for the helicopter and car guides at the plane guide's level of detail, and for each discipline section to stand on its own colour.
- **Impact:** no new dependencies. Facts and numbers come from Model Aviation, the AMA History Project, the FAI, Guinness World Records, Mikado, and the Horizon Hobby, Align and Microbeast manuals, each linked where it's used. The torque bench's 1.05 N·m hover torque is an estimate (about 300 W at 2,700 rpm) and says so in its caption. Line checks: 0 floating ends on all four helicopter figures.

## 2026-10-21 — Events engine: design proposal

- **What:** a design for an events engine that finds, reads, merges, checks and publishes RC events, Florida first, then the US: [`docs/EVENTS-ENGINE.md`](./EVENTS-ENGINE.md). It includes the Florida source inventory (checked 2026-10-21), a first data model and five phases. Nothing is built yet.
- **Why:** the calendar is typed by hand and already misses events (AeroFest, Miami, Nov 5–7). Being the reference for RC events needs a system, not more typing.
- **Impact:** phase 0 needs nothing new. From phase 1 the engine needs PostgreSQL + Drizzle, scheduled background jobs (likely EventBridge + SQS + Lambda in `sst.config.ts`), S3 for snapshots, an LLM provider for extraction and geocoding. **Itaca engineering must choose and own the background-job infrastructure** before any of it is built. Reading the AMA calendar needs AMA's permission (commercial-use clause in their terms); MultiGP and FPVScores need a partnership; Facebook, Reddit, Meetup, Eventbrite, RCGroups and bot-walled sites are off-limits.

## 2026-10-21 — One title style, the real plane on the cover, a fading wall, a full footer

- **What:** the bench, guides and calendar sections open with one title style (`SectionTitle`): a plain first line and a second line on a colour tag (`Tag`, the same device as "Serious" in the hero), yellow, sky and red. It replaces the boxed `SectionTag` and the bench's yellow second line.
- **What:** guide cover No. 01 shows the guide's own Anatomy figure as a still, part-way apart with the wing lit (`plane-apart/preview.tsx`, drawn on the server from the figure's `SLOTS`, cropped to the pose). The hand-drawn plane it replaced is gone.
- **What:** the pegboard behind "On the calendar" fades up out of the page and back into it (a masked layer) instead of starting and stopping on hard edges.
- **What:** the footer (`src/components/site-footer.tsx`) gains a chequered finish line, a pitch with the booking buttons, four link columns built from the content (services, guides and what's in the works, the local scene, and the official FAA and AMA links from `rules.ts`), a giant wordmark and a back-to-top link.
- **Impact:** no new dependencies. The home page HTML grows by the cover figure's paths (static, no script).

## 2026-10-21 — The new colours reach the hero, the crew sheet and three 3D dioramas

- **What:** the hero gets parts lying around the servo card (`src/components/home/bench-parts.tsx`): a red propeller with yellow tips across its corner, a yellow-rimmed buggy wheel and a sky-blue LiPo with its red lead and XT60 peeking out from under it. The prop and wheel turn with the same scroll signal as the horn. "Serious" in the headline sits on a sky tag in the `SectionTag` style. On phones the hero now uses safe centring and a smaller servo, so the headline no longer slides under the header.
- **What:** the decal sheet uses the full palette: "First model" is sky, "Advanced" is red, the printer's colour bar shows all six inks, and wide screens get two decorative spares (a wing roundel and a "03" race plate).
- **What:** the Air, Rotor and Ground spec tables are now small spec chips, and each discipline has a 3D diorama on a black display base (`src/components/scenes/`): a trainer flying circuits with a loop over a club field (`airfield.ts`), a 450 helicopter that lifts off, pirouettes and lands on a helipad (`helipad.ts`), and a short-course truck flying a jump on a sand oval while a crawler climbs the rocks in the infield (`dirt-track.ts`). `toy.ts` is the shared kit: three flat tones per brand colour, black ink outlines (inverted hulls), an orthographic camera, ink shadows, and `bake`, which merges everything static so a scene draws in roughly 40–70 calls. The plane's attitude comes from its path (lift along the needed acceleration plus gravity), and the truck's jump is a parabola from the kicker's lip to the landing ramp. `src/components/home/toy-stage.tsx` mounts a scene.
- **Why:** the colours were introduced for a poppier hero but first appeared halfway down the page; the tables read like a spec sheet rather than the hobby.
- **Impact:** new dependency **`three` 0.186.1** (plus `@types/three` for development). It is not in the standard-choices table, so Itaca engineering should review it. It is about 145 KB gzipped and loads only when a discipline section comes within 600 px of the screen; each scene adds about 4 KB. Scenes render only while on screen, show one still frame under `prefers-reduced-motion`, cap the pixel ratio at 2, and leave the section readable if WebGL is unavailable. Colours are read from the CSS tokens at runtime, so the palette stays in `globals.css`.

## 2026-10-20 — Two more colours; guides and events get their own sections

- **What:** the palette opens slightly, using fireship.dev as a reference for colour but deliberately using fewer colours: `--sky` (`#4DA3F0`, the sky planes fly in) and `--lead` (`#F0553C`, a LiPo's red lead) join XT60 yellow and cutting-mat green as accents (`bg-sky`, `bg-lead`). Both pass AA with black text (7.8:1 and 6.1:1).
- **What:** "From the bench" and "Next on the calendar" were one two-column section that made a guide and three events look like the same kind of thing. They are now two sections, each opened by a `SectionTag` (the title on a block of colour): guides are kit assembly-manual covers (`manual-cover.tsx`: stapled spine, manual number, an exploded-view drawing, plus a dashed "in the works" draft), and upcoming events are pit passes hanging on a workshop pegboard (`pit-passes.tsx`, `bg-pegboard` in `globals.css`) whose lanyard colour gives the kind (fly-in sky, competition lead, show yellow). Each pass links to its entry on `/events`, which now carries an `id` per event.
- **What:** the bench's wide layout is now symmetric about the centre line so the title, readout and button read as one column.
- **Impact:** no new dependencies. `GUIDES` entries gained a `cover` field.

## 2026-10-20 — The cutting-mat section is a working bench

- **What:** the home's "Same six parts" cards (KV, amps, cell voltage, channels) are replaced by `src/components/home/signal-bench.tsx`: the six parts of any RC model (transmitter, receiver, servo, speed controller, motor, battery) drawn top-down on the cutting mat and wired up. The transmitter's sticks are real sliders (pointer and keyboard): the left one sets power and spins the propeller, the right one turns the servo horn and springs back to centre. Until someone touches them the bench runs a slow demo. Wide screens label parts with masking tape; narrow screens use numbered badges and a list.
- **Why:** the old cards assumed you already knew the hobby. The bench answers the outsider's first question, "how does a remote-control model work?", with less text.
- **Impact:** no new dependencies (Motion and lucide-react). Animation pauses off screen and under `prefers-reduced-motion`. The hero servo lost its "servo" label.

## 2026-10-20 — The crew section is a decal sheet

- **What:** the home page's "Three of us" section is a kit's decal sheet (`src/components/home/decal-sheet.tsx`): the headline as vinyl lettering with a die-cut edge, the five services as stickers in different die-cut shapes that slap onto the sheet when it scrolls into view and peel a corner on hover, and the Servo logo decal. It replaced a transmitter version that repeated the hero's two-column layout on black.
- **What:** the VT323 pixel font, transmitter tokens and `lcd-pixels` utility added for the transmitter are no longer used and were removed.
- **Why:** a change of rhythm after the hero, playful and specific to the hobby, with very little text.
- **Impact:** none functional. Services carry `short` and `tag` fields in `src/content/services.ts`.

## 2026-10-20 — Figures drawn on the page, centred frame

- **What:** Anatomy figures no longer sit in a white card. `FigureFrame` (`src/components/figures/figure-frame.tsx`) replaces the kit's `Plate` for site use: figure number and title centred above, the live readout (a pill) and the hint centred below, then legend and caption. The kit's light tokens are retuned to the primer-grey page in `globals.css` (`.servo-figure`). The RC plane guide is now a centred, symmetric layout, including the hero.
- **Why:** the figures should read as part of the article, not as embedded widgets.
- **Impact:** none functional; the readout keeps the kit's `.iso-plate [data-readout]` contract. On phones figures bleed edge to edge instead of being cropped.

## 2026-10-20 — More Anatomy figures in "The RC plane, taken apart"

- **What:** four figures now carry the guide, all in `src/components/figures/`: `plane-apart` (hero, Fig 1: a trainer on its stand that comes apart into 9 assemblies as the page scrolls, with a numbered assembly list that highlights each one), `thumb-to-elevator` (Fig 2), `balance` (Fig 3: a beam balance for the CG, 25–33% of chord) and `thrust-stand` (Fig 4: 1000 KV motor, 10 × 7 prop, 3S pack, servo tester, wattmeter and load cell).
- **Why:** the guides are meant to be explained by real, explorable machines rather than text alone.
- **Impact:** every figure reads from a pure `model.ts`. The thrust stand uses the standard prop equations with typical sport-prop coefficients (Ct 0.11, Cp 0.06) and says so in its caption; the balance uses typical trainer weights (1150 g airframe, 185 g pack). The hero is a Hero-sized figure (79 solids); the full exploded plane with ribs, wiring and wing internals would be an Epic and was not built. Line checks: 0 floating ends on all four (`node .claude/skills/anatomy/scripts/lines.mjs <url> --select "<root> svg"`).

## 2026-10-20 — Site structure, content and the Anatomy figure kit

- **What:** pages for the South Florida crew: `/learn` (services), `/events` (calendar), `/community` (clubs, fields, tracks and a build submission form), `/guides` with two guides (`/guides/rc-planes`, `/guides/flying-legally`) and a contact form with a topic field. Content lives as typed data in `src/content/`; every event, place, rule and history milestone links to its source (researched and checked 2026-10-20).
- **What:** the Anatomy skill (github.com/wheresryan22/anatomy, MIT, commit 1482e84) is installed in `.claude/skills/anatomy` for the team, and its kit is vendored in `src/components/iso/` (plus `lathe.d.mts` types). Fig 1, "Thumb to elevator", is in `src/components/figures/thumb-to-elevator/`: a pure model (`model.ts`) drives every number, and `node .claude/skills/anatomy/scripts/lines.mjs <url> --select ".tte svg"` reports 0 floating line ends.
- **What:** the kit needs its own stylesheet (`src/components/iso/iso.css`). Brand overrides for figures and the plane explorer live at the end of `src/app/globals.css`. Both kit folders and `.claude/` are excluded from ESLint, Prettier and TypeScript like `components/ui`.
- **Why:** the brand's core content is long-form, visual explainers; the kit gives us a consistent, auditable way to build them.
- **Impact:** **contact and build submissions are validated but only logged** — they are not delivered anywhere yet. Delivery needs Amazon SES (standard choice) and a verified sender: engineering to set up. Community posting by members (phase 2) needs a database and auth (PostgreSQL + Better Auth per the standard); not started. `/` and `/events` revalidate daily so past events drop off. Events, clubs and rules need a periodic re-check: dates and rules change.
- **Note:** in this environment the Turbopack dev server does not hot-reload `globals.css`; restart `pnpm dev` after CSS edits.

## 2026-10-20 — Servo brand system and scroll motion

- **What:** brand "Servo" (working name). Theme tokens in `src/app/globals.css`: primer grey background `#E4E4DF`, panel `#FAFAF7`, ink `#000`, XT60 connector yellow `#FFC629` (primary), cutting-mat green `#2E6A4E` (one section only, `bg-cutting-mat`). Hard offset shadows (`shadow-hard-sm/-/-lg`) and 2px ink borders; buttons press down into their shadow. One type family, Archivo (variable width): `font-wide` for headlines and the lowercase `servo` wordmark, normal width for body text.
- **What:** added `lenis` (smooth inertial scroll, `src/components/smooth-scroll.tsx`) and `motion` (scroll-linked animation: servo hero, drifting section words).
- **Why:** the site is a visual, scroll-driven showcase of the RC hobby; both libraries are small, React-friendly and widely used. Both are disabled or neutralised under `prefers-reduced-motion`.
- **Impact:** no env vars or services. Brand name may still change; it lives in `src/lib/site.ts` and `src/components/wordmark.tsx`.

## 2026-10-20 — Project created

- **What:** scaffolded with `create-itaca@0.1.0`: stack `web-app`, deployed to AWS via `sst`, Cloudflare in front.
- **Why:** Itaca Technologies standard stack.
- **Impact:** none.
