# Launch checklist: SunTzu RC 1.0

Everything in specs 0001–0005 is built and checked locally (`pnpm check` green, each bit marked in `docs/bits/`). What's left needs the owner: accounts, money, the name and the domain. Do the steps in order; each one says how to check it worked. Nothing here has been deployed yet.

## 0. What's ready, and what isn't verified

| Ready and verified locally                                        | Written but not verified (needs AWS, Google or a domain)         |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| Events engine, resolve, crew console, calendars and feeds         | `infra/` (Terraform, validated but never applied: SES, S3, jobs) |
| Places, clubs, "Can I fly here?" (FAA data loaded)                | Emails through Amazon SES (locally they're printed)              |
| Search: the box (⌘K, `/`), `/search`, "searched, not found"       | Search's PostgreSQL extensions on RDS (created by a migration)   |
| Accounts with email links, follows, "going", private calendar     | "Continue with Google" (needs an OAuth client)                   |
| Organisers: claim, verify, publish, widget                        | AI reading of pasted flyers (needs Bedrock model access)         |
| Alerts, digest and reports (printed locally), try-it, submissions | Turnstile on public forms (needs keys)                           |

## 1. Put the code on GitHub

The local repository has no remote yet, so all of this lives on one laptop.

```bash
git remote add origin git@github.com:akamachinecode/rc-landing.git
```

```bash
git push -u origin main feat/platform-monorepo chore/stack-0.2.3 feat/servo-1.0 chore/create-itaca-0.3.0
```

Open pull requests in order: `feat/platform-monorepo` (if it isn't merged yet) → `chore/stack-0.2.3` → `feat/servo-1.0` → `chore/create-itaca-0.3.0`. Protect `main` as in [`GITHUB.md`](./GITHUB.md). **Check:** CI is green on each pull request.

Merging to `main` deploys production, and the Deploy workflow has to be on `main` before it can deploy `staging` from the Actions tab. So before merging, create the `production` environment with **required reviewers** (you): the production deploy that merging starts then waits for your approval. Leave it waiting (or reject it) until step 6 works on `staging`.

## 2. The name and the domain (C3) — chosen

The owner chose **SunTzu RC** at **suntzurc.com** on 2026-11-03, and it is already in the code: the hostnames, `redirects`, `cookie_domain` and `email` in `infra/production.tfvars.json` and `infra/staging.tfvars.json` (staging sends from `staging.suntzurc.com`), `SITE` in `apps/app/src/lib/site.ts`, the wordmark, and `domain` in `itaca.json`.

The domain is registered with Cloudflare Registrar (since 2025-04-05) and already uses Cloudflare's name servers, so its zone exists. Check in step 3 that it is in **the account the API token will belong to**.

**Check:** `pnpm check` is green.

## 3. Cloudflare

1. Add the domain to Cloudflare in **the right account** (moving it later is painful) and apply the baseline in [`CLOUDFLARE.md`](./CLOUDFLARE.md).
2. Create an account-owned API token with **Zone → Zone → Read** and **Zone → DNS → Edit** on the zone; keep it for GitHub (`CLOUDFLARE_API_TOKEN`, step 4).
3. **Turnstile:** create a widget for the domain (Managed mode). Keep the site key and the secret for step 5.
4. **Rate limiting** (Security → WAF → Rate limiting rules). Public forms reach the API through the site's server, so the API sees the server's address, not the visitor's: limit on the **site's** host, where the visitor connects.
   - `POST` requests to `www.<domain>` (forms are Server Actions): 30 per minute per IP.
   - `POST /auth/sign-in/magic-link` on `api.<domain>` (the browser calls it directly): 5 per minute per IP.
   - `POST /search/misses` on `api.<domain>` (the browser reports searches that found nothing): 20 per minute per IP. `GET /search` only reads and is cached for 5 minutes; whether it needs a limit too is Itaca engineering's call (spec 0005).
   - The API also limits per member (10 events and 20 corrections an hour; a new club code every 5 minutes, 8 guesses per claim, ever).
5. Leave **Bot Fight Mode off** on the zone: it can't be skipped for the API, and the calendar feeds are read by calendar apps, not browsers.

**Check:** the zone shows "Active" and SSL/TLS is Full (strict).

## 4. AWS

1. Sign in: `aws login --profile servo`. Confirm the project's region is **us-east-2**: AWS Settings → View all projects → Overview → Additional info → Region.
2. Check the plan and the spend limit in AWS Settings → Billing. Each stage runs an always-on RDS database and two Fargate containers (site and API) behind a load balancer, roughly 75 USD a month, plus the scheduled jobs, S3, SES and Bedrock by use: estimate it with the AWS Pricing Calculator before the first deploy, and delete `staging` once production works if you don't need it.
3. **SES:** request production access (SES console → Account dashboard → Request production access). It takes about a day; until then SES only sends to verified addresses.
4. **Bedrock:** in the Bedrock console of us-east-2, turn on model access for Claude Opus 5.5 and Claude Opus 4.8 (the fallback). Without it, pasted flyers go to the crew's inbox instead.
5. **Terraform state, deploy role and image registries:** install [Terraform](https://developer.hashicorp.com/terraform/install) 1.16 or newer, then follow steps 1 and 2 of [`TERRAFORM.md`](./TERRAFORM.md) with `export AWS_PROFILE=servo`.
6. **GitHub environments** `production` (with required reviewers, step 1) and `staging`: step 3 of "One-time setup" in [`DEPLOY.md`](./DEPLOY.md).

**Check:** `aws sts get-caller-identity --profile servo` answers with the project's account, and `terraform -chdir=infra/bootstrap output deploy_role_arn` shows the role.

## 5. Settings and secrets, for each stage (`staging` first, then `production`)

They live in AWS Parameter Store under `/rc-landing/<stage>/` (see "Secrets and configuration" in [`DEPLOY.md`](./DEPLOY.md)). The database password and the sign-in secret are created by Terraform; these are yours, with `export AWS_PROFILE=servo`:

```bash
aws ssm put-parameter --type SecureString --name /rc-landing/staging/crew-emails --value "you@yourdomain,partner@yourdomain"
```

```bash
aws ssm put-parameter --type SecureString --name /rc-landing/staging/crew-inbox --value "crew@yourdomain"
```

```bash
aws ssm put-parameter --type String --name /rc-landing/staging/turnstile-site-key --value "<site key>"
```

```bash
aws ssm put-parameter --type SecureString --name /rc-landing/staging/turnstile-secret-key --value "<secret>"
```

Optional, for "Continue with Google" (Google Cloud console → Credentials → OAuth client ID, web; authorised redirect URI `https://api-staging.<domain>/auth/callback/google`):

```bash
aws ssm put-parameter --type SecureString --name /rc-landing/staging/google-client-id --value "<client id>"
```

```bash
aws ssm put-parameter --type SecureString --name /rc-landing/staging/google-client-secret --value "<client secret>"
```

**Check:** `aws ssm get-parameters-by-path --path /rc-landing/staging --query 'Parameters[].Name'` lists them.

## 6. First deploy, to `staging`

Run **Actions → Deploy → Run workflow** with stage `staging`. The first deploy takes 15–25 minutes (database, network, certificates); the plan is in the run's summary. Then:

1. **Load the data once:** run **Actions → Run a task** with stage `staging` and task `setup` (seed, FAA census, a first read of every source). It waits for the task and fails if it does.
2. **Check:**
   - `https://www-staging.<domain>` loads, and `/events`, `/places` and `/clubs` show data;
   - `https://api-staging.<domain>/health` answers `ok`;
   - signing in at `/sign-in` with a crew address sends an email that arrives, and `/crew` opens;
   - `/places/can-i-fly-here` answers for a point near Miami;
   - ⌘K (or `/`) opens search on any page, and `/search?q=markam park` puts Markham Park first;
   - in CloudWatch, after their first scheduled run, the `/ecs/rc-landing-staging/engine` log ends with a `resolve:` line and `/ecs/rc-landing-staging/notify` with `notify:`.
3. In `/crew`, approve the RCSignup races and anything else waiting (the engine found 10 Florida races that wait for a person, because RCSignup is a listing, not the organiser).

Everything runs in us-east-2 (there is no CloudFront, so no certificate in us-east-1). If a resource is refused, check the spend limit and the plan in AWS Settings, then ask Itaca engineering.

## 7. Production

1. Set the parameters of step 5 under `/rc-landing/production/` (Google's redirect URI becomes `https://api.<domain>/auth/callback/google`).
2. Approve the production deploy that is waiting in the Actions tab (or run **Actions → Deploy** with `production`). Run `setup` once, as in step 6, with stage `production`.
3. **Origin lock:** once everything works, follow "Origin lock" in [`CLOUDFLARE.md`](./CLOUDFLARE.md).
4. **Email reputation:** after two weeks of clean DMARC reports, move DMARC from `p=none` to `p=quarantine`.

## 8. Before you announce it

- Have someone read [`/privacy`](../apps/app/src/app/privacy/page.tsx) and [`/terms`](../apps/app/src/app/terms/page.tsx), ideally a lawyer: they were written in plain language for launch, without legal review.
- Write to the first clubs (AMPS, Markham Park Pilots, Palm Beach RC, the Sarasota clubs): their pages exist already, and claiming them takes a minute (`/organise`).
- Ask DeLand RC and the other Google Calendar clubs for their feeds (C6), and Horizon Hobby and MultiGP for permission to read their calendars (`DECISIONS.md`).
