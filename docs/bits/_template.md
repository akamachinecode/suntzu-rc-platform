# area.action — One-line name

- **Trigger:** what starts it (a click, a form, a schedule, a webhook).
- **Who:** who can do it (anyone, signed-in users, admins).
- **Path:** each step it goes through, for example browser → app → API → database → email. Name the files.
- **Data:** what it reads and what it writes.
- **Rules:** the business rules it applies.
- **Errors:** how it can fail and what the person sees.
- **Test:** the end-to-end test that proves it, `e2e/area.action.e2e.ts` (plus any unit test file), or `manual: <why it can't be automated, and the steps>`. `pnpm check` fails without one.
- **Observe:** how to find it in the logs, or "no request logs yet".
- **Status:** verified · read in code · not verified · broken — YYYY-MM-DD
