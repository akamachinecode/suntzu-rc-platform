---
name: fix
description: Fixes something that is broken, with proof - reproduce the problem, find the real cause, make the smallest fix and show that it now works. Use when something fails, shows an error, looks wrong or stopped working ("it doesn't work", "error", "bug", "no funciona", "falla", "se rompió").
---

# Fix

Fix the cause, not the symptom, and prove it.

1. **Reproduce it.** Get the exact steps, page, input and what was expected. Run it yourself and capture the error (message, log line, screenshot). If you can't reproduce it, ask focused questions instead of guessing.
2. **Follow the path.** Find the affected bit in `docs/bits/` and follow its path through the code. In logs, follow the request's `x-request-id` (or `cf-ray`) when the project has them.
3. **Name the cause** in one sentence, backed by what you saw: the line, the value, the log. If you can't, keep investigating; don't patch around it.
4. **Lock it in.** Add a test that fails because of this bug: the bit's end-to-end test in `e2e/<bit>.e2e.ts` for what a person sees, a unit test next to the code for a rule or a calculation. Run it and watch it fail. If it truly can't be automated, write the reproduction steps in the bit's doc (`Test: manual: …`).
5. **Make the smallest fix** that removes the cause. No refactors or unrelated improvements in the same change.
6. **Prove it** with `/verify`: the new test passes, nothing else broke, and you saw it working. At most three rounds: if it still fails, stop and explain what you found.
7. **Update the docs.** If the bit's behaviour or its known errors changed, update `docs/bits/<id>.md`. If the cause reveals a decision or a risk, add it to `docs/DECISIONS.md`.
8. **Could a check have caught it?** If this bug can be spotted from a diff ("a query without the owner filter", "a new variable missing in production"), propose a new item for `docs/CHECKS.md` (trigger, check, why, this pull request) to the person. It goes in its own pull request, never in this one.
9. **Deliver it** with `/ship`.

**Security findings** (the `NOT MET` rows of a `/security` report, or a named problem like a leaked key): fix only the selected rows, smallest change first. Every authorization or data-isolation fix adds its end-to-end test with an "another user" and a "lower role or signed out" case that fails without the fix. Then run `/security` again on those rows, at most three passes. A leaked key stays `NOT MET` until the person confirms it was rotated: never read, print or rotate it yourself.

Stop and ask Itaca engineering if the cause is in payments, personal data, permissions, the database structure or infrastructure, or if the fix would change how other parts behave.

Inspired by Matt Pocock's `diagnosing-bugs`. See `../CREDITS.md`.
