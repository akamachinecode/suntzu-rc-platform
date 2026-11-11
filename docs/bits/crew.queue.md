# crew.queue — The crew sees what needs a person

- **Trigger:** a crew member opens `/crew`.
- **Who:** the crew (`CREW_EMAILS`); anyone else gets 403 and a "Crew only" page.
- **Path:** `apps/app/src/app/crew/page.tsx` → `getApi()` → `GET /crew/summary`, `/crew/reviews`, `/crew/messages`, `/crew/feedback` → `CrewService` (`apps/api/src/crew/`), guarded by `@CrewOnly()`; and `GET /search/misses` for "Searched, not found" (see [search.misses](./search.misses.md)).
- **Data:** reads open `reviews` with their event, sighting (fields and the exact source text behind each) and source; `messages`; unseen `feedback`; counts of try-it requests and club claims; the searches without results of the last 90 days.
- **Rules:** oldest first; at most 200 at a time. Each card shows what the engine understood in plain words (dates, kinds, disciplines, the page by its site) and folds the source's exact words under each field: structured data quoted from a page reads as one line per value, anything else as written (`crew/format.ts`, tested in `format.test.ts`).
- **Errors:** an API failure shows empty lists.
- **Test:** `apps/app/src/app/crew/format.test.ts` (how a card reads)
- **Observe:** API log lines with `bit: "crew.queue"`.
- **Status:** verified — 2026-11-11 (a local review with staging-like evidence, at 390 px)
