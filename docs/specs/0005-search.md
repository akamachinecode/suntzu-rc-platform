# 0005 — Search across the whole site

- **Status:** Built 2026-10-29 (approved 2026-10-28); part of SunTzu RC 1.0 since 2026-10-29
- **Requested by:** the owner (Alejandro), 2026-10-28
- **Approved by:** the owner, 2026-10-28 (past events below and marked; 25 miles, widen to 50 or 100; common Spanish words; searches without results counted anonymously for 90 days; the engine is Itaca's choice)

## Problem

Someone lands on SunTzu RC looking for one thing: an event, a field, a club, a rule. Today each section has its own search box (events and places filter in the browser), and guides, rules and clubs can't be searched at all. Typing "Markham Park", "Hialeah" or "do I need to register my plane" from the home page finds nothing, and the "RC track near me" question that Google answers with spam (`LANDSCAPE.md`) has no answer from the front door.

## Goals

- One search box, on every page, that finds events, places, clubs, guides, rules and SunTzu RC's services, and puts the right answer first even with a typo or half a word.
- A town or ZIP code answers "what's near there": fields, tracks, clubs and events within 25 miles, closest first.
- Search never disagrees with the pages: a cancelled event shows as cancelled the moment its page does, and nothing that isn't public ever appears.
- New kinds of content (RC models, builds, results) can join the search later without rebuilding it.
- The crew learns what people look for and don't find.

## Out of scope

- "Ask SunTzu RC": answers in plain language written by AI. Later, once search is in use (see `ROADMAP.md`).
- Town pages for Google ("RC events near Orlando"). A separate feature with its own SEO work.
- Searching members, builds, messages or the crew's queue. Search only covers what's public.
- A crew screen to edit synonyms and pinned answers: in v1 they live in code and change with a pull request.
- Translating the site into Spanish. Search understands common Spanish words; results stay in English.
- Replacing the in-page filters on `/events` and `/places`. They keep working; search links to them.

## User stories

- As a visitor, I want to type a name and get the event, field or club I mean, even if I misspell it, so that I don't have to know which section it's in.
- As a visitor, I want to type my town or ZIP code and see what's near me, closest first.
- As a newcomer, I want to ask a question in plain words ("how high can I fly", "flying lessons") and land on the rule or the service that answers it.
- As a Spanish speaker in South Florida, I want "pista de carros cerca de Hialeah" to work.
- As a keyboard or screen-reader user, I want to open search, move through the results and open one without a mouse.
- As the crew, I want to see the searches that found nothing, so that we know which events and places to add.

## Capabilities touched

- **Front door:** one public, read-only API endpoint (`GET /search`), cacheable for five minutes like the other public endpoints. No form, so no Turnstile. The results page is `noindex`: Google indexes the pages themselves, not our searches.
- **Data:** a search index built from events, places, clubs and the site's content (guides, rules, services), kept in step with them by the database itself. Guides, rules and services move from `apps/app/src/content/` to `packages/shared` so that the API can index them and a future mobile app can show them. Search runs in PostgreSQL, which we already have, so there is no new service or monthly cost (see "Engine choice" below).
- **Data (anonymous):** searches that found nothing or little (nothing, or no result with every word) are counted per day: the normalised words and the number of results, never the account, IP address or location. Text that looks like an email, a phone number or a street address is dropped. Counts are deleted after 90 days, and the privacy policy says so. Request logs already record only the route, not the words searched.
- **Clients:** the same endpoint and typed client serve the web box, the results page and a future mobile app.
- **Operations:** the bit `search.query` in the request logs, with its response time. No new alerts.

## Bits

- New: `search.query` — a visitor searches, from the box or the results page.
- New: `search.misses` — the crew sees what people searched for and didn't find.
- Changed: `crew.queue` — the crew page gains a "searched, not found" list.

## Acceptance criteria

- When someone presses ⌘K or Ctrl+K, presses `/`, or taps the search button on any page, then search opens; on a phone it fills the screen.
- When they type, then results appear as they type, grouped as Events, Places, Clubs, and Guides and rules, each with its type, town and date where it has them.
- When they type a name with a typo or only part of it ("aerofst", "snowb", "markam park"), then the right item comes first.
- When the search is a Florida town or ZIP code ("Hialeah", "33441", "fields near Tampa"), then results within 25 miles are listed closest first, with a button to widen to 50 or 100 miles and a link to "Can I fly here?" for that spot.
- When an event has already happened, then it appears below the upcoming ones, marked "Past", with a link to its next edition when we know it.
- When the search uses common Spanish words ("avión", "helicóptero", "pista", "carros", "eventos", "cerca de"), then it finds the same as the English words.
- When they press Enter, then `/search?q=…` opens: a page that works without JavaScript, can be shared as a link, has tabs per type and isn't indexed by Google.
- When an event changes or is cancelled, then search shows the change as soon as the event's page does.
- When something isn't public (a rejected or unpublished event, anything about a member, the crew's queue), then search never shows it.
- When a search finds nothing, then it offers This weekend, Near me, Can I fly here? and Send us your event, and the search is counted anonymously.
- When the crew opens `/crew`, then they see the most frequent searches without results from the last 90 days; older counts are gone.
- When search opens empty, then it shows the person's last few searches (kept only on their device) and the same shortcuts.
- When someone uses only a keyboard or a screen reader, then they can open search, move through the results and open one.
- When the golden searches run in the tests, then at least 32 of the 36 below put the right answer first (all 36 since slice 1), and a change that lowers the score fails `pnpm check`. The test needs a database, so CI skips it until CI gets one (Itaca engineering, `.github/`).

### Golden searches

The searches a visitor would type, and what must come first. They come from the comparison of 2026-10-28 (see "Engine choice") and grow as the crew sees real searches.

| Kind              | Searches                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Names             | aerofest · jets over miami · markham park · snowbird nationals · sarasota silent flyers · coral springs rc track |
| Typos             | aerofst · markam park · jets ovr deland · snowbrid nationals · corel springs track · helicoptor                  |
| Half-typed        | aero · jets ov · snowb · mark · jacksonville je                                                                  |
| Punctuation       | b&t raceway · ormond beach rc club (the club writes "R/C") · dialed rc x                                         |
| The hobby's words | heli · crawler · 1/8 scale · fpv · car track · fly in                                                            |
| Questions         | do i need to register my plane · how high can i fly · can i fly in miami dade parks · flying lessons · remote id |
| Places            | orlando · 33441 · rc field near tampa · naples · events near miami                                               |

Each search's expected answer is in `apps/api/src/search/golden.test.ts`. Four failed in the comparison; slice 1 fixed them with pinned answers ("flying lessons", "how high can i fly"), a bonus for exact words over near-spellings ("fly in") and shorter titles first on a tie ("mark"). The searches were tuned against this same list, so it must grow with real searches before the score means much.

## Engine choice

On 2026-10-28 the same 369 documents and 36 searches ran on PostgreSQL and on Typesense, each out of the box and tuned. Tuned, they tie (right answer first: PostgreSQL 32, Typesense 31; both about 3 ms). Out of the box Typesense is far better (24 against 15), but its advantage is less tuning work, which the comparison already did. PostgreSQL needs no new service, bill or infrastructure review, and its index changes with the data itself, so search can't fall behind the pages. Its known weakness is ranking rare words above common ones ("high" school fields before the 400 ft rule); if the index grows past about 100,000 documents (a national catalog of models) or that weakness shows in real searches, Typesense is the next step, and keeping all search code in one module keeps that move small. Recorded in `DECISIONS.md` when this spec is approved.

## Slices

- [x] 1. The index and the API: search documents for events, places, clubs, guides, rules and services (content moved to `packages/shared`); `GET /search` with typo tolerance, half-typed words, towns and ZIP codes, Spanish words and pinned answers; the golden searches as tests. (blocked by: —)
- [x] 2. The results page `/search?q=`: grouped results, tabs per type, "Past" events, the 25-mile radius with 50 and 100, "Can I fly here?" for a town or ZIP, `noindex`. (blocked by: 1) — done 2026-10-29. A town or ZIP now keeps results inside the radius, closest first (events, places and clubs without a place on the map are left out; guides and rules stay). Tabs are `?in=events|places|clubs|learn`; "Can I fly here?" opens at the spot with `?at=lat,lng`, and "Near me" is `/places?near=me`.
- [x] 3. The search box: ⌘K, Ctrl+K and `/` from any page, a search button in the header and the mobile menu, results as you type, keyboard and screen reader, recent searches on the device, shortcuts when empty, full screen on a phone. (blocked by: 1, 2) — done 2026-10-29. Arrows choose a result and Enter opens it; Enter with none chosen opens `/search`. The box asks the API from the browser (public data, no cookies).
- [x] 4. Searches without results for the crew: anonymous daily counts, deleted after 90 days, the list on `/crew`, the line in the privacy policy. (blocked by: 1) — done 2026-10-29. "Little" means no result has every word (the API says so with `partial`, and the page says "these come closest"); a search that found a few exact results isn't counted. The browser reports it (`POST /search/misses`), the API searches again and counts it only if it still finds nothing; the box reports only when someone closes it without choosing. The scheduled clean-up (`pnpm notify`) deletes counts after 90 days.

## Open questions

- Which pinned answers to add after the first weeks of real searches (beyond "lessons" and "how high") — who should answer: the crew, from the "searched, not found" list.
- Whether CI should run the golden searches against a PostgreSQL service (a change to `.github/workflows/ci.yml`) — who should answer: Itaca engineering.
- Whether `/search` needs a Cloudflare rate-limit rule at launch (responses are cached and the endpoint only reads) — who should answer: Itaca engineering, during the launch checklist.

## Needs Itaca engineering

- No. Search runs on the existing database and API; the PostgreSQL extensions it uses (`pg_trgm`, `unaccent`, `fuzzystrmatch`, `cube`, `earthdistance`) are standard on Amazon RDS and are created by a migration. Searches are counted without anything that identifies a person. The rate-limit rule above is optional and is Itaca's call.
