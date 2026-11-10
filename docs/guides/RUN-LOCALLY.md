# Run it locally

The whole platform (site, API, database, events engine) on your own computer in about ten minutes. You don't need an AWS, Cloudflare or Google account: locally, emails are printed instead of sent and the paid services are simply off.

## What you need

| Tool        | Version | How to get it                                                                                                                              |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Node.js** | 24      | [nodejs.org](https://nodejs.org), or `nvm install 24` (the repository's `.nvmrc` says 24, so `nvm use` picks it)                           |
| **pnpm**    | 12      | `corepack enable pnpm` (comes with Node). Never npm or yarn: the project is pnpm only                                                      |
| **Docker**  | any     | [Docker Desktop](https://www.docker.com/products/docker-desktop/) on macOS and Windows, Docker Engine on Linux. It runs the local database |
| **Git**     | any     | [git-scm.com](https://git-scm.com)                                                                                                         |

On Windows, use WSL 2 (Ubuntu) and run everything inside it.

## Steps

```bash
git clone https://github.com/akamachinecode/suntzu-rc-platform.git
cd suntzu-rc-platform
pnpm install
```

Start the database (PostgreSQL in Docker) and create its tables:

```bash
pnpm db:up && pnpm db:migrate
```

Copy the example settings. They work as they are:

```bash
cp apps/api/.env.example apps/api/.env && cp apps/app/.env.example apps/app/.env
```

Load the data, the same way production starts:

```bash
pnpm db:seed && pnpm census && pnpm engine
```

- `db:seed`: the hand-checked events, places, clubs and the sources the engine reads.
- `census`: the FAA's fields, airports and airspace for Florida, and the Census ZIP codes (about eight downloads from public registers).
- `engine`: reads every active source on the real web, politely (robots.txt, two seconds between requests to the same site). It takes a few minutes.

Start everything:

```bash
pnpm dev
```

| What           | Where                      |
| -------------- | -------------------------- |
| The site       | http://localhost:3000      |
| The API        | http://localhost:3001      |
| The API's docs | http://localhost:3001/docs |
| This portal    | http://localhost:3002      |

## Things to try

- **Sign in** at http://localhost:3000/sign-in with any email. The email isn't sent: the link and the 6-digit code appear in the terminal where `pnpm dev` runs, in the API's output.
- **Open the crew console:** put your email in `CREW_EMAILS` in `apps/api/.env`, restart `pnpm dev`, sign in again and open http://localhost:3000/crew. Events the engine wasn't sure about wait there for a person.
- **Search** with ⌘K or Ctrl+K on any page, and check "Can I fly here?" at http://localhost:3000/places/can-i-fly-here.
- **Send the alerts:** `pnpm notify` prints the change alerts it would email (`pnpm notify digest` for the weekly digest).

## Before a pull request

```bash
pnpm check
```

It runs everything CI runs: formatting, lint, types, tests and a full build. `pnpm format` fixes the formatting by itself. Then follow [Your first contribution](./FIRST-CONTRIBUTION.md).

## When something goes wrong

| What you see                                        | What to do                                                                                                                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:up` fails, or "connection refused" on 5432 | Docker isn't running: start Docker Desktop (or `sudo systemctl start docker`) and try again                                             |
| Port 5432 is already in use                         | Another PostgreSQL is running. Use `DB_PORT=5433 pnpm db:up` and change the port in `DATABASE_URL` in `apps/api/.env`                   |
| Port 3000, 3001 or 3002 is in use                   | Something else is on it: stop it, or run only what you need (`pnpm dev:app`, `pnpm dev:api`, `pnpm dev:docs`)                           |
| `pnpm install` refuses a package version            | The project only installs versions published at least a day ago, on purpose (`pnpm-workspace.yaml`). Wait, or pick the previous version |
| The engine reports errors for some sources          | Normal: a site can be down or block robots. Each source's result is in the report; one failing doesn't stop the others                  |
| The site shows no events                            | Run `pnpm db:seed && pnpm engine` again, and check the API is running on :3001                                                          |
| You want to start over                              | `pnpm db:down`, then `docker volume rm` the `db-data` volume (`docker volume ls` shows its full name), and repeat from `pnpm db:up`     |

Still stuck? Ask in [Discussions](https://github.com/akamachinecode/suntzu-rc-platform/discussions) with what you ran and what you saw.
