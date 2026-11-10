# Contributing to SunTzu RC

Thanks for wanting to help. SunTzu RC is a free calendar, map and community for RC in Florida, built by three RC enthusiasts in their spare time. We want the hobby to grow, and that works best when the people in it can improve the platform too.

**How fast we reply:** we aim to answer issues, discussions and pull requests within a week. It's a spare-time project, so sometimes it takes longer; a polite nudge after a week is welcome.

## Ways to help

- **Found a bug?** [Open an issue](https://github.com/akamachinecode/suntzu-rc-platform/issues/new/choose) with the bug report form.
- **Have a question or an idea?** Start a thread in [Discussions](https://github.com/akamachinecode/suntzu-rc-platform/discussions). Ideas that get support there become issues.
- **Want to change code or docs?** Read on. For anything bigger than a small fix, open a discussion or issue first, so we can agree on the approach before you spend time on it.
- **Found a security problem?** Don't open an issue: follow [`SECURITY.md`](./SECURITY.md).

Everyone taking part follows the [code of conduct](./CODE_OF_CONDUCT.md).

## Run it on your computer

The short version is below; [Run it locally](./docs/guides/RUN-LOCALLY.md) has every step explained, things to try and fixes for common problems. New to pull requests? [Your first contribution](./docs/guides/FIRST-CONTRIBUTION.md) walks through one.

You need **Node.js 24** (`nvm use` reads `.nvmrc`), **pnpm** (`corepack enable pnpm`) and **Docker** (for the local database). You don't need an AWS, Cloudflare or Google account.

```bash
git clone https://github.com/akamachinecode/suntzu-rc-platform.git
cd suntzu-rc-platform
pnpm install
pnpm db:up && pnpm db:migrate
cp apps/api/.env.example apps/api/.env && cp apps/app/.env.example apps/app/.env
pnpm db:seed && pnpm census && pnpm engine
pnpm dev
```

- `db:seed` loads the hand-checked events, places and sources; `census` the FAA's fields, airports and airspace for Florida; `engine` reads every active source. The first run takes a few minutes.
- Open http://localhost:3000 for the site and http://localhost:3001/docs for the API docs.
- Sign in with any email. Locally, emails aren't sent: the sign-in link and code are printed in the API's console.
- To open the crew console at `/crew`, put your email in `CREW_EMAILS` in `apps/api/.env` and restart.

## How the project is built

- [`AGENTS.md`](./AGENTS.md) is the rulebook, for people and AI agents alike: the stack, where each kind of code goes and the rules every change follows. Read it before your first change.
- The **[docs portal](https://akamachinecode.github.io/suntzu-rc-platform/)** has all of the documentation below as one website with search.
- [`docs/SYSTEM.md`](./docs/SYSTEM.md) is the map of what runs where. [`docs/bits/`](./docs/bits/README.md) lists every piece of behaviour end to end, and [`docs/DECISIONS.md`](./docs/DECISIONS.md) explains why things are the way they are.

The rules that matter most for a pull request:

- TypeScript (strict), React, Tailwind CSS and shadcn/ui. No other frameworks, CSS libraries or package managers.
- **pnpm only.** A new dependency needs a reason, written in `docs/DECISIONS.md`.
- Business rules and data live in the API (`apps/api`), screens in the app (`apps/app`).
- No secrets in code. New environment variables go in `.env.example`, with a comment.
- Accessible by default: semantic HTML, `alt` text, a label for every input, keyboard-friendly controls.
- Where `AGENTS.md` says "ask Itaca engineering", ask in your issue or pull request instead, and the maintainers will decide.

### With an AI agent

The repository is set up for Claude Code, Cursor, GitHub Copilot, Codex and others: they read `AGENTS.md` by themselves. Describe what you want in plain words and the agent will suggest how to go about it (`/plan` for something new, `/fix` for a bug, `/ship` to open the pull request). You're still responsible for what you submit, so read the change before sending it.

## Send a pull request

1. Fork the repository and create a branch: `feat/short-name` for something new, `fix/short-name` for a bug, `docs/short-name` for documentation.
2. Make the change, and update the docs it affects in the same pull request: the bit in `docs/bits/` if behaviour changed, `docs/DECISIONS.md` for a new dependency or design choice.
3. Run **`pnpm check`** (formatting, lint, types, tests and build) and fix what fails. `pnpm format` fixes formatting.
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/): `feat: add a map filter for tracks`, `fix: broken calendar link`.
5. Open the pull request against `main` and fill in the template: what changed and how to check it.

### What happens next

- **CI** runs on your pull request: `pnpm check` and a secret scan must pass before merging, and a dependency audit runs alongside. Pull requests from forks run without any of the project's secrets, so CI never touches our servers.
- A maintainer is asked to review automatically (see `.github/CODEOWNERS`). We may ask for changes; that's normal and not a judgement on you.
- Once approved, a maintainer merges it. Merging to `main` is what deploys to production, so only maintainers merge, and production deploys need the owner's approval.

Changes to `infra/` (Terraform), `.github/` (workflows), sign-in and accounts (`apps/api/src/auth`) or anything that deletes data need a discussion first: they affect the live site, its costs or its members.

## Licence of your contribution

By sending a contribution you agree that it's licensed the same way as the part of the project it changes: code under the [MIT licence](./LICENSE), and the guides and figures under CC BY 4.0 (see "Licence" in the [README](./README.md#licence)). You keep the copyright of your work. Only send work you have the right to share, and credit the sources of anything you didn't write yourself.
