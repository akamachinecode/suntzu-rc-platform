# search.misses — The crew sees what people searched for and didn't find

- **Trigger:** a search that finds nothing, or only partial matches (no result has every word): the results page reports it when it opens, the box when someone closes it without choosing. The crew reads the list in `/crew` ("Searched, not found").
- **Who:** anyone's search is counted, anonymously; only the crew (`CREW_EMAILS`) reads the list.
- **Path:** `ReportMiss` (`apps/app/src/components/search/report-miss.tsx`) or `SiteSearch` → `reportMiss` (`apps/app/src/lib/search.ts`, once per search per visit) → `POST /search/misses` → `SearchService.recordMiss` → `recordMiss` (`apps/api/src/search/search.ts`) searches again and writes `search_misses`. `/crew` → `getApi()` → `GET /search/misses` (`@CrewOnly()`) → `listMisses`. `pnpm notify` (scheduled) → `purge` → `purgeMisses`.
- **Data:** writes `search_misses`: Florida day, normalised words, results, count. Never the account, IP address, location or device.
- **Rules:** counted only if the API's own search still finds nothing or only partial matches, so the browser can't plant a search that works. Text that looks like an email, a phone number or a street address is dropped (`looksPersonal`, `query.ts`). The list shows the 50 most frequent in the last 90 days; the clean-up deletes older rows. The privacy policy says so ("Searching").
- **Errors:** the report always answers 204 and never shows anything to the visitor; if it fails, the search just isn't counted. The list answers 401 without a session and 403 for anyone outside the crew.
- **Test:** `golden.test.ts` ("counts searches without results anonymously and forgets them after 90 days", "says when no result has every word") and `query.test.ts` (`looksPersonal`).
- **Observe:** API log lines with `bit: "search.misses"`; the `notify:` line counts what the clean-up deleted.
- **Status:** verified — 2026-10-29
