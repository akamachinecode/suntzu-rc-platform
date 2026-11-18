# follows.count — Anyone sees how many people follow something

- **Trigger:** `GET /people/{target}/{id}` on the API. No screen calls it yet: the event and club pages show their counts ("2 going · 5 following") from `events.get` and `hosts.get`.
- **Who:** anyone, without signing in (`@Public()`).
- **Path:** caller → `MembersController.people` → `MembersService.people` (`apps/api/src/members/`).
- **Data:** counts rows in `follows` and, for events, `rsvps`. Writes nothing.
- **Rules:** numbers only, never who: the answer is `{ following, going }` and nothing else. `going` only counts for events (0 for clubs, places and disciplines); going also follows, so it counts in both. The target is a public slug (or a discipline's name); unknown or unpublished → 404, an unknown kind → 400. Cached for a minute (`Cache-Control: public, max-age=60`).
- **Errors:** 404 or 400 as above.
- **Test:** `e2e/follows.count.e2e.ts` (counts go up and down as members follow and go, the answer holds only the two numbers, clubs, places and disciplines count followers and nobody going, unknown things 404 and an unknown kind 400)
- **Observe:** API log lines with `bit: "follows.count"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
