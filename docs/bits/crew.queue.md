# crew.queue — The crew sees what needs a person

- **Trigger:** a crew member opens `/crew`.
- **Who:** the crew (`CREW_EMAILS`); a signed-in member gets a "Crew only" page (the API answers 403), and a signed-out visitor is sent to `/sign-in` (the API answers 401).
- **Path:** `apps/app/src/app/(app)/crew/page.tsx` → `getApi()` → `GET /crew/summary`, `/crew/reviews`, `/crew/messages`, `/crew/feedback` → `CrewService` (`apps/api/src/crew/`), guarded by `@CrewOnly()`; and `GET /search/misses` for "Searched, not found" (see [search.misses](./search.misses.md)).
- **Data:** reads open `reviews` with their event, sighting (fields and the exact source text behind each) and source; `messages`; unseen `feedback`; counts of try-it requests and club claims; the searches without results of the last 90 days.
- **Rules:** oldest first; at most 200 at a time. Each card says what kind it is ("New event", "Same event?", "Something changed"…), marks members' suggestions "From a member" (never who), shows what we publish today next to the proposed change, and reads in plain words (dates, kinds, disciplines, the page by its site), folding the source's exact words under each field: structured data quoted from a page reads as one line per value, anything else as written (`crew/format.ts`, tested in `format.test.ts`).
- **Errors:** an API failure shows empty lists.
- **Test:** `e2e/crew.queue.e2e.ts` (a member's correction as a card: kind, "From a member", note, what we publish, the proposed change in words, the three buttons; the oldest first; a member gets "Crew only" and 403; signed out goes to sign-in and gets 401); how a card reads is unit-tested in apps/app/src/app/(app)/crew/format.test.ts
- **Observe:** API log lines with `bit: "crew.queue"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
