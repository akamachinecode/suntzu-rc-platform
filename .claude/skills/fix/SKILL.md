---
name: fix
description: Fixes something that is broken, with proof - reproduce the problem, find the real cause, make the smallest fix and show that it now works. Use when something fails, shows an error, looks wrong or stopped working ("it doesn't work", "error", "bug", "no funciona", "falla", "se rompió").
---

# Fix

Fix the cause, not the symptom, and prove it.

1. **Reproduce it.** Get the exact steps, page, input and what was expected. Run it yourself and capture the error (message, log line, screenshot). If you can't reproduce it, ask focused questions instead of guessing.
2. **Follow the path.** Find the affected bit in `docs/bits/` and follow its path through the code. In logs, follow the request's `x-request-id` (or `cf-ray`) when the project has them.
3. **Name the cause** in one sentence, backed by what you saw: the line, the value, the log. If you can't, keep investigating; don't patch around it.
4. **Lock it in.** When the project has tests, add one that fails because of this bug. Otherwise, write down the reproduction steps so they can be repeated.
5. **Make the smallest fix** that removes the cause. No refactors or unrelated improvements in the same change.
6. **Prove it.** The failing test or the reproduction now passes, and `pnpm check` is green.
7. **Update the docs.** If the bit's behaviour or its known errors changed, update `docs/bits/<id>.md`. If the cause reveals a decision or a risk, add it to `docs/DECISIONS.md`.
8. **Deliver it** with `/ship`.

Stop and ask Itaca engineering if the cause is in payments, personal data, permissions, the database structure or infrastructure, or if the fix would change how other parts behave.

Inspired by Matt Pocock's `diagnosing-bugs`. See `../CREDITS.md`.
