# engine.resolve — What the sources say becomes events

- **Trigger:** the end of every `pnpm engine` run; `pnpm engine --resolve` runs it alone (on a schedule once deployed, spec 0004).
- **Who:** the engine.
- **Path:** `apps/api/src/engine.ts` → `events/engine/resolve.ts` (orchestration and writes) → `events/engine/match.ts` (names, dates, verdicts) → PostgreSQL.
- **Data:** reads every source's latest version of each entry (`sightings`), `events`, `series`, `places`, `hosts`; writes `event_sightings`, `events`, `series`, `changes` and `reviews`.
- **Rules:**
  - Same event when the dates fit (same days, overlapping, within three days, or the month an expected event usually happens) and the names agree (acronyms, years and filler ignored), or the same host runs it. Next year's edition is never the same event.
  - Not sure ("maybe") → a `merge` review for the crew; nothing is created until they decide.
  - New events: published at once when they come from the organiser's own site; otherwise they wait for the crew (`new-event` review) until a second, independent source agrees.
  - Changes (dates, cancellation, fee, entry link) are applied when the source speaks for the organiser (the host's own site, a sanctioning body) or is the event's only source; otherwise a `change` review. Every applied change is a row in `changes` (the page's history and the source of alerts).
  - Past announced or confirmed events become `held`; each series whose last edition is over gets next year's edition as `expected` ("Usually November").
  - Confidence: each independent source adds its weight (organiser 0.9, sanctioning body 0.85, aggregator 0.6, community 0.4).
- **Errors:** one entry failing is reported and skipped; the run goes on.
- **Test:** `apps/api/src/events/engine/match.test.ts`.
- **Observe:** the `resolve:` lines printed by `pnpm engine`.
- **Status:** verified — 2026-10-27 (AeroFest published from the AMPS site; "JOM 2026" linked to Jets Over Miami; a second run changes nothing)
