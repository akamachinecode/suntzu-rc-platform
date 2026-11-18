# Review guide

For whoever reviews a pull request here: a person, Claude Code Review or another AI reviewer. Reviewers read this file **from `main`**, never from the pull request under review, so a change can't lower its own bar. Changes to this file go in their own pull request (`.github/CODEOWNERS`).

## What to look for, in this order

1. **Authorization and data ownership.** Every endpoint, Server Action and query checks who is calling and only touches their data. Changing an ID in a request must not reveal or change someone else's data. Identity comes from the session, never from the request body or a hidden field.
2. **Input validation.** Every input is validated on the server (Zod), whatever the browser does.
3. **Secrets and personal data.** None in code, logs, URLs, error messages, test data or the pull request text. New variables are in `.env.example`.
4. **Proof.** The pull request shows the proof from `/verify`: checks, the bits' end-to-end tests, what was seen working. Every new or changed bit has its doc in `docs/bits/` and a test that would fail without the change.
5. **Triggered checks.** The items of `docs/CHECKS.md` whose trigger matches the diff were done.
6. **Weakened checks.** No `.skip`, `.only`, retries, `sleep`, lowered limits or disabled rules; no change to `docs/CHECKS.md`, `REVIEW.md`, `.claude/` or CI mixed into a feature.
7. **The standard.** `AGENTS.md`: the stack, pnpm, TypeScript, shadcn/ui, decisions recorded in `docs/DECISIONS.md`.

Don't comment on formatting or anything `pnpm check` already enforces.

## How to report

- Tag each finding **Important** (must be fixed before merging), **Nit** (optional) or **Pre-existing** (the bug was there before this change: worth a follow-up, not the author's to fix here).
- Say **why** it matters and how to reproduce it (the request, the input, the page), so the author doesn't have to reconstruct it from the diff.
- Review the latest commit. A review of an older commit says nothing about the current one.
