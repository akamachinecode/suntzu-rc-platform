# Decisions log

Every non-trivial decision goes here, newest first: new dependencies, environment variables, external services, data model changes, deviations from the Itaca standard. Itaca engineering reads this file when taking over the project.

Format:

```md
## YYYY-MM-DD — Short title

- **What:** what was decided or added.
- **Why:** the business or technical reason.
- **Impact:** new env vars, services, costs, risks, follow-ups for engineering.
```

## 2026-11-10 — Home performance, step 2: native scrolling, Lenis removed

- **What:** `lenis` (smooth inertial scroll, added 2026-10-20) is gone from every page, by the owner's decision. Measured in Chrome on the home page: with `lerp: 0.1` a wheel step covered 50% of its distance after 115 ms, 90% after **382 ms** and 99% after 734 ms. The page kept moving for most of a second after the hand stopped, and that delay is what reads as "lag" even when every frame is fast. Without it, the browser scrolls on the frame the wheel moves.
- **Kept:** the scroll-linked animations (the hero servo, the drifting section words) read the page's scroll through Motion and work the same; checked in the browser (the servo horn goes from 0° to −175° over the hero). In-page links still glide, with CSS (`scroll-smooth` on `<html>`, off under `prefers-reduced-motion`). `data-scroll-behavior="smooth"` asks Next.js to keep page changes instant (Next.js 16 no longer does it by default).
- **Why:** visitors and the owner noticed lag; Lenis added it to every page, not just the home.
- **Impact:** one dependency less (`lenis`). The scroll-through measurement of the home in a browser without a GPU (34–38 fps) doesn't change, because the 3D dioramas dominate it: they are step 3.

## 2026-11-10 — Home performance, step 1: the guide covers are SVG files

- **What:** the home page was the slowest page of the site, measured on staging (CloudWatch traces, last 24 h): **687 ms median and 3.2 s at the 95th percentile** to render on the server, against 100–130 ms for `/events` or `/search`, and 1.6 MB of HTML. The cause: the three guide covers (the plane, helicopter and truck from each guide, part-way apart) were drawn as 2,768 SVG elements in every request, and Next.js sends a Server Component's output twice (as HTML and again in the React payload): 669 KB of drawing plus about 877 KB of its copy. Now each cover is an SVG file drawn once from the same figure (`apps/app/src/components/home/covers/`), shown with `next/image`. The figure kit's styles go inside each file, taken from `iso.css`, `globals.css` and the theme, so the files look like the page did (compared pixel by pixel in Chrome).
- **Measured locally**, production build with half a CPU like Fargate (method in `OPERATIONS.md`, "Performance"): home HTML **1,627 KB → 147 KB** (gzip 334 → 33 KB), server time **63 → 10 ms** median (`/events`: 6 ms). The three files weigh 27, 39 and 46 KB gzipped, load only when the guides come near the screen (`loading="lazy"`) and are cached for a year (`/_next/static/media/`, `immutable`). Staging and production are measured after the next deploy.
- **New dev dependency:** **`vitest` 5.1.0** in `apps/app` (the Itaca standard for unit tests, the same version as `apps/api`), with `pnpm --filter @workspace/app test` (part of `pnpm check`) and `pnpm --filter @workspace/app covers`, which redraws the files. `covers.test.tsx` fails when a figure changes and its cover wasn't redrawn.
- **Why:** visitors and the owner noticed lag on the home page; it is the first page anyone sees.
- **Impact:** no new variables or services. `ApartPreview` is now `ApartPose` (only the groups of a pose). Still to measure and fix, in order: the 3D dioramas while scrolling (about 37 fps), Lenis's smoothing, caching the page itself, a Cloudflare cache rule for the API's public JSON, and real-user measurements (CloudWatch RUM, for Itaca engineering).

## 2026-11-10 — Cloudflare: deploy token, one DMARC and one SPF record

- **What:**
  - **Deploy token:** account-owned token `suntzu-dns` with **DNS Edit** and **Zone Read** on `suntzurc.com` only, expiring **2027-11-10** (`OPERATIONS.md`, "Access"). It is the `CLOUDFLARE_API_TOKEN` secret of the `production` and `staging` GitHub environments. Checked: it lists the zone and its records and is refused zone settings. The SSL/TLS mode (Full strict) and Bot Fight Mode (off) were set by hand by the owner.
  - **DNS clean-up, by the owner's request:** `suntzurc.com` had two `_dmarc` TXT records (reports to `managed_services@itacatech.com`, and to Cloudflare's DMARC Management) and two SPF records (`v=spf1 ~all` and Google Workspace's). Two of either invalidates both. Now there is one DMARC record with both report addresses and only Google's SPF record.
  - **`infra/`:** `email.dmarc_reports` (optional, per stage) adds `rua=` addresses to the `_dmarc` record Terraform writes. Production lists the same two addresses, so its first deploy writes the same record; the hand-made one must be deleted right before it (`LAUNCH.md`, step 7.0).
- **Why:** deploys need the token for the DNS records (ACM validation, `www`, `api`, the bare domain, SES DKIM and DMARC); the duplicated records already broke SPF for the domain's Google Workspace mail.
- **Impact:**
  - Reports to `managed_services@itacatech.com` are probably dropped: `itacatech.com` doesn't publish `suntzurc.com._report._dmarc.itacatech.com`, which receivers check before sending reports to another domain. Cloudflare's address works.
  - **Open, for the owner:** the zone lives in the **ITACA TECHNOLOGIES** Cloudflare account, while the repository and AWS are the owner's own. Moving it later means re-adding the zone, changing name servers and reissuing certificates; better decided before production.

## 2026-11-10 — AWS: advanced features activated, because the standard can't deploy without them

- **What:** the owner activated **advanced features** on the AWS organization that holds the project account `352587389937` (now called `suntzu-rc`; the "servo" project of 2026-10-22 is this same account). Activation can't be undone. Then, in the management account, the owner edited the organization policy `AdvancedModeRegionRestrictionSecurityControlPolicy` (`p-7yiz7pzn`): `cloudwatch:*` and `sns:*` were added to the `NotAction` list of its `UsEast1Partitional` statement.
- **Why:** checked in the account on 2026-11-10, before activating. An account from AWS's new sign-up experience has fixed organization policies that block two things the Itaca standard needs:
  - **GitHub's OIDC provider:** every `iam:*Provider*` action was denied (even listing), so `infra/bootstrap` couldn't create it and neither Deploy nor "Run a task" could get AWS credentials.
  - **The uptime alarms:** their CloudWatch alarms and SNS topic must be in us-east-1 (Route 53 health check metrics only exist there), where only reading CloudWatch was allowed and SNS wasn't.
  - The alternatives were a new classic AWS account (losing this one's credit) or deploying from a laptop without the uptime alarms (outside the standard).
- **After, checked:** listing OIDC providers works; SNS and CloudWatch answer in us-east-1; everything else is still refused outside us-east-2 (EC2 in us-east-1 and SNS in eu-west-1 were tried). Creating the alarms in us-east-1 is first proven by the first deploy.
- **Impact:**
  - **No spend limit any more** (activation removes it). Production's `alerts.monthly_budget` (150 USD) warns instead; the account had 120 USD of credit before activating.
  - The owner now administers an AWS organization: a management account with a root user, and an "Identity Delegated Admin" account that AWS created. Use the management account only for billing and policies.
  - **CLI profiles** are `suntzu-rc-admin` and `suntzu-rc-read-only` (role `AgentReadOnly`), kept in the owner's private `agent-config` repository; `servo` is gone. The "new AWS experience" rules in `AGENTS.md` were replaced by a short "AWS account" section.
  - **For Itaca engineering (create-itaca):** a project from `create-itaca@0.4.0` with the `terraform` deploy can't be deployed to an AWS account created with AWS's default sign-up until advanced features are active and us-east-1 allows CloudWatch and SNS. The template's docs don't say so.

## 2026-11-09 — The repository is public for now, with everything GitHub gives public repositories

- **What:** the owner made `akamachinecode/suntzu-rc-platform` (renamed from `rc-landing`; GitHub redirects the old name) **public**, probably for a while, and then turned on what GitHub Free offers public repositories:
  - a ruleset on `main` (`docs/GITHUB.md`, step 2): pull requests only, no force-push or deletion, and "Format, lint, typecheck, build" and "Secret scan" must pass;
  - the `production` environment needs the owner's approval and only deploys from `main`; `staging` deploys from any branch, without approval;
  - secret scanning with push protection, Dependabot alerts and security updates, CodeQL default setup, private vulnerability reporting; merged branches are deleted and auto-merge is allowed.
- **Why:** unlimited GitHub Actions minutes and those protections, so the whole stack (CI, deploys, scheduled tasks) can be tested for real. Before publishing, the whole history (82 commits, every branch) was checked: no secrets, only `.env.example` files, and no workflow uses `pull_request_target`; the AWS deploy role only trusts this repository's `production` and `staging` environments, by ID.
- **Impact:** the code and its history are readable by anyone, including the author email of past commits; making it private again doesn't recall forks or clones made meanwhile. No licence: all rights reserved. Making it private again turns off the ruleset and the environment protection on GitHub Free (they need GitHub Pro).

## 2026-11-03 — A sign-in code next to the link, still no passwords (spec 0006)

- **What:** the owner asked whether to add passwords and decided against them; instead, the sign-in email now carries a **6-digit code** next to the link (spec [0006](./specs/0006-sign-in-code.md), approved today, acting as Itaca engineering for accounts):
  - **Why a code:** on a phone the link opens in whatever browser the mail app picks (Gmail's own, for example), so the person stays signed out where they asked. The code is typed on the "Check your email" screen and signs in there.
  - **One email:** the link's email creates the code with Better Auth's `emailOTP` plugin (`createVerificationOTP`, part of `better-auth`: **no new dependency**). Only the latest email's code works; it works once, for 15 minutes like the link, with 3 tries. Stored **hashed**. Not in the subject or the inbox preview (someone who sees a locked phone could use it). After 3 wrong tries, or once expired, the screen offers "Email me a new one".
  - **Closed routes:** the plugin also brings routes to send a code without a link, verify an email, reset a password and change an email; they answer 404 (`disabledPaths` in `apps/api/src/auth/auth.ts`). Only `POST /auth/sign-in/email-otp` is open (Better Auth limits it to 3 requests a minute).
  - **Emails** can now have a preview text and a code block (`renderEmail` in `apps/api/src/mail/mail.ts`).
  - **Header:** the longer wordmark ("suntzu rc") wrapped between 768 and 1280 px; it now stays on one line, and "My SunTzu RC" shows as an icon below 1280 px (its name stays for screen readers).
- **Kept out:** passwords (owner, 2026-11-03); passkeys, for when members come back often; Sign in with Apple, only if many members use iPhones (a paid Apple developer account).
- **Why:** the sign-in has to work on phones, where most people will check this weekend's events.
- **Impact:** no new variables, tables or services. The Cloudflare rate-limit rule for `POST /auth/sign-in/magic-link` (`LAUNCH.md`, step 3) should also cover `POST /auth/sign-in/email-otp`. The pre-launch review of `apps/api/src/auth/` should include it.

## 2026-11-03 — The name is SunTzu RC, at suntzurc.com (C3), and it is the example project for 0.3.1

- **What:** the owner chose the name **SunTzu RC** and the domain **suntzurc.com**, replacing the working name "Servo", and asked to keep the project as the example of `create-itaca@0.3.1`.
  - **Written "SunTzu RC"** on the site, in emails, calendars and share images (the owner asked for a recommendation: it reads at once, "RC" says what it's about, and lowercased without the space it is the domain). The wordmark is lowercase like the decal it was ("suntzu rc"); the footer's big sign-off is smaller so the longer word fits. Change the name in `SITE.name` (`apps/app/src/lib/site.ts`), the wordmark and `email.from` in the `infra/*.tfvars.json` files.
  - **Domain:** `www.suntzurc.com` (the site; `suntzurc.com` redirects there), `api.suntzurc.com`, staging on `www-staging.` / `api-staging.` and email from `hello@suntzurc.com` (staging from `hello@staging.suntzurc.com`). The domain is registered with Cloudflare Registrar (since 2025-04-05, Cloudflare name servers), so the zone exists.
  - **The engine's user agent** is now `SunTzuRCBot/0.1 (+https://www.suntzurc.com/contact)`, pointing site owners at the contact page instead of the private repository.
  - **Kept:** "servo" where it means the part (the figures, the signal bench on the home page, "servo saver"); the internal CSS class `servo-figure`; the AWS CLI profile and project `servo` (the AWS project's real name); the AWS resource prefix `rc-landing` (the repository's name, 2026-10-29); this log's earlier entries, which keep the name they were written with; and `example.com` in tests, where it stands for any address.
  - **Example project:** `itaca.json` says `exampleOf`, and the README has a section on what to look at when using SunTzu RC as the model for a `platform` project.
- **Why:** the owner's decision (C3 in `ROADMAP.md`); the last naming step before going live.
- **Impact:** nothing deployed. If the repository is renamed (for example to `suntzurc`), the resource prefix in `infra/stage.tf` and `infra/bootstrap/main.tf`, the SSM paths and the OIDC subject change with it: do it before the first deploy.

## 2026-11-03 — Refreshed to the Itaca standard `create-itaca@0.3.1`

- **What:** the owner published `create-itaca@0.3.1` (tag `bea546a` of `itaca-stacks`, 2026-11-03), a version refresh on top of 0.3.0. Servo takes all of it:
  - **Terraform 1.17.0** in `deploy.yml`, `infra.yml` and `task.yml`; **AWS provider 6.70.0** in `infra/` and `infra/bootstrap/`, with the template's regenerated `.terraform.lock.hcl` files (same providers: AWS, Cloudflare 5.28.1, random 3.9.1).
  - **Dependencies at their latest stable release**, all older than a day: NestJS 12.3.2 (and `@nestjs/swagger` 12.1.0), Better Auth 1.7.15, Next.js and `eslint-config-next` 16.4.4, AWS SDK 3.1161.0, shadcn 4.23.0, Vitest 5.1.0, ESLint 10.14.0, and patch or minor updates of `cn`, `lucide-react`, `maplibre-gl`, `motion`, `three`, `globals` and `typescript-eslint`.
  - **`multer` override removed:** `@nestjs/platform-express` 12.3.2 depends on `multer` 2.5.0 itself.
  - **GHSA-g3hv-75wg-m249 accepted** (moderate, `minimatch` < 11.0.1) in `pnpm-workspace.yaml` (`audit.ignore`), as in the template: only tooling pulls it in and the fix exists only in `minimatch` 11, which those tools don't support.
- **Kept on purpose:** **TypeScript 5.9.3** (7.0 is out, and Dependabot proposes 6.0, but the template and `typescript-eslint` stay on 5.9) and **`@types/node` 24**, which matches the Node 24 runtime (`.nvmrc`, the Dockerfiles); `pnpm update --latest` proposes 26.
- **Why:** staying on the standard; the project is also the example for 0.3.1 (see the entry above).
- **Impact:** `pnpm audit` reports one low advisory with no fix yet (GHSA-gcqx-w48m-w2h4, `deepmerge`, only inside the shadcn CLI); CI's audit (`--prod --audit-level high`) passes. Nothing deployed.

## 2026-10-29 — The repository lives in the owner's personal GitHub account

- **What:** the code is on GitHub at **`akamachinecode/rc-landing`** (private), the owner's personal account, instead of `ITACA-TECHNOLOGIES/rc-landing`. Every reference moved with it: `itaca.json`, `AGENTS.md`, the GitHub, OIDC, deploy, Terraform and launch docs, the engine's user agent (`ServoBot/0.1 (+https://github.com/akamachinecode/rc-landing)`) and the seeded crew source's link.
- **Why:** the owner's choice.
- **Impact / risks, for Itaca engineering:**
  - The account is on **GitHub Free** (checked 2026-10-29: the rulesets and branch protection APIs answer "Upgrade to GitHub Pro or make this repository public"). On a private repository that means **no protected `main`** and **no environments** (`production`, `staging`) with their own variables, secrets or required reviewers, which the deploy workflows and `LAUNCH.md` rely on. Pending the owner's call: GitHub Pro, a public repository, or workflows adapted to repository-level settings.
  - The deploy role's OIDC subject uses the user's ID instead of an organisation's (`AWS-GITHUB-OIDC.md`, step 2).
  - Moving it to the Itaca organisation later is a transfer (Settings → Transfer ownership): the OIDC subject changes and `infra/bootstrap` must be applied again with the new one.

## 2026-10-29 — Migrated to the Itaca standard `create-itaca@0.3.0`: SST → Terraform

- **What:** Servo takes `create-itaca@0.3.0` (published 2026-10-28), whose change is the deploy target: **Terraform replaces SST** as the Itaca standard for infrastructure (SST's upstream activity dropped in 2026). The reference was a fresh `platform` project generated with 0.3.0 (tag `v0.3.0` of `itaca-stacks`, commit `d15486b`); everything in it that applies to Servo was taken, and `sst.config.ts` was rewritten in Terraform piece by piece:
  - **From the template, unchanged:** `infra/` core (`versions.tf`, `stage.tf`, `origin-lock.tf`, the lock files, `bootstrap/` with the OIDC deploy role, the ECR registries and the state bucket), the `zone`, `network`, `load-balancer`, `service` and `database` modules, `.github/workflows/infra.yml`, `apps/app/Dockerfile`, Dependabot for Terraform, `docs/TERRAFORM.md`, and the small edits to `.gitignore`, `.dockerignore`, `.prettierignore`, ESLint, `tsconfig.json`, `next.config.ts`, `compose.yaml` and the `.env.example` files.
  - **Servo's own, ported from `sst.config.ts`:** the scheduled jobs (`infra/jobs.tf` and a new `modules/task`: EventBridge Scheduler starts the API's image on Fargate, same commands and Florida times; `setup` has no schedule), SES with DKIM and DMARC in Cloudflare (`email.tf`), the snapshots bucket (`storage.tf`), the code's permissions (`permissions.tf`: snapshots, SES, Bedrock) and the optional secrets (`secrets.tf`).
  - **Workflows:** `deploy.yml` builds both images, applies Terraform and checks the new version is running; production on merge to `main`, `staging` from the Actions tab. New `task.yml` (**Actions → Run a task**) runs `setup`, `engine`, `notify` or `census` by hand and waits for the result: it replaces running `Setup` from the SST console.
  - Removed: `sst.config.ts`, the `sst` dev dependency and the `deploy:*` scripts. `itaca.json` says `"deploy": "terraform"`.
- **Why:** staying on the standard (the owner asked to migrate everything to 0.3.0, acting as Itaca engineering, 2026-10-29). Nothing had been deployed with SST, so there was nothing to move: no state, no data.
- **Deviations from the template, on purpose:**
  - **No `apps/web` and no CloudFront:** Servo's public site is `apps/app` on `www` (2026-10-21), so `hosts` has `app` and `api` only, and the bare domain redirects to `www` with a load balancer rule. The `aws.us_east_1` provider is gone: every resource is in us-east-2, which also settles the open question about CloudFront certificates in us-east-1 (2026-10-28).
  - **PostgreSQL 18**, as with SST and locally (`compose.yaml`): the database module takes `engine_version` (default `"17"`, the template's).
  - **Resource prefix `rc-landing`** (the repository's name, as with SST and the deploy role), not the brand: the brand may still change (C3).
  - **Optional secrets** only reach the containers once their parameter exists (`aws_ssm_parameters_by_path`), because SSM parameters can't be empty: the same "off until set" behaviour as SST's empty secrets. The two public values (Turnstile's site key, and whether Google sign-in is on) are read by the deploy workflow from the same parameters.
  - **One SES identity per stage** (production `example.com`, staging `staging.example.com`): an identity belongs to the AWS account, so sharing one would tie staging to production's deploy order.
  - **Network:** the template's public subnets with public IPs and no NAT, instead of SST's NAT instance; containers and jobs accept no connections except the load balancer's.
  - **Bedrock:** the code's policy adds `bedrock-mantle:CreateInference` on the account's Mantle projects, the action AWS documents for inference through the Mantle endpoint that `@anthropic-ai/bedrock-sdk` calls (this settles the open point of 2026-10-28), and keeps `bedrock:InvokeModel*`.
  - **Job sizes:** 0.5 vCPU and 1 GB for every job (SST's default was 0.25 vCPU and 0.5 GB), because the census reads the FAA registers in memory.
- **Impact / risks, for Itaca engineering:**
  - Verified without AWS: `terraform fmt` and `terraform validate` (Terraform 1.16.6, the CI version) on `infra/` and `infra/bootstrap/`; a `terraform test` plan with mocked providers in both workspaces (production creates the redirect; each stage gets its own SES identity, DKIM and DMARC records; only the optional secrets that exist under the stage's own path are wired in; four jobs); both Docker images built and run against PostgreSQL 18 (migrations at start, seed, notify, every public page, an event's share image and calendar). The first real `terraform plan` happens in the first Deploy run on `staging` (`docs/LAUNCH.md`).
  - Deploy order: the Deploy workflow must be on `main` to run from the Actions tab, so `LAUNCH.md` now asks for required reviewers on `production` before merging; the production run started by the merge waits until `staging` works.
  - Cost: the fixed floor per stage is the load balancer, RDS and two always-on containers (roughly 75 USD a month), plus the jobs by use; no NAT instance and no Lambda or CloudFront any more.
  - Secrets moved from SST secrets to SSM Parameter Store (`/rc-landing/<stage>/…`); `BetterAuthSecret` is now generated by Terraform. `CLOUDFLARE_ACCOUNT_ID` is no longer needed in GitHub.
  - Not taken from 0.3.0: nothing else in it applies (the EC2 target and the static-site module are for other stacks).

## 2026-10-29 — Search's screens and "searched, not found" (spec 0005, slices 2–4)

- **What:** the owner asked to finish search so that Servo 1.0 ships with it. Built: the results page `/search` (`noindex`, works without JavaScript), the search box on every page (⌘K, Ctrl+K, `/`, the header and the mobile menu) and the crew's "Searched, not found" list. Decisions along the way:
  - **No new dependency.** The box is the shadcn/ui Dialog (added to `packages/ui`, built on `radix-ui`, which we already had) with our own combobox (arrows, Enter, screen-reader announcements), not `cmdk`: Enter must open the results page when no result is chosen, and `cmdk` always chooses the first one.
  - **The box asks the API from the browser** (`browserApi` in `apps/app/src/lib/search.ts`): public data, no cookies, cached 5 minutes like the pages. The API already allows the site's origin (CORS).
  - **"Little" means partial.** The API now says `partial` when no result has every word ("qwxzv hovertank" found four loose matches before). Those searches, and the ones that found nothing, are what the crew sees; a search with one or two exact results is a success and isn't counted. The browser reports them (`POST /search/misses`, public, no Turnstile: there's no form) and the API searches again, so only searches that really fail are counted. Words that look like an email, a phone number or a street address are dropped. Counts are deleted after 90 days by the existing scheduled clean-up (`pnpm notify`), so there's no new job. New table `search_misses` (migration 0009).
  - **A town or ZIP keeps to its radius.** Slice 1 listed matches from anywhere before what was near ("car track near Hialeah" showed tracks 86 miles away under "within 25 miles"). Now events, places and clubs must be within the radius and come closest first; guides and rules, which hold anywhere, keep their place.
  - **Shortcuts:** "Near me" opens `/places?near=me` (located in the browser, as before) and "Can I fly here?" for a town opens `/places/can-i-fly-here?at=lat,lng`.
- **Why:** search is the front door for people who arrive with one thing in mind; the crew learns from what it misses.
- **Impact:** no new services, costs or environment variables. Suggested Cloudflare rule: `POST /search/misses` at 20 per minute per IP (`LAUNCH.md`, step 3). Itaca engineering should look at the new public `POST` endpoint and the shadcn Dialog in the launch review.

## 2026-10-28 — Search across the whole site runs in PostgreSQL (spec 0005)

- **What:** the owner approved [spec 0005](./specs/0005-search.md): one search box for events, places, clubs, guides, rules and services, with towns and ZIP codes ("near Tampa", "33441"), typos, half-typed words and common Spanish words. Decisions:
  - **Engine: PostgreSQL**, the database we already run, with the standard extensions `pg_trgm` (typos), `unaccent` (accents), `fuzzystrmatch` (closest spelling), `cube` and `earthdistance` (distance). A comparison on 2026-10-28 ran the same 369 documents and 36 searches on PostgreSQL and Typesense 30.2: tuned, PostgreSQL put the right answer first 32 times and Typesense 31, both in about 3 ms; out of the box Typesense led 24 to 15. Typesense would add a service to host, a bill and a sync that can fall behind the pages; PostgreSQL keeps the index in step with the data inside the database. Its known weakness is ranking a rare word above a common one (fields at "High" schools before the 400 ft rule), covered by pinned answers. Revisit when the index passes about 100,000 documents or that weakness shows in real searches; all search code lives in `apps/api/src/search/` so the engine can change without touching the screens.
  - **One search document shape** (`search_documents`): type, title, subtitle, text, link, place, dates and weight. Triggers on `events`, `places` and `hosts` keep it current; guides, rules and services are written to it when the API starts. A new kind of content (RC models, builds) adds its own documents and nothing else changes.
  - **Guides, rules and services move to `packages/shared`** so the API can index them and a mobile app can show them; rules get a stable `id` so pinned answers survive a change of title.
  - **Query understanding** in code, not in the database: Florida towns and ZIP codes, "events"/"clubs"/"fields" as a type, Spanish words, synonyms ("heli", "1/8" → "8th") and pinned answers ("lessons" → the Lessons service). RDS doesn't allow synonym files, and code keeps them reviewed in git.
  - **Privacy:** searches without results are counted per day with the words and the number of results only, never the account, IP address or location, and deleted after 90 days (slice 4). Request logs already record only the route.
  - **The golden searches** are a test; it needs the local database and skips without one.
- **Why:** someone who lands on Servo should find the event, field, club or rule they mean from the front door, and search must never disagree with the pages.
- **Impact:** no new dependencies, services or environment variables. A migration creates the extensions (allowed for the RDS master user). Itaca may want a Cloudflare rate-limit rule on `api/search` at launch (open question in the spec).

## 2026-10-28 — Fixes from an independent security and bug review

- **What:** an independent review of the night's work found these, all fixed and tested:
  - **Club claims:** a new code at most every 5 minutes, and 8 guesses per claim ever (counted atomically before each check, compared in constant time); after that only the crew can verify it. Before, the 6-digit code could be guessed with unlimited retries.
  - **Crew:** decided from `CREW_EMAILS` on every request, so removing someone takes effect on their open sessions too.
  - **Links people give us:** IPv6 spellings of internal addresses (`[::ffff:7f00:1]`, NAT64) are refused, and answers are cut at 2 MB.
  - **Limits:** 10 submitted events and 20 corrections per member an hour. Turnstile refuses public forms in production when its key is missing, and no longer sends the server's address as the visitor's. `LAUNCH.md` rate-limits the site's host, where visitors connect.
  - **Emails:** a failed send no longer loses the email (the record is removed and the next run retries it) and no longer stops the run; each `notify` step runs on its own.
  - **Try it:** a club counts as reached only when an email to one of its organisers was sent; otherwise the crew gets the request.
  - **Dates:** a correction that moves only the first day keeps the event's length, and no change can leave an event ending before it starts (which made future events "held").
  - **Engine:** events with the same name at two different clubs or fields are a question for the crew, never merged on the name alone; a member's link (community trust) never changes or publishes an event without the crew.
  - **Small ones:** account deletion says so when it fails; long model names in "share your build" no longer fail; a submitted site's robots.txt is read afresh each time.
- **Known gap:** DNS could change between the address check and the request (rebinding). Pinning the checked address needs a custom HTTP agent; worth doing before traffic grows.

## 2026-10-28 — Links people give us only reach the public internet

- **What:** member-submitted event links and organisers' club websites are fetched through `publicFetch` (`apps/api/src/common/public-url.ts`): http(s) on ports 80/443 only, no credentials in the URL, every address the host resolves to must be public (no loopback, private, link-local or cloud-metadata ranges, IPv4 or IPv6), and every redirect is checked again before it's followed.
- **Why:** these requests run inside the VPC next to the ECS metadata endpoint and the database; without the check a link could reach them (SSRF).
- **Impact:** the engine's own sources (set by the crew) still use plain fetch. Known gap: DNS could change between the check and the request (rebinding); acceptable for v1, worth a resolving agent that pins the checked address later.

## 2026-10-28 — Launch in code: us-east-2, SES, S3, scheduled jobs and the owner's checklist (spec 0004)

- **What:**
  - **Region (C1):** `sst.config.ts`, `itaca.json` and the deploy workflow move to **us-east-2**, the AWS project's only region. The domain is one constant (`DOMAIN`) at the top of `sst.config.ts`.
  - **Email:** `sst.aws.Email` sends from the domain through SES, with DKIM and DMARC records in Cloudflare (DNS only). The API and the jobs get `MAIL_TRANSPORT=ses`.
  - **Engine snapshots** go to an S3 bucket (`ENGINE_SNAPSHOT_DIR=s3://…`; new dependency **`@aws-sdk/client-s3` 3.1157.0**, the Itaca standard for S3): the container's disk isn't writable, and the engine re-reads snapshots when a source answers "not modified".
  - **Scheduled jobs** (SST `CronV2` running the API image as Fargate tasks, times in Florida): the engine four times a day, `notify` every hour, the census on the 2nd of each month, and a `Setup` task (seed, census, first read) to run once per stage.
  - **Secrets** (optional ones default to empty, and their feature stays off): `CrewEmails`, `CrewInbox`, `GoogleClientId`, `GoogleClientSecret`, `TurnstileSecretKey`, `TurnstileSiteKey`. Bedrock invoke permissions for the AI extraction.
  - `docs/LAUNCH.md`: the owner's ordered checklist (GitHub, name and domain, Cloudflare with Turnstile and rate-limiting rules, AWS with SES production access and Bedrock model access, secrets, `dev`, production).
- **Why:** spec 0004; the owner approved the region, the jobs, S3, SES and Bedrock (acting as Itaca engineering, 2026-10-27).
- **Impact / risks, for Itaca engineering:**
  - Nothing was deployed. `sst.config.ts` type-checks against SST's platform types (`pnpm sst install`, then `tsc` on the file: the only errors are inside SST's own sources), but `pnpm sst diff --stage dev` is the real first check.
  - CloudFront's certificate lives in us-east-1; whether the AWS project allows it is the first thing to check on `dev` (fallback in `LAUNCH.md`).
  - The Bedrock IAM actions (`bedrock:InvokeModel*`) may need adjusting for the Mantle endpoint.

## 2026-10-27 — Members send events, and AI reads pasted flyers with quotes (spec 0003-3)

- **What:** `/submit` (members): a link is read like any source (politely, robots.txt respected: ICS, JSON-LD, then the AI on the page's text); pasted text (a flyer, a Facebook post) is read by Claude on Amazon Bedrock. The model must quote the text for every field; `verify()` drops any field whose quote isn't in the text word for word, and any event without a quoted name and first day. Results go through resolve with community trust (they wait for the crew, credited to the member), or link to an event we already have. When nothing can be read, the text reaches the crew's inbox.
- **Why:** principle 2 and 3 in `LANDSCAPE.md`: Facebook-only events reach Servo through people, and trust stays visible (the exact words are in the crew's review).
- **Impact:**
  - New dependencies **`@anthropic-ai/sdk` 1.3.0** (structured outputs with Zod, the refusal-fallback middleware) and **`@anthropic-ai/bedrock-sdk` 1.1.0** (the Bedrock Mantle client: Messages API on Bedrock, AWS credentials from the environment) in `apps/api`.
  - Model `claude-opus-5-5` on Bedrock (`BEDROCK_MODEL_ID=anthropic.claude-opus-5-5`) at `low` effort, with a client-side fallback to `anthropic.claude-opus-4-8` if a request is declined (`BEDROCK_FALLBACK_MODEL_ID`). Off until `BEDROCK_MODEL_ID` is set; model access must be turned on in the Bedrock console of the project's region, and the API's task role needs `bedrock:InvokeModel` (spec 0004).
  - What the model sees is only the pasted text and today's date; it is told never to return people's names, phones or emails. Not verified against Bedrock tonight: no AWS calls were made.

## 2026-10-27 — Emails Servo sends on its own, and "try it" (specs 0003-5, 0003-6)

- **What:** `pnpm notify` sends change alerts (a followed or "going" event moved or was cancelled), the weekly "this weekend near you" (Thursdays), and organisers' monthly reports (the 1st), and deletes messages and try-it requests older than 12 months. Every email is recorded in `notifications` before it's sent, so runs can repeat without duplicates. Each email has a one-click unsubscribe (`POST /unsubscribe`, RFC 8058); the link in the email opens `/unsubscribe`, which acts only when the button is pressed (mail scanners open links). `/try` sends a newcomer's request to the organisers of up to three nearby clubs that welcome newcomers, with the person's consent, or to the crew.
- **Why:** spec 0003 slices 5 and 6; principles 5 and 8 in `LANDSCAPE.md`.
- **Impact:** new column `members.monthly_report` (migration `0005_monthly_report`). Scheduling `pnpm notify` (hourly) and `pnpm engine` needs SST Cron (spec 0004). Production sending needs SES out of the sandbox and a verified domain (`docs/LAUNCH.md`).

## 2026-10-27 — Places, clubs, "Can I fly here?" and the organiser kit (specs 0002-2, 0002-3, 0003-4)

- **What:**
  - `/places` (every field and track on a map, with search and near me), a page per place (how to visit, who runs it, upcoming events, the rules, the source and last-checked date), `/clubs` and a page per club with its own calendar feed. "Places" is in the main navigation.
  - `/places/can-i-fly-here`: a point is checked against the FAA's airspace, airports and FRIAs (`GET /airspace/check`). It's guidance with links to B4UFLY and LAANC, never an authorisation; temporary flight restrictions aren't included yet. The point isn't stored or logged.
  - Organisers claim a club by a code sent to an address at the club's own domain (never a shared domain such as Facebook, Wix or Gmail), a code on its website, or the crew's check. Verified organisers publish and change their club's events (published at once, with organiser trust), confirm their places' details yearly and get an embeddable widget (`/embed/clubs/<slug>`).
- **Why:** specs 0002 and 0003; principle 2 in `LANDSCAPE.md` (organisers get something back).
- **Impact:**
  - `next.config.ts`: `X-Frame-Options: DENY` now applies to every path except `/embed`, which other sites frame on purpose. `Permissions-Policy` allows geolocation for the site itself (`geolocation=(self)`): before, it blocked "Near me" on every page.
  - A duplicate club from the census ("SRQ R/C Squadron", AMA 780) was merged into the seeded "Sarasota R/C Squadron", which now carries the number and the alias.
  - Website verification fetches the club's home page and `/servo.txt` once, when the organiser asks.

## 2026-10-27 — The crew console, and every form reaches the crew (specs 0001-2, 0003-3)

- **What:** `/crew` (crew role only): the review queue with each source's exact words next to what we publish, and decisions to publish, correct, merge or reject; "Add an event" by hand (published at once, backed by a `servo-crew` sighting so the engine links to it later); the inbox (contact form and builds) and the feedback from past events. Events the crew rejects keep `rejected_at` and are never published automatically again; "different events" tells resolve never to match that pair. Public forms (`POST /messages`, `POST /events/{slug}/feedback`) check a Cloudflare Turnstile token when `TURNSTILE_SECRET_KEY` is set (production) and the app shows the widget when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set. Members can suggest corrections (`POST /events/{slug}/corrections`), which wait for the crew.
- **Why:** spec 0001 slice 2 and spec 0003 slice 3. The contact and build forms were the last pieces that went nowhere.
- **Impact:** new table column `events.rejected_at` (migration `0004_event_rejected`); messages keep a name and an email for 12 months (purged by `pnpm notify`, spec 0003-6). New variables `TURNSTILE_SECRET_KEY` (API) and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (app); Turnstile is free and part of the standard (`CLOUDFLARE.md`).

## 2026-10-27 — Accounts without passwords, the crew role, follows and a private calendar (specs 0003-1, 0003-2)

- **What:**
  - **Sign-in:** a one-time link by email (Better Auth magic-link plugin, 15 minutes, works once) or Google (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`; the app shows the button when `NEXT_PUBLIC_GOOGLE_SIGN_IN=true`). Email and password sign-in is turned off.
  - **Roles:** a `role` column on `user` (`member` or `crew`), a Better Auth additional field that requests can't set. The crew is whoever `CREW_EMAILS` lists, synced at every sign-in, so adding or removing someone is a configuration change. `@CrewOnly()` guards crew routes.
  - **Members:** `/me` (name, optional ZIP, distance, disciplines, change alerts, weekly digest, delete account), follows (events, clubs, places, disciplines), "I'm going", and a private calendar feed at `/calendar/<secret>.ics`. Only counts are public.
  - **Email:** `apps/api/src/mail/mail.ts` sends through Amazon SES (`MAIL_TRANSPORT=ses`) or prints to the console locally (`log`). New dependency **`@aws-sdk/client-sesv2` 3.1157.0** (the Itaca standard for email). New variables: `MAIL_TRANSPORT`, `MAIL_FROM`, `AWS_REGION`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CREW_EMAILS`, `CREW_INBOX` (API) and `NEXT_PUBLIC_GOOGLE_SIGN_IN` (app).
  - **Data model** (migration `0003_community`): `members`, `follows`, `rsvps`, `host_members`, `messages`, `submissions`, `try_requests`, `feedback`, `notifications`; `events.beginner_friendly`; `reviews.submitted_by`.
- **Why:** spec 0003, with the owner's choices (no passwords; nothing about a member public by default). Approved by the owner acting as Itaca engineering (accounts, personal data, roles, email).
- **Impact:** personal data now lives in Servo: email, optional name and ZIP, follows and "going". Deleting an account removes all of it (cascades); contributions to the public catalogue stay without the name. For production: verify the sender domain in SES and request production access (`docs/LAUNCH.md`), create the Google OAuth client, set `CREW_EMAILS`. An Itaca review of `apps/api/src/auth/` before launch is still recommended.

## 2026-10-27 — More readers: club platforms and single sites (spec 0001, slice 5)

- **What:**
  - **Three new readers** in `apps/api/src/events/engine/`, picked by a new `platform` field in `sources.config`: **The Events Calendar** (`the-events-calendar.ts`: the WordPress plugin's public REST API, `/wp-json/tribe/events/v1/events`, page after page), **Wild Apricot** (`wild-apricot.ts`: each site's `/events/RSS`) and **schedule tables** (`schedule-table.ts`: date, name and town under a year heading, as on Extreme Flight's schedule). A new `onlyPlaces` setting keeps only the rows of a region (Extreme Flight lists the whole US).
  - **Configuration, not code, where the platform already publishes data:** RCSignup's state pages list their races as schema.org `ItemList` data, so the JSON-LD reader now looks inside event lists and RCSignup is a `json-ld` source. Wix (AMPS) was already one.
  - **The fetcher reports bot walls** (DualRates' region block, SiteGround's captcha, Cloudflare's challenge) instead of reading them as the page. A wall served in place of robots.txt means nothing on that site is read. robots.txt's `Request-rate` is now obeyed like `Crawl-delay` (Wild Apricot asks for one request a minute).
  - `engine.ts`, the database schema and the web app are unchanged.
- **Second census sample (2026-10-27):** 39 Florida club and track sites (a public list of Florida flying fields, two ROAR tracks and the sites already known), each probed once through the engine's own fetcher. 5 run **DualRates**, all region-blocked; 1 runs **WordPress with The Events Calendar** (Imperial R/C Club); 1 **Wild Apricot** (RCACF); 2 **Wix** (AMPS; SPARKS R/C has no events page); 3 embed a **Google Calendar** (DeLand, Eglin, Coral Springs); 5 run **WordPress without an events plugin**; 8 are other builders or hand-made pages (GoDaddy, Weebly, Homestead) with no machine-readable events; 9 say no in robots.txt or don't answer it; 2 sit behind a captcha or answer 403; 3 are gone or parked. Nobody in the sample runs **Modern Events Calendar**: its event pages publish schema.org data and an iCal feed, so such a club would be a `json-ld` or `ics` source with no new code (untested).
- **What each site's robots.txt and terms said** (also in each source's `permission`):

  | Source                                                                                                                         | Status    | robots.txt                                              | Terms                                                                                                                    |
  | ------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
  | `rcsignup` (Florida races)                                                                                                     | active    | allows `/rc-races/`; Crawl-delay 10; `/api/` disallowed | none published                                                                                                           |
  | `extreme-flight-schedule`                                                                                                      | active    | allows `/pages/` (Shopify)                              | forbid scraping only "in violation of applicable law"; protect their own text and images. We keep facts and a link       |
  | `imperial-rc-events` (Imperial R/C Club)                                                                                       | active    | allows `/wp-json/`                                      | none linked from the site                                                                                                |
  | `rcacf-events` (RCACF)                                                                                                         | active    | allows `/events/`; Request-rate 1/60, Crawl-delay 10    | none; a privacy page only                                                                                                |
  | 5 DualRates club sites (Palm Beach RC, Martin County Modelers, Sarasota R/C Squadron, Sarasota Silent Flyers, Triple Creek RC) | candidate | unreadable: region block                                | unreadable                                                                                                               |
  | `eglin-aero-modelers-calendar`                                                                                                 | candidate | Google Calendar's robots.txt disallows feeds            | needs the club's OK, as DeLand                                                                                           |
  | `roar-nationals`                                                                                                               | candidate | allows all but `/join`                                  | privacy policy only. Not worth a reader: no dates, hosts listed with personal contacts; ROAR races come through RCSignup |
  | `horizon-hobby-calendar`                                                                                                       | blocked   | allows the page                                         | site for personal, non-commercial use; no re-publication without written permission                                      |
  | `multigp-races`                                                                                                                | blocked   | disallows `/mgp/`, where races and chapters load from   | (page body empty)                                                                                                        |

- **First live run (2026-10-27):** RCSignup 10 Florida races (Nov 2026 to May 2027), Extreme Flight 3 Florida events (3D Over the Glades, the SPARKS 3D Fun Fly and Jacksonville Jet Madness, all 2026 editions: history for their series), Imperial R/C Club and RCACF 0 (their upcoming entries are only meetings and work parties, skipped; Imperial's 2026 events, the Florida eJets and the Frank Tiano Scale Fly-In among them, are in the test fixture). The DualRates candidate stops at the wall with one request.
- **Why:** more of Florida's events reach the engine as sightings, each through the cheapest reliable channel, and only where robots.txt and the terms say yes.
- **Impact:**
  - **No new dependency.** RSS, a known HTML table and JSON are read with regular expressions and `JSON.parse`; an HTML parser wasn't needed.
  - **No personal data:** these readers never read descriptions or organisers (Imperial's descriptions name contest directors with their emails; RCACF's notes speak to members). Fixtures (`imperial-rc-events.json`, `rcacf-events.rss`, `extreme-flight-schedule.html`, `rcsignup-florida.html`) are trimmed copies with those fields emptied. The pages downloaded during the census were deleted afterwards.
  - **DualRates needs a run from the US or a word with DualRates** (roadmap D6): from the dev machine in Europe every DualRates page, robots.txt included, is a region block, so no DualRates reader could be written or tested. Its five Florida clubs are candidates with `platform: "dualrates"`; once a page can be seen, they are likely `json-ld` or `ics` sources (DISCOVERY.md saw schema.org events and iCal on them).
  - **Horizon Hobby and MultiGP need permission** (roadmap D6). Horizon's calendar is a JSON block in the page (about 230 entries), a short reader once allowed.
  - RCACF's one request a minute makes its run take a minute; fine for a weekly source.
  - Follow-up, not done: a one-off read of past editions (The Events Calendar's API takes a `start_date`) would give resolve and series prediction a year of history.

## 2026-10-27 — Places census: FAA registers and Census ZIP codes (spec 0002, slice 1)

- **What:** `pnpm census [dataset…]` (`apps/api/src/census.ts`, code in `apps/api/src/places/census/`, bit `census.import`) loads five public datasets for Florida into the tables of migration `0002_places_census`. No schema change, no new dependency (ZIP files are read with Node's built-in `zlib`).

  | Dataset                                      | Source (all public domain: US government works)                                                                                                                                                             | Into              |
  | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
  | `fria` FAA-Recognized Identification Areas   | `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/FAA_Recognized_Identification_Areas/FeatureServer/0` (FAA UAS Data Delivery System, `udds-faa.opendata.arcgis.com`), `state='FL'`       | `places`, `hosts` |
  | `fixed-sites` Recreational Flyer Fixed Sites | `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Recreational_Flyer_Fixed_Sites/FeatureServer/0`, `STATE='FL'`                                                                           | `places`, `hosts` |
  | `airports` airports and heliports            | `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/US_Airport/FeatureServer/0` (FAA Aeronautical Data Delivery Service, `adds-faa.opendata.arcgis.com`), `STATE='FL'`, closed ones skipped | `airports`        |
  | `airspace` controlled airspace               | `https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Class_Airspace/FeatureServer/0`, Florida's envelope: class B (all parts), C and D from the surface, E2/E3/E4 surface areas              | `airspace`        |
  | `zip-codes` ZIP code centres                 | US Census Bureau Gazetteer ZCTA file, latest year published (`https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2026_Gazetteer/2026_Gaz_zcta_national.zip`), ZIPs 320–339 and 341–349               | `zip_codes`       |

- **Stored:** site and organisation names, coordinates (a FRIA's centre, a fixed site's point), the city, a road when the register's title names one, FAA record ids, approval and edit dates, a fixed site's ceiling (in the place's notes) and a link to the FAA's map of the register at the site. **Not stored, and never requested:** the FRIA requester's postal address and ZIP code, a fixed site's point of contact (POC) and ZIP code. One FRIA title begins with a person's name; the census replaces it (`TITLE_FIXES` in `fria.ts`). Fixtures and logs follow the same rule.
- **How it dedupes:** places by `(register, registerId)`, else the nearest flying field within 300 m, else the same club's field from the other FAA register within 1,200 m (a FRIA is an area and a fixed site a point, up to ~1 km apart for the same field); hosts by record, AMA charter number (from the FRIA title, "Club #1234"), name or alias with spelling ignored, then one or two typos. The four seeded fields that are FRIAs (Silver Field, Markham Park, West Delray, Dyer Park) now carry their FAA record; their names, notes and access are untouched, and the seeded clubs are matched rather than copied. Running twice changes nothing. Places and hosts are never deleted by the census; records that leave a register are listed for the crew.
- **Decisions taken while building it:**
  - An AMA club's FRIA is hosted by **the club** (charter number in the title), not by the AMA. Sites of other recognised organisations (FPV Freedom Coalition, Flite Test Community Association) are hosted by that organisation as a `sanctioning-body`. **School FRIAs (64) and school fixed sites are places without a host**: the register names no organisation for them, and they are for the school's own programme (said in the notes).
  - Every new place has access `permission` (the FAA records say nothing about visiting); `verifiedAt` is the FRIA's approval date or the fixed site's last edit, not the import time, so "last checked" stays honest.
  - FRIA record ids drop amendment suffixes (`…-FRIA-A1` → `…-FRIA`); fixed sites use the FAA's site id when there is one, else the record's GlobalID.
  - On later runs, a place or host the census created only gets register facts refreshed (FRIA flag, source link, newer date, a missing host): names, coordinates, notes and access belong to the crew and stewards (principle 4 in `LANDSCAPE.md`).
  - Class B shelves are kept with their floor in `lower_ft`; the FAA gives shelf floors above sea level, which in Florida (under 350 ft of terrain) is close to above ground. Class D and E areas that are part-time (hours by NOTAM) are stored like the others: the table has no column for hours.
  - Airports, airspace and ZIP codes are mirrors: rows the register dropped are deleted, unless a response looks incomplete (under half of what we hold).
  - The seed now marks Silver Field and West Delray as FRIAs too (`seed-data.ts`): `pnpm db:seed` writes every column any seeded place sets, so it used to clear the flag the census had set.
- **Result (local database, 2026-10-27):** 163 FRIAs and 104 fixed sites in Florida became 187 new places plus 4 seeded places linked to their record (193 places in all) and 91 new hosts (clubs already seeded were matched by charter number or name), 926 airports and heliports (9 closed ones skipped), 122 airspace areas, 1,013 ZIP codes. Eight requests in all; a second run changed nothing.
- **Impact:** no new environment variables or services. Running it on a schedule (the registers change every few weeks) needs SST Cron: ask Itaca engineering. Possible schema additions for slice 3, not made: a fixed site's ceiling as a number (today in notes), part-time hours for airspace, and the FRIA polygon itself (today only its centre).

## 2026-10-27 — Servo 1.0: the plan to finish the web, and who approves what

- **What:** four specifications in `docs/specs/` (0001 events, 0002 places, 0003 community, 0004 launch) and a new "Servo 1.0" section in `ROADMAP.md`. The owner accepted five recommendations:
  1. Version 1 is phases 0–4, public in Florida. Profiles and builds with photos, stored results, flying conditions, the mobile app and other states come after.
  2. **The owner acts as Itaca engineering** for the items `AGENTS.md` sends there (accounts and personal data, roles, emails, uploads, AI, scheduled jobs, region and domain). Each one is recorded here when it is built. An Itaca review before production is still recommended.
  3. Sign-in with Google or a one-time email link, no passwords. Name and home ZIP code are optional; nothing about a member is public by default.
  4. Clubs and tracks are verified by an email at the club's own domain or a code placed on its website; otherwise the crew checks by hand.
  5. Events and places for all of Florida from day one; community and promotion start in South Florida.
- **Why:** the owner's request to finish events and community as version 1, ready to launch, built as a public platform people want to take part in (`LANDSCAPE.md`).
- **Impact:** the owner asked for all of it to be built in one go; slices are committed in order on branches `feat/servo-1.0-*`. Deploying stays with the owner (`docs/LAUNCH.md`).

## 2026-10-27 — Refreshed to the Itaca standard `create-itaca@0.2.3`

- **What:** Servo takes everything new in the `platform` stack 0.2.3 that applies to it:
  - **How we work:** the skills `/plan`, `/fix`, `/ship`, `/document`, `/takeover` and `/guide` in `.claude/skills/`, a prompt hook that reminds agents to pick one (`.claude/settings.json`), and the "How we work" and "Documentation" sections of `AGENTS.md`.
  - **Standard documents:** `docs/SYSTEM.md` (the map), `docs/OPERATIONS.md`, `docs/specs/` (one specification per feature, written with `/plan`) and `docs/bits/` (the catalog of bits, one file per piece of behaviour; every existing route and command now has one).
  - **Tracing:** every API request gets a trace ID (`x-request-id`, else Cloudflare's `cf-ray`) and one log line with its bit (`@Bit()` on every route, `apps/api/src/common/trace.ts`). `getApi()` forwards the page's trace ID; `getPublicApi()` doesn't, on purpose, because headers are part of the fetch cache key.
  - **Security:** `pnpm audit` is clean. `multer` 2.5.0 is forced by an override until NestJS 12.3 is old enough to install (it was published today); `body-parser` 2.4.0 and `fast-uri` 3.1.9 came in through a lockfile update; `esbuild` 0.25.12 is forced under `drizzle-kit`'s deprecated loaders.
  - **Updates:** Next.js 16.4.3, Better Auth 1.7.13 (1.7.14 is still inside the one-day window), SST 4.17.2, OpenNext 4.1.12, ESLint 10.13.0 in the API.
  - **Infrastructure (approved by the owner today):** `sst.config.ts` pins the Cloudflare provider (6.22.1) and adds the **origin lock**: the API's load balancer accepts only Cloudflare's IP ranges, and once the `OriginVerifyHeader` secret is set, the API and the site answer 403 to requests that didn't come through Cloudflare. RDS moves to PostgreSQL 18, the version local Docker already runs. CI caches the Next.js build.
- **Kept on purpose:** no `apps/web` (Servo's public pages are the product, see 2026-10-21); Servo's own button, input and textarea styles; ESLint 10 in `apps/app` (the template stays on 9 because `eslint-config-next`'s plugins still declare `eslint ^9`; `pnpm lint` passes on 10, see 2026-10-22); Vitest and `pnpm test`; the `www` host for the site; the `us-east-1` region until C1 is settled in the launch spec.
- **Why:** staying inside the Itaca standard is what lets any Itaca engineer take Servo over. The new way of working (specs and bits) is how Servo 1.0 gets built.
- **Impact:** new SST secret `OriginVerifyHeader` (defaults to `off`; set it only after the Cloudflare transform rule exists, see `CLOUDFLARE.md`). Nothing deployed.

## 2026-10-23 — Events on the web: from the database, on a map, in your calendar (roadmap P1)

- **What:**
  - **API (public, read-only):** `GET /events` (filters: dates, discipline, kind, region), `GET /events/:slug` (with its sources), `GET /places`, and two iCalendar feeds: `GET /events/calendar.ics` (filterable) and `GET /events/:slug/calendar.ics`. All `@Public()`, cached 5 minutes. Unpublished events answer 404.
  - **Web:** `/events` reads from the API, with filters by discipline and kind, a map, "Near me" (sorts by distance in the browser; the location is never sent anywhere) and a block to subscribe to the calendar (Apple/Outlook via `webcal://`, Google Calendar, copy link). New `/events/[slug]` page: dates, place, map and directions, organiser, "Add to calendar", **where the information comes from and when it was last checked**, a "Something wrong? Tell us" link (new contact topic `correction`) and schema.org `Event` data for Google (only for events with exact dates). The home page's three upcoming events and the sitemap also come from the API.
  - The feeds people subscribe to live on the site's own domain (`/events/calendar.ics`, route handlers that relay the API) because their callers are calendar apps.
  - `apps/app/src/content/events.ts` is gone: the database is now the only copy of the calendar (`places.ts` stays until places get their own pages).
- **Why:** the owner's new order (2026-10-23): what people see and use first. Visible sources and "last checked" are the trust nobody else in RC shows (`LANDSCAPE.md`).
- **Impact:**
  - **New dependency: `maplibre-gl` 6.15.0** (BSD-3, open-source vector maps) in `apps/app`. Its web worker is pointed at with `setWorkerUrl(new URL(..., import.meta.url))` so the bundler ships it as a file; the map loads only in the browser, after the list.
  - **New external service: OpenFreeMap** for the base map (free, no key, commercial use allowed, OpenStreetMap data; MapLibre shows the required attribution). No SLA: Itaca may want Amazon Location Service before production.
  - **Coordinates** come from the FAA FRIA layer (public data) for four fields and the US Census geocoder for the two car tracks; DeLand RC's field isn't in either, so Jets Over DeLand shows without a pin.
  - Calendar feeds include only events with announced dates; a cancelled event stays in the feed marked CANCELLED, which is how subscribers find out.
  - Public pages (`/`, `/events`, `/events/[slug]`) render on request with API data cached 5 minutes (`getPublicApi()`, no cookies), so the build never depends on the API being up.
  - `.claude/launch.json` gained `servo-app` (the web alone on port 3000): the preview tool gives both apps the same `PORT`, so `pnpm dev` there made the API try port 3000.

## 2026-10-22 — Discovery first, designed from first principles

- **What:** [`docs/DISCOVERY.md`](./DISCOVERY.md) designs how the engine finds every RC event in Florida and how we measure that it did: a census of organisers, their channels, four ways to find events (watch known channels, aggregators, open-web sweeps, monitors) and people. A new roadmap track (D) puts it ahead of more site readers. Nothing new is built yet.
- **Why:** the owner's priority: the engine is only as good as what it finds, and Parallel (or similar) was always meant to be part of it.
- **Impact:**
  - **Search tools give leads, never data.** Parallel's terms forbid using outputs to "create databases" (§2(c)(vi)(B)) and let Parallel train on our queries; Exa and Brave restrict storing and republishing too. We use their answers only to learn which URL to read, then fetch the organiser's page ourselves. Whether we may keep lead URLs and query history must be asked in writing before going live.
  - **Florida in numbers (2026-10-22):** ~110 AMA clubs, ~40–50 car tracks, ~7 MultiGP chapters, 36 model-yacht clubs; 163 FAA FRIAs and 104 recreational fixed sites in Florida (public data, the census backbone); ~400–700 headline events a year plus ~2,000–4,000 recurring race and sailing days, stored as venue schedules, not discovered date by date.
  - **Facebook carries an estimated 50–60 % of all occurrences** (mostly recurring days, crawlers, FPV): reachable only through organisers and members. Headline events are mostly on the open web.
  - **Partnerships to request:** AMA, DualRates (8 of 21 sampled club sites run on it; 3 blocked us by region), MultiGP (Florida-based), RCSignup, Google Calendar clubs.
  - **Planned tables** (`discovery_queries`, `discovery_runs`, `leads`, `lead_hits`) and new env vars for API keys come with D3, with their own entry.
  - Scratch downloads made during the research that contained personal contact details (AMA club pages, FAA point-of-contact fields, calendar descriptions) were deleted; nothing personal was committed.

## 2026-10-22 — The engine reads its first sources (roadmap A3, first part)

- **What:** `pnpm engine [source…]` runs the engine once from the command line (`apps/api/src/engine.ts`): it fetches each source, keeps a copy of what it read, extracts events and stores them as sightings. Two readers so far, in `apps/api/src/events/engine/`: ICS calendar feeds (every public Google Calendar) and schema.org JSON-LD event data (Wix, WordPress event plugins, ticketing pages). New dev dependency: **Vitest** 5.0.5 in `apps/api`, the Itaca standard for unit tests; `pnpm test` runs the tests and `pnpm check` now includes them. New variable: `ENGINE_SNAPSHOT_DIR` (default `.snapshots`, git-ignored).
- **Why:** first step to a calendar nobody has to type. First live result: the engine read **AeroFest** (Nov 5–7, landing fee $40) and **Jets Over Miami 2026** straight from the AMPS site.
- **Impact:**
  - **Politeness is built in, with no switch to turn it off:** the fetcher says who it is (`ServoBot/0.1` + a contact URL, to become Servo's own page once the domain exists), obeys `robots.txt` (RFC 9309), waits at least 2 s between requests to the same site (more if the site asks) and asks for a page only if it changed (ETag / Last-Modified).
  - **Google Calendar feeds are blocked:** `calendar.google.com/robots.txt` disallows all automated access, so the DeLand RC and Coral Springs calendars can't run, although they are public. One copy of each was downloaded by hand on 2026-10-22 to build the test fixtures. Options for the owner and Itaca: ask each club for permission or for the feed directly, or decide that a calendar subscription isn't crawling. Until then they stay `candidate` sources. Coral Springs' calendar also has nothing after early 2026.
  - **Club calendars are mostly not events:** DeLand's mixes events with meetings, chores and "no flying" notices. `classify.ts` sorts entries by title (event kind, notice, club business, practice); notices are skipped for now and will feed the "conditions" feature later. Repeating entries are skipped.
  - **No descriptions from calendars:** they hold organisers' names, phones and emails. The engine keeps title, dates, place and link, plus the exact source line behind each field as evidence. JSON-LD descriptions (one-line taglines) are kept, cut to 300 characters.
  - **Fixtures** in `apps/api/src/events/engine/fixtures/` are trimmed copies of the real DeLand calendar and AMPS pages, with personal data removed.
  - **Not done yet:** HTML readers for Extreme Flight, Horizon, ROAR and RCSignup, and resolve (turning sightings into events, needed for the M1 milestone). Both are now separate items in the roadmap.

## 2026-10-22 — Events engine data model (roadmap A2)

- **What:** ten tables in `packages/db/src/schema/events.ts` (migration `0001_events_engine`): `sources`, `fetches`, `sightings` (what the web said), `events`, `series`, `places`, `hosts` (what we believe), `event_sightings`, `changes` and `reviews` (how we got there). The vocabulary (event kinds, disciplines, statuses, regions, source adapters and trust) and the shapes the API and the extractors share are Zod schemas in `packages/shared/src/events.ts`; the PostgreSQL enums are built from the same lists, so `packages/db` now depends on `@workspace/shared`. `pnpm db:seed` loads the 7 hand-checked events, the 6 places, their hosts and series, and the 9 sources researched on 2026-10-21 (as candidates; the AMA calendar as blocked until AMA says yes).
- **Why:** first step of the approved build order. Events, places and hosts are a public catalogue, so unlike `notes` they have no `owner_id`: anyone reads what is published, only the engine and the crew write.
- **Impact:**
  - **Lifecycle:** the statuses are `expected → announced → confirmed → cancelled | held`. The roadmap's "changed" is a row in `changes` and "results" is `results_url`, not statuses.
  - **Sightings** are stored once per distinct content of a source (`fingerprint`); seeing the same thing again only moves `last_seen_at`. Every version a source published is kept without one row per fetch. Raw responses will go to S3 (`fetches.snapshot_key`); until then the worker keeps them on disk.
  - **Seed data is a copy** of `apps/app/src/content/events.ts` and `places.ts` in `apps/api/src/events/seed-data.ts` (apps can't import each other). The app's copy goes away when `/events` reads from the API (A4). Each seeded event is backed by one sighting from the `servo-crew` source.
  - `reviews.reviewer_id` points to `user`; who may review (the `crew` role) is still for Itaca engineering (A5).

## 2026-10-22 — Roadmap approved: what we index, the community ladder and the build order

- **What:** [`docs/ROADMAP.md`](./ROADMAP.md) is the approved plan. The engine indexes events, series, competitions, places and hosts now; results and rules later; flying conditions last. The community is a ladder (visitor, member, contributor, organiser, crew) built as utility around events and places, not a forum. Build order: the engine runs locally first (track A), research in parallel (track B, starting with a hand-verified golden set of Florida events), and AWS deployment waits for the region and worker decisions (track C).
- **Why:** the owner approved the overview on 2026-10-22. Nothing blocked on AWS or the domain stops the engine from being built and tested against the local database.
- **Impact:** competition results are linked, not stored, until organisers publish them with us (they carry people's names). Events cover all of Florida; places and community start with South Florida. Still for Itaca engineering: region (us-east-2), worker infrastructure, SES, S3 uploads and the `crew` and organiser roles.

## 2026-10-22 — AWS Agent Toolkit and the new AWS experience project

- **What:** AI agents working on Servo get AWS access through the AWS Agent Toolkit (`aws/agent-toolkit-for-aws`): the AWS CLI profile `servo`, signed in with `aws login` (browser sign-in, no access keys), the AWS MCP server and the default AWS skills. The toolkit's rules for the new AWS experience are in `AGENTS.md`, between the `AWS Agent Toolkit rules` markers, and Servo's own rules win where they conflict.
- **Why:** the owner wants agents to be able to inspect and build on AWS with current AWS guidance, without handing them long-lived keys.
- **Impact:**
  - **Project:** a new AWS experience project (account `352587389937`, signed in with social sign-in). These projects are locked to one Region: **us-east-2**. They can't use Lambda@Edge, StackSets or cross-Region features, and they may have a spend limit that pauses the project.
  - **Region conflict, needs Itaca engineering:** `sst.config.ts` and `docs/DEPLOY.md` deploy production to **us-east-1**, which this project does not allow for Lambda, Fargate or RDS. Before anyone deploys into this project, engineering must decide whether to move `providers.aws.region` to `us-east-2` or deploy production to a different (advanced) AWS account. Nothing was changed in the infrastructure files.
  - **Machine setup, not in git:** the profile lives in `~/.aws/` and the AWS skills in each agent's global config (for example `~/.claude/skills`). The `aws-mcp` server is configured per environment, one AWS account each, never globally, all with `AWS_MCP_PROXY_PROFILES=servo` here:
    - **Claude Code:** a local-scope server for this repo only (`claude mcp get aws-mcp`).
    - **Cursor, Codex and OpenCode:** `.cursor/mcp.json`, `.codex/config.toml` and `opencode.json` at the repo root. They are listed in `.git/info/exclude`, so they stay on that machine and out of git.
    - Other repos point their own `aws-mcp` at their own profile. Each engineer who wants this runs the setup on their own machine.
  - **Credentials:** they last 12 hours and renew without the browser for up to 90 days. After that, run `aws login --profile servo` again.

## 2026-10-22 — Always on the latest stable versions

- **What:** project policy: every dependency, runtime and service runs its latest stable release. Releases with security or other important fixes are applied as soon as they pass the 1-day `minimumReleaseAge` in `pnpm-workspace.yaml`. Release candidates, betas and canaries don't count as stable. Applied today:
  - Minor and patch updates: Next.js 16.4.2, React 19.3.1, Better Auth 1.7.12, NestJS 12.2.0, Zod 4.6.7, radix-ui 1.8.1, lucide-react 1.60.0, shadcn 4.22.1, cn 0.5.0, typescript-eslint 8.72.0, Prettier 3.9.10, `@types/node` 24.19.2.
  - `apps/app` moves from ESLint 9.39.5 to 10.13.0. ESLint 9 is marked as no longer supported, and `apps/api` was already on 10. `eslint-plugin-react`, `-import` and `-jsx-a11y` (through `eslint-config-next`) still declare `eslint ^9` as a peer, but `pnpm lint` passes. Revisit when they add 10.
- **Why:** the owner's rule. Outdated versions accumulate known vulnerabilities, and large jumps later are riskier than small ones now.
- **Impact / pending:**
  - **PostgreSQL:** the latest stable is 18. Version 19 is at RC 1, with GA planned for 2026-11-19. Local Docker already runs `postgres:18-alpine`, but `sst.config.ts` still asks RDS for `17`. Moving it to `18` needs explicit approval because it is an infrastructure file. Nothing is deployed yet, so no data migration is needed.
  - **Kept on purpose:**
    - Node.js 24, the active LTS. Node 26 only becomes LTS at the end of October 2026; switch then (`.nvmrc`, `engines`, `@types/node`, Dockerfile).
    - TypeScript 5.9. TypeScript 7.0 is the new native compiler, a major change that needs its own check with Next.js and NestJS.
    - `sst` 4.17.1 and OpenNext 4.1.8. The infrastructure tooling is updated only with approval; 4.17.2 and 4.1.12 are available.
  - **`pnpm audit`:**
    - `braces` (high, no patched version yet), pulled in by the `shadcn` CLI.
    - `esbuild` 0.18 (moderate), pulled in by `drizzle-kit` through the deprecated `@esbuild-kit`.
    - Both are development-time tools that never run in production. Re-check when `shadcn` and `drizzle-kit` publish fixes.

## 2026-10-21 — Servo moves to the `platform` stack (Next.js + NestJS API + PostgreSQL)

- **What:** the repo is now a pnpm monorepo built from the `platform` stack of create-itaca 0.2.0. That version is unreleased; it comes from the `docs/platform-stack-design` branch of `itaca-stacks`, commit `f4d3b9e`.
  - **`apps/app`** holds the whole Next.js site, moved with its history.
  - **`apps/api`** is the NestJS 12 API, with Better Auth 1.7.8 for accounts.
  - **`packages/db`** holds the Drizzle schema and migrations for PostgreSQL.
  - **`packages/shared`** holds the Zod contracts.
  - **`packages/api-client`** is the typed client, generated from OpenAPI.
  - **`packages/ui`** holds the shadcn components and the brand theme: tokens, fonts, cutting-mat and pegboard patterns.
  - The site's own styles (Anatomy figures, Lenis) stay in `apps/app/src/app/globals.css`.
  - The template's `notes` and `sign-in` examples are kept as the reference until the first real module (events) replaces them.
- **Why:** the events engine needs a database, scheduled background work and a real API, and a mobile app is likely. `web-app` keeps the backend inside Next.js, so it can't serve a mobile app or run jobs (`docs/EVENTS-ENGINE.md`).
- **Deviation from the template:** there is **no Astro site (`apps/web`)**. Servo's public pages are the product (dynamic events, a page per event for search, interactive figures, member features), so they live in `apps/app`, served on `www.` (production) and `www-<stage>.` (other stages). The bare domain redirects to `www.`; the API is on `api.`. To feed back into the template: a "no public site" variant of `platform`.
- **Impact:**
  - **Local development needs Docker:** `pnpm db:up && pnpm db:migrate`, then `pnpm dev`. If port 5432 is taken, put `DB_PORT=5433` in a root `.env` and use that port in `apps/api/.env`.
  - **Production has a fixed monthly cost** even with no traffic: load balancer, RDS, NAT instance and a Fargate task. See `docs/DEPLOY.md`.
  - **Nothing is deployed yet.** The first deploy goes to a test AWS account (stage `dev`) once the domain is bought; the domain is still `example.com` in `sst.config.ts` and `itaca.json`.
  - **The worker is not added yet.** It will run SQS + Cron for ingestion inside `apps/api`, and it is the next step of the plan.
  - **Checked:** every page renders with computed styles identical to before the move (home, events, community, contact, RC plane guide). Sign-up, sign-in and a note saved through the API to PostgreSQL work locally.

## 2026-10-21 — The cars and crawlers guide

- **What:** `/guides/cars-and-crawlers`, built like the plane and helicopter guides: a hero that comes apart on scroll (`figures/car-apart`, a 1/10 short-course truck in the Team Associated Pro2 SC10's proportions, 85 solids in 10 assemblies), a sourced timeline (`src/content/car-history.ts`, 12 milestones from the 1960s to 2026), three benches, a part-by-part explorer (`components/guides/car-explorer.tsx`), a section on crawlers, an RC10-versus-RB10 then-and-now table and the local section (Coral Springs RC Track, West Delray Regional Park; cars need no FAA paperwork). The benches: `figures/diff` (Fig 2: an open differential you steer; the carrier turns at the average of the two wheels), `figures/shock` (Fig 3: a coil-over on a dyno; oil from 100 to 1000 cSt changes the overshoot and settling) and `figures/gearing` (Fig 4: pinion, spur and transmission into final drive and theoretical top speed; 18T on the Pro2 is 12.57:1 and about 40 km/h on 2S). `figures/bench/` holds the shapes and the slider hook the three share.
- **What:** the home page's guides now wrap three to a row (the short last row centred), and the cars cover is mat green with light lettering.
- **Impact:** no new dependencies. Numbers come from Team Associated's spec pages, manual and FDR calculator, Axial, ARRMA via Horizon Hobby, Britannica, RC Car Action, BigSquidRC and Hobbywing, linked where they're used. Traxxas's site was offline during research, so no Traxxas figures are used. Assumed and said so in the captions: the diff's 0.7 m tightest turn and gear teeth, the shock's spring rate and the linear damping-to-viscosity model. Top speeds are no-load and theoretical. Line checks: 0 floating ends on all four figures.

## 2026-10-21 — The helicopter guide, and a colour per discipline

- **What:** Air, Rotor and Ground each get their own background (sky, yellow, red) and three plain-language facts with a link to their guide, instead of the spec cards. The truck in the Ground diorama is sky blue and the crawler white, so they stand out on red.
- **What:** `/guides/rc-helicopters`, built like the plane guide: a hero that comes apart on scroll (`figures/heli-apart`, a 450 on a display post, 102 solids in 10 assemblies), a sourced timeline (`src/content/heli-history.ts`, 12 milestones from 1931 to 2013), three benches, a part-by-part explorer (`components/guides/heli-explorer.tsx`), a then-and-now table and the local section. The benches: `figures/swashplate` (Fig 2: three servos at 120° under a two-ring swashplate and a turning head; collective lifts the plate, cyclic tilts it and each blade's pitch swings once per turn), `figures/tail-torque` (Fig 3: the body on a turntable against a torsion spring; tail pitch cancels the rotor's torque at about 8°) and `figures/hover-bench` (Fig 4: a 762 g 450 strapped to a bench scale that reads zero at about +6° of collective).
- **What:** the exploded-figure machinery is shared: `figures/apart/` (`spec.ts`, `live.tsx`, `stage.tsx`, `preview.tsx`, `faded.tsx`) now drives the plane, the helicopter and the truck, and `figures/live-solid.tsx` is the painter every animated bench uses. Guide covers on the home page are stills of each guide's own hero (`ApartPreview`).
- **Why:** the user asked for the helicopter and car guides at the plane guide's level of detail, and for each discipline section to stand on its own colour.
- **Impact:** no new dependencies. Facts and numbers come from Model Aviation, the AMA History Project, the FAI, Guinness World Records, Mikado, and the Horizon Hobby, Align and Microbeast manuals, each linked where it's used. The torque bench's 1.05 N·m hover torque is an estimate (about 300 W at 2,700 rpm) and says so in its caption. Line checks: 0 floating ends on all four helicopter figures.

## 2026-10-21 — Events engine: design proposal

- **What:** a design for an events engine that finds, reads, merges, checks and publishes RC events, Florida first, then the US: [`docs/EVENTS-ENGINE.md`](./EVENTS-ENGINE.md). It includes the Florida source inventory (checked 2026-10-21), a first data model and five phases. Nothing is built yet.
- **Why:** the calendar is typed by hand and already misses events (AeroFest, Miami, Nov 5–7). Being the reference for RC events needs a system, not more typing.
- **Impact:** phase 0 needs nothing new. From phase 1 the engine needs PostgreSQL + Drizzle, scheduled background jobs (likely EventBridge + SQS + Lambda in `sst.config.ts`), S3 for snapshots, an LLM provider for extraction and geocoding. **Itaca engineering must choose and own the background-job infrastructure** before any of it is built. Reading the AMA calendar needs AMA's permission (commercial-use clause in their terms); MultiGP and FPVScores need a partnership; Facebook, Reddit, Meetup, Eventbrite, RCGroups and bot-walled sites are off-limits.

## 2026-10-21 — One title style, the real plane on the cover, a fading wall, a full footer

- **What:** the bench, guides and calendar sections open with one title style (`SectionTitle`): a plain first line and a second line on a colour tag (`Tag`, the same device as "Serious" in the hero), yellow, sky and red. It replaces the boxed `SectionTag` and the bench's yellow second line.
- **What:** guide cover No. 01 shows the guide's own Anatomy figure as a still, part-way apart with the wing lit (`plane-apart/preview.tsx`, drawn on the server from the figure's `SLOTS`, cropped to the pose). The hand-drawn plane it replaced is gone.
- **What:** the pegboard behind "On the calendar" fades up out of the page and back into it (a masked layer) instead of starting and stopping on hard edges.
- **What:** the footer (`src/components/site-footer.tsx`) gains a chequered finish line, a pitch with the booking buttons, four link columns built from the content (services, guides and what's in the works, the local scene, and the official FAA and AMA links from `rules.ts`), a giant wordmark and a back-to-top link.
- **Impact:** no new dependencies. The home page HTML grows by the cover figure's paths (static, no script).

## 2026-10-21 — The new colours reach the hero, the crew sheet and three 3D dioramas

- **What:** the hero gets parts lying around the servo card (`src/components/home/bench-parts.tsx`): a red propeller with yellow tips across its corner, a yellow-rimmed buggy wheel and a sky-blue LiPo with its red lead and XT60 peeking out from under it. The prop and wheel turn with the same scroll signal as the horn. "Serious" in the headline sits on a sky tag in the `SectionTag` style. On phones the hero now uses safe centring and a smaller servo, so the headline no longer slides under the header.
- **What:** the decal sheet uses the full palette: "First model" is sky, "Advanced" is red, the printer's colour bar shows all six inks, and wide screens get two decorative spares (a wing roundel and a "03" race plate).
- **What:** the Air, Rotor and Ground spec tables are now small spec chips, and each discipline has a 3D diorama on a black display base (`src/components/scenes/`): a trainer flying circuits with a loop over a club field (`airfield.ts`), a 450 helicopter that lifts off, pirouettes and lands on a helipad (`helipad.ts`), and a short-course truck flying a jump on a sand oval while a crawler climbs the rocks in the infield (`dirt-track.ts`). `toy.ts` is the shared kit: three flat tones per brand colour, black ink outlines (inverted hulls), an orthographic camera, ink shadows, and `bake`, which merges everything static so a scene draws in roughly 40–70 calls. The plane's attitude comes from its path (lift along the needed acceleration plus gravity), and the truck's jump is a parabola from the kicker's lip to the landing ramp. `src/components/home/toy-stage.tsx` mounts a scene.
- **Why:** the colours were introduced for a poppier hero but first appeared halfway down the page; the tables read like a spec sheet rather than the hobby.
- **Impact:** new dependency **`three` 0.186.1** (plus `@types/three` for development). It is not in the standard-choices table, so Itaca engineering should review it. It is about 145 KB gzipped and loads only when a discipline section comes within 600 px of the screen; each scene adds about 4 KB. Scenes render only while on screen, show one still frame under `prefers-reduced-motion`, cap the pixel ratio at 2, and leave the section readable if WebGL is unavailable. Colours are read from the CSS tokens at runtime, so the palette stays in `globals.css`.

## 2026-10-20 — Two more colours; guides and events get their own sections

- **What:** the palette opens slightly, using fireship.dev as a reference for colour but deliberately using fewer colours: `--sky` (`#4DA3F0`, the sky planes fly in) and `--lead` (`#F0553C`, a LiPo's red lead) join XT60 yellow and cutting-mat green as accents (`bg-sky`, `bg-lead`). Both pass AA with black text (7.8:1 and 6.1:1).
- **What:** "From the bench" and "Next on the calendar" were one two-column section that made a guide and three events look like the same kind of thing. They are now two sections, each opened by a `SectionTag` (the title on a block of colour): guides are kit assembly-manual covers (`manual-cover.tsx`: stapled spine, manual number, an exploded-view drawing, plus a dashed "in the works" draft), and upcoming events are pit passes hanging on a workshop pegboard (`pit-passes.tsx`, `bg-pegboard` in `globals.css`) whose lanyard colour gives the kind (fly-in sky, competition lead, show yellow). Each pass links to its entry on `/events`, which now carries an `id` per event.
- **What:** the bench's wide layout is now symmetric about the centre line so the title, readout and button read as one column.
- **Impact:** no new dependencies. `GUIDES` entries gained a `cover` field.

## 2026-10-20 — The cutting-mat section is a working bench

- **What:** the home's "Same six parts" cards (KV, amps, cell voltage, channels) are replaced by `src/components/home/signal-bench.tsx`: the six parts of any RC model (transmitter, receiver, servo, speed controller, motor, battery) drawn top-down on the cutting mat and wired up. The transmitter's sticks are real sliders (pointer and keyboard): the left one sets power and spins the propeller, the right one turns the servo horn and springs back to centre. Until someone touches them the bench runs a slow demo. Wide screens label parts with masking tape; narrow screens use numbered badges and a list.
- **Why:** the old cards assumed you already knew the hobby. The bench answers the outsider's first question, "how does a remote-control model work?", with less text.
- **Impact:** no new dependencies (Motion and lucide-react). Animation pauses off screen and under `prefers-reduced-motion`. The hero servo lost its "servo" label.

## 2026-10-20 — The crew section is a decal sheet

- **What:** the home page's "Three of us" section is a kit's decal sheet (`src/components/home/decal-sheet.tsx`): the headline as vinyl lettering with a die-cut edge, the five services as stickers in different die-cut shapes that slap onto the sheet when it scrolls into view and peel a corner on hover, and the Servo logo decal. It replaced a transmitter version that repeated the hero's two-column layout on black.
- **What:** the VT323 pixel font, transmitter tokens and `lcd-pixels` utility added for the transmitter are no longer used and were removed.
- **Why:** a change of rhythm after the hero, playful and specific to the hobby, with very little text.
- **Impact:** none functional. Services carry `short` and `tag` fields in `src/content/services.ts`.

## 2026-10-20 — Figures drawn on the page, centred frame

- **What:** Anatomy figures no longer sit in a white card. `FigureFrame` (`src/components/figures/figure-frame.tsx`) replaces the kit's `Plate` for site use: figure number and title centred above, the live readout (a pill) and the hint centred below, then legend and caption. The kit's light tokens are retuned to the primer-grey page in `globals.css` (`.servo-figure`). The RC plane guide is now a centred, symmetric layout, including the hero.
- **Why:** the figures should read as part of the article, not as embedded widgets.
- **Impact:** none functional; the readout keeps the kit's `.iso-plate [data-readout]` contract. On phones figures bleed edge to edge instead of being cropped.

## 2026-10-20 — More Anatomy figures in "The RC plane, taken apart"

- **What:** four figures now carry the guide, all in `src/components/figures/`: `plane-apart` (hero, Fig 1: a trainer on its stand that comes apart into 9 assemblies as the page scrolls, with a numbered assembly list that highlights each one), `thumb-to-elevator` (Fig 2), `balance` (Fig 3: a beam balance for the CG, 25–33% of chord) and `thrust-stand` (Fig 4: 1000 KV motor, 10 × 7 prop, 3S pack, servo tester, wattmeter and load cell).
- **Why:** the guides are meant to be explained by real, explorable machines rather than text alone.
- **Impact:** every figure reads from a pure `model.ts`. The thrust stand uses the standard prop equations with typical sport-prop coefficients (Ct 0.11, Cp 0.06) and says so in its caption; the balance uses typical trainer weights (1150 g airframe, 185 g pack). The hero is a Hero-sized figure (79 solids); the full exploded plane with ribs, wiring and wing internals would be an Epic and was not built. Line checks: 0 floating ends on all four (`node .claude/skills/anatomy/scripts/lines.mjs <url> --select "<root> svg"`).

## 2026-10-20 — Site structure, content and the Anatomy figure kit

- **What:** pages for the South Florida crew: `/learn` (services), `/events` (calendar), `/community` (clubs, fields, tracks and a build submission form), `/guides` with two guides (`/guides/rc-planes`, `/guides/flying-legally`) and a contact form with a topic field. Content lives as typed data in `src/content/`; every event, place, rule and history milestone links to its source (researched and checked 2026-10-20).
- **What:** the Anatomy skill (github.com/wheresryan22/anatomy, MIT, commit 1482e84) is installed in `.claude/skills/anatomy` for the team, and its kit is vendored in `src/components/iso/` (plus `lathe.d.mts` types). Fig 1, "Thumb to elevator", is in `src/components/figures/thumb-to-elevator/`: a pure model (`model.ts`) drives every number, and `node .claude/skills/anatomy/scripts/lines.mjs <url> --select ".tte svg"` reports 0 floating line ends.
- **What:** the kit needs its own stylesheet (`src/components/iso/iso.css`). Brand overrides for figures and the plane explorer live at the end of `src/app/globals.css`. Both kit folders and `.claude/` are excluded from ESLint, Prettier and TypeScript like `components/ui`.
- **Why:** the brand's core content is long-form, visual explainers; the kit gives us a consistent, auditable way to build them.
- **Impact:** **contact and build submissions are validated but only logged** — they are not delivered anywhere yet. Delivery needs Amazon SES (standard choice) and a verified sender: engineering to set up. Community posting by members (phase 2) needs a database and auth (PostgreSQL + Better Auth per the standard); not started. `/` and `/events` revalidate daily so past events drop off. Events, clubs and rules need a periodic re-check: dates and rules change.
- **Note:** in this environment the Turbopack dev server does not hot-reload `globals.css`; restart `pnpm dev` after CSS edits.

## 2026-10-20 — Servo brand system and scroll motion

- **What:** brand "Servo" (working name). Theme tokens in `src/app/globals.css`: primer grey background `#E4E4DF`, panel `#FAFAF7`, ink `#000`, XT60 connector yellow `#FFC629` (primary), cutting-mat green `#2E6A4E` (one section only, `bg-cutting-mat`). Hard offset shadows (`shadow-hard-sm/-/-lg`) and 2px ink borders; buttons press down into their shadow. One type family, Archivo (variable width): `font-wide` for headlines and the lowercase `servo` wordmark, normal width for body text.
- **What:** added `lenis` (smooth inertial scroll, `src/components/smooth-scroll.tsx`) and `motion` (scroll-linked animation: servo hero, drifting section words).
- **Why:** the site is a visual, scroll-driven showcase of the RC hobby; both libraries are small, React-friendly and widely used. Both are disabled or neutralised under `prefers-reduced-motion`.
- **Impact:** no env vars or services. Brand name may still change; it lives in `src/lib/site.ts` and `src/components/wordmark.tsx`.

## 2026-10-20 — Project created

- **What:** scaffolded with `create-itaca@0.1.0`: stack `web-app`, deployed to AWS via `sst`, Cloudflare in front.
- **Why:** Itaca Technologies standard stack.
- **Impact:** none.
