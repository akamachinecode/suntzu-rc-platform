# Operations

How to run, change and recover this project. Secrets appear here by name only, never their values. Write "Unknown — ask <who>" rather than leaving a gap unexplained.

## Run locally

See the Quick start in [`README.md`](../README.md). SunTzu RC also has:

- `pnpm db:seed` — loads the hand-checked events, places, hosts and sources into the local database.
- `pnpm engine [source…]` — runs the events engine once against the real websites (polite: robots.txt, 2 s between requests to the same site). Raw responses go to `ENGINE_SNAPSHOT_DIR` (`.snapshots/`, git-ignored).
- `pnpm census [dataset…]` — loads the public registers for Florida: FAA recognised areas (`fria`) and recreational fixed sites (`fixed-sites`) into places and clubs, then `airports`, controlled `airspace` and `zip-codes`. About eight requests, one at a time; safe to run again (nothing is added twice). Run `pnpm db:seed` first so the hand-checked places are matched, not duplicated. See [`bits/census.import.md`](./bits/census.import.md).

- `pnpm notify [digest] [report]` — sends change alerts (and, on Thursdays or when named, the weekly digest; on the 1st, organisers' reports) and deletes messages older than 12 months. Locally emails are printed, not sent (`MAIL_TRANSPORT=log`).

## Deploy and roll back

- **Deploy:** merging to `main` deploys production; `staging` from **Actions → Deploy**. Details in [`DEPLOY.md`](./DEPLOY.md). Nothing is deployed yet: going live is the owner's checklist in [`LAUNCH.md`](./LAUNCH.md).
- **Run a job by hand** (`setup`, `engine`, `notify`, `census`): **Actions → Run a task**. Their schedules are in `infra/jobs.tf`.
- **Roll back:** revert the change on `main` (`git revert <commit>` in a pull request) and let the normal deploy run. Never change production by hand.

## Access

| What              | Who has access                                         | How                                                          |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| GitHub repository | Unknown — ask the owner                                | Organization team                                            |
| AWS account       | The owner (project `servo`)                            | `aws login --profile servo` (see `DECISIONS.md`, 2026-10-22) |
| Cloudflare zone   | The owner (`suntzurc.com`, registered with Cloudflare) | Account member, Itaca SSO                                    |

## Configuration and secrets

Variable names are listed in the `.env.example` files. Real values live in AWS Systems Manager Parameter Store for production (`/rc-landing/<stage>/…`, see "Secrets and configuration" in [`DEPLOY.md`](./DEPLOY.md)), and in the team password manager.

## Backups and recovery

| Data                       | Backed up by                                 | Kept for             | Last tested restore |
| -------------------------- | -------------------------------------------- | -------------------- | ------------------- |
| PostgreSQL (events, users) | Amazon RDS automated backups (once deployed) | RDS default (7 days) | never               |
| Engine snapshots           | Local disk now; Amazon S3 once deployed      | until re-fetched     | —                   |

## Keeping dependencies current

SunTzu RC's own rule (see `DECISIONS.md`, 2026-10-22): always the latest stable release, once it is at least one day old. Security fixes first: a high or critical advisory gets fixed the day it appears. `pnpm audit` should report nothing; known exceptions are listed with a reason in `pnpm-workspace.yaml`.

## Monitoring

API logs: one JSON line per request with its trace ID, bit, status and duration (stdout locally, CloudWatch once deployed). No alerts yet.

## Known risks

- The engine reads other people's websites. It must stay polite (robots.txt, rate limits, conditional requests) and must never store personal data from calendars or pages (see `DECISIONS.md`, 2026-10-22).
- OpenFreeMap has no SLA; Itaca may want Amazon Location Service before production.
