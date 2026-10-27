---
name: ship
description: Delivers a finished change - proves it works, opens a clear pull request, follows checks and reviews, fixes the real findings and stops when it's ready for a person to merge. Never merges. Use when the work is done and should be delivered ("ship it", "open a PR", "entrégalo", "súbelo", "ya está listo").
---

# Ship

Deliver the change with proof, and stop before merging. A person approves every merge.

1. **Scope.** Run `git status`. Never work on `main`: use or create a branch (`feat/…`, `fix/…`, `docs/…`). The branch contains only this change; leave unrelated edits alone.
2. **Proof.** Collect evidence you observed yourself in this session for every part of the change:
   - `pnpm check` is green.
   - For behaviour: reproduce the original problem, then show it's gone; or run the app and look at the change (a screenshot when it helps). Passing tests with everything mocked don't prove the experience works.
   - If you can't prove something, say so plainly and ask before going on.
3. **Docs.** Bits touched are updated in `docs/bits/`, the slice is ticked in its spec, new environment variables are in `.env.example`, and decisions are in `docs/DECISIONS.md`.
4. **Pull request.** Title in Conventional Commits that says why it matters ("fix: contact form emails reach sales again"). The description opens with the problem in plain language, then the solution, the proof, risks and links to the spec and bits. Check the title and description for secrets and personal data. Open it with `gh pr create`.
5. **Follow it.** Wait for checks and reviews (`gh pr checks --watch`). Fix real findings, with new proof for each fix. Reply with a reason to findings you dismiss. Keep the change the size the goal needs; list extra ideas as follow-ups instead of adding them.
6. **Stop at ready.** Checks are green, reviews are answered and the branch is up to date with `main`. Never merge, never push to `main`, never bypass branch protection. If the repository has no CI running, say so and list the checks you ran locally.

Report the pull request link, the proof, and anything still open.

Adapted for Itaca from Theo Browne's tstack skills `full-stop`, `file-pr` and `babysit-pr`. See `../CREDITS.md`.
