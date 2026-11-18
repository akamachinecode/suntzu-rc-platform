# organiser.dashboard — An organiser opens the club dashboard

- **Trigger:** "Open the club dashboard" on `/organise` (reached from "Your clubs" on `/me`), or `/organise/<club>`.
- **Who:** the club's verified organisers. Anyone else signed in (an unverified claimant, an organiser of another club) sees "Not yet" with a link to claim it, and the API answers 403; signed out, `/organise/<club>` goes to `/sign-in` and the API answers 401.
- **Path:** `apps/app/src/app/(app)/organise/[host]/page.tsx` → `getApi()` → `GET /organise/{host}` → `OrganiseService.dashboard` (checked by `organisedHost`).
- **Data:** reads the club (`hosts`), its places, its published events from 30 days ago on with, for each, who is going (`rsvps`) and following (`follows`) and whether its organisers published it; how many follow the club and the total going.
- **Rules:** only the club's own events (`events.host_id`); events found on the web by the engine say so ("your changes take priority"). The page holds everything an organiser does: publish and quick changes ([organiser.publish](./organiser.publish.md)), the club's details ([organiser.update-club](./organiser.update-club.md)), its fields ([places.confirm](./places.confirm.md)) and the widget code to paste on the club's site ([organiser.widget](./organiser.widget.md)).
- **Errors:** an unknown club answers 404; the page shows "Not yet" for any refusal.
- **Test:** `e2e/organiser.dashboard.e2e.ts` (from `/me` to the dashboard: counts, the club's field, the widget code and preview; a follower and a member going are counted, per event too; another club's events never show and its dashboard is "Not yet" and 403; an unknown club 404; signed out goes to sign-in and 401; a member who doesn't run it "Not yet" and 403)
- **Observe:** API log lines with `bit: "organiser.dashboard"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
