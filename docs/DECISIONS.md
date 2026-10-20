# Decisions log

Every non-trivial decision goes here, newest first: new dependencies, environment variables, external services, data model changes, deviations from the Itaca standard. Itaca engineering reads this file when taking over the project.

Format:

```md
## YYYY-MM-DD — Short title

- **What:** what was decided or added.
- **Why:** the business or technical reason.
- **Impact:** new env vars, services, costs, risks, follow-ups for engineering.
```

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
