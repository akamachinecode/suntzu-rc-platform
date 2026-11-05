# Operations

How to run, change and recover this project. Secrets appear here by name only, never their values. Write "Unknown — ask <who>" rather than leaving a gap unexplained.

## Run locally

See the Quick start in [`README.md`](../README.md). Servo also has:

- `pnpm db:seed` — loads the hand-checked events, places, hosts and sources into the local database.
- `pnpm engine [source…]` — runs the events engine once against the real websites (polite: robots.txt, 2 s between requests to the same site). Raw responses go to `ENGINE_SNAPSHOT_DIR` (`.snapshots/`, git-ignored).

## Deploy and roll back

- **Deploy:** merging to `main`; details in [`DEPLOY.md`](./DEPLOY.md). Nothing is deployed yet: the AWS region (C1), name and domain (C3) are still open in [`ROADMAP.md`](./ROADMAP.md).
- **Roll back:** revert the change on `main` (`git revert <commit>` in a pull request) and let the normal deploy run. Never change production by hand.

## Access

| What              | Who has access              | How                                                          |
| ----------------- | --------------------------- | ------------------------------------------------------------ |
| GitHub repository | Unknown — ask the owner     | Organization team                                            |
| AWS account       | The owner (project `servo`) | `aws login --profile servo` (see `DECISIONS.md`, 2026-10-22) |
| Cloudflare zone   | Not created yet             | Account member, Itaca SSO                                    |

## Configuration and secrets

Variable names are listed in the `.env.example` files. Real values live in the hosting provider or SST secrets for production (`BetterAuthSecret`, `OriginVerifyHeader`), and in the team password manager.

## Backups and recovery

| Data                       | Backed up by                                 | Kept for             | Last tested restore |
| -------------------------- | -------------------------------------------- | -------------------- | ------------------- |
| PostgreSQL (events, users) | Amazon RDS automated backups (once deployed) | RDS default (7 days) | never               |
| Engine snapshots           | Local disk now; Amazon S3 once deployed      | until re-fetched     | —                   |

## Keeping dependencies current

Servo's own rule (see `DECISIONS.md`, 2026-10-22): always the latest stable release, once it is at least one day old. Security fixes first: a high or critical advisory gets fixed the day it appears. `pnpm audit` should report nothing; known exceptions are listed with a reason in `pnpm-workspace.yaml`.

## Monitoring

API logs: one JSON line per request with its trace ID, bit, status and duration (stdout locally, CloudWatch once deployed). No alerts yet.

## Known risks

- The engine reads other people's websites. It must stay polite (robots.txt, rate limits, conditional requests) and must never store personal data from calendars or pages (see `DECISIONS.md`, 2026-10-22).
- OpenFreeMap has no SLA; Itaca may want Amazon Location Service before production.
