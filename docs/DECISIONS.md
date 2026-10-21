# Decisions log

Every non-trivial decision goes here, newest first: new dependencies, environment variables, external services, data model changes, deviations from the Itaca standard. Itaca engineering reads this file when taking over the project.

Format:

```md
## YYYY-MM-DD — Short title

- **What:** what was decided or added.
- **Why:** the business or technical reason.
- **Impact:** new env vars, services, costs, risks, follow-ups for engineering.
```

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
