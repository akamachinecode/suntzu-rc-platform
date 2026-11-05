# crew.queue — The crew sees what needs a person

- **Trigger:** a crew member opens `/crew`.
- **Who:** the crew (`CREW_EMAILS`); anyone else gets 403 and a "Crew only" page.
- **Path:** `apps/app/src/app/crew/page.tsx` → `getApi()` → `GET /crew/summary`, `/crew/reviews`, `/crew/messages`, `/crew/feedback` → `CrewService` (`apps/api/src/crew/`), guarded by `@CrewOnly()`; and `GET /search/misses` for "Searched, not found" (see [search.misses](./search.misses.md)).
- **Data:** reads open `reviews` with their event, sighting (fields and the exact source text behind each) and source; `messages`; unseen `feedback`; counts of try-it requests and club claims; the searches without results of the last 90 days.
- **Rules:** oldest first; at most 200 at a time.
- **Errors:** an API failure shows empty lists.
- **Test:** none yet
- **Observe:** API log lines with `bit: "crew.queue"`.
- **Status:** verified — 2026-10-29
