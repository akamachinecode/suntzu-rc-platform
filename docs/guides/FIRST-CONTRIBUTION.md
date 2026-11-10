# Your first contribution

From "I'd like to fix that" to a merged pull request, step by step. You need a GitHub account and the project running on your computer ([Run it locally](./RUN-LOCALLY.md)). The rules themselves are in [`CONTRIBUTING.md`](../../CONTRIBUTING.md); this is the walk-through.

## 1. Pick something

- **A first idea:** fix a typo or an out-of-date sentence in these docs, improve an error message, or take an issue labelled `good first issue` if there is one.
- **Something bigger** (a new screen, a new event source, a change to how events are merged): open a thread in [Discussions](https://github.com/akamachinecode/suntzu-rc-platform/discussions) or an issue first, so we agree on the approach before you spend time on it.
- **Found a bug?** Check the [issues](https://github.com/akamachinecode/suntzu-rc-platform/issues) first; if nobody reported it, use the bug report form.

## 2. Get your own copy

Fork the repository on GitHub (the **Fork** button), then clone your fork and create a branch:

```bash
git clone https://github.com/<your-user>/suntzu-rc-platform.git
cd suntzu-rc-platform
git switch -c fix/calendar-link
```

Branch names say what kind of change it is: `fix/…` for a bug, `feat/…` for something new, `docs/…` for documentation.

## 3. Make the change

Before touching code, read [`AGENTS.md`](../../AGENTS.md): it's short, and it decides the questions you'd otherwise have to ask (which stack, where code goes, which libraries). The two that matter most:

- **Business rules and data go in the API** (`apps/api`), **screens in the app** (`apps/app`). The app only reads and writes through the API.
- **No new library without a reason**, written in `docs/DECISIONS.md`.

Keep the change about one thing. If you notice something else on the way, write it down for a separate pull request.

**Docs travel with the code.** If you change how something behaves, update its bit in [`docs/bits/`](../bits/README.md). For a new dependency or a design choice, add an entry to [`docs/DECISIONS.md`](../DECISIONS.md). A change to `docs/` shows up in this portal by itself once merged.

## 4. Check it

```bash
pnpm check
```

It runs exactly what CI will run. Fix what fails (`pnpm format` fixes formatting). Then look at your change in the browser: tests prove a lot, but not everything.

## 5. Commit and push

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): a type, a colon, and what the change does for someone.

```bash
git add -A
git commit -m "fix: the calendar link opens the right month"
git push -u origin fix/calendar-link
```

## 6. Open the pull request

GitHub shows a **Compare & pull request** button after the push. Open it against `main` and fill in the template:

- **What changed**, in one or two plain sentences.
- **How to check it:** the page to open and what to do there.
- The checklist: `pnpm check` passes, no secrets or personal data in the diff.

## 7. What happens next

1. **CI runs** on your pull request (about two minutes): `pnpm check` and a secret scan must pass. Your pull request runs without any of the project's secrets, so it can't touch our servers. If something is red, open the failed job, read the error, fix it and push again to the same branch.
2. **A maintainer is asked to review** automatically. We aim to answer within a week; it's a spare-time project, so a polite nudge after that is welcome.
3. **We may ask for changes.** That's normal and not a judgement on you. Push the fixes to the same branch; the pull request updates by itself.
4. **A maintainer merges it.** Merging to `main` is what reaches the live site ([From code to production](../DELIVERY.md)).

## With an AI agent

The repository is ready for Claude Code, Cursor, GitHub Copilot, Codex and others: they read `AGENTS.md` by themselves, so they already know the stack and the rules. Open the folder in your agent and describe what you want in plain words, for example "the calendar link on an event page opens the wrong month".

The agent will suggest a way of working, as a slash command:

| Command  | When                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------- |
| `/fix`   | Something is broken: it reproduces the problem, finds the cause, makes the smallest fix and proves it |
| `/plan`  | Something new: it asks a few questions and writes a short plan before building                        |
| `/ship`  | The work is done: it runs the checks and opens the pull request                                       |
| `/guide` | You don't know where to start                                                                         |

You're still the author: read the change before you send it, run it yourself, and make sure you can explain it in the pull request. We review pull requests the same way whoever, or whatever, wrote them.
