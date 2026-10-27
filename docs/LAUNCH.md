# Launch checklist: Servo 1.0

Everything in specs 0001–0004 is built and checked locally (`pnpm check` green, each bit marked in `docs/bits/`). What's left needs the owner: accounts, money, the name and the domain. Do the steps in order; each one says how to check it worked. Nothing here has been deployed yet.

## 0. What's ready, and what isn't verified

| Ready and verified locally                                        | Written but not verified (needs AWS, Google or a domain)          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| Events engine, resolve, crew console, calendars and feeds         | `sst.config.ts` (never deployed: region, SES, S3, scheduled jobs) |
| Places, clubs, "Can I fly here?" (FAA data loaded)                | Emails through Amazon SES (locally they're printed)               |
| Accounts with email links, follows, "going", private calendar     | "Continue with Google" (needs an OAuth client)                    |
| Organisers: claim, verify, publish, widget                        | AI reading of pasted flyers (needs Bedrock model access)          |
| Alerts, digest and reports (printed locally), try-it, submissions | Turnstile on public forms (needs keys)                            |

## 1. Put the code on GitHub

The local repository has no remote yet, so all of this lives on one laptop.

```bash
git remote add origin git@github.com:ITACA-TECHNOLOGIES/rc-landing.git
```

```bash
git push -u origin main feat/platform-monorepo chore/stack-0.2.3 feat/servo-1.0
```

Open pull requests in order: `feat/platform-monorepo` (if it isn't merged yet) → `chore/stack-0.2.3` → `feat/servo-1.0`. Protect `main` as in [`GITHUB.md`](./GITHUB.md). **Check:** CI is green on each pull request. Don't merge to `main` before step 6 works on `dev`: merging deploys production.

## 2. Choose the name and the domain (C3)

1. Choose the final name and buy the domain.
2. Change it in one place each:
   - `DOMAIN` at the top of `sst.config.ts`;
   - `SITE.name` and `SITE.description` in `apps/app/src/lib/site.ts` (the site, emails and share images);
   - `domain` in `itaca.json`.
3. Search the repository for `example.com` and replace what's left in the docs.

**Check:** `pnpm check` is green.

## 3. Cloudflare

1. Add the domain to Cloudflare in **the right account** (moving it later is painful) and apply the baseline in [`CLOUDFLARE.md`](./CLOUDFLARE.md).
2. Create an account-owned API token with DNS edit on the zone; keep it for step 5 and for GitHub (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
3. **Turnstile:** create a widget for the domain (Managed mode). Keep the site key and the secret for step 5.
4. **Rate limiting** (Security → WAF → Rate limiting rules). Public forms reach the API through the site's server, so the API sees the server's address, not the visitor's: limit on the **site's** host, where the visitor connects.
   - `POST` requests to `www.<domain>` (forms are Server Actions): 30 per minute per IP.
   - `POST /auth/sign-in/magic-link` on `api.<domain>` (the browser calls it directly): 5 per minute per IP.
   - The API also limits per member (10 events and 20 corrections an hour; a new club code every 5 minutes, 8 guesses per claim, ever).
5. Leave **Bot Fight Mode off** on the zone: it can't be skipped for the API, and the calendar feeds are read by calendar apps, not browsers.

**Check:** the zone shows "Active" and SSL/TLS is Full (strict).

## 4. AWS

1. Sign in: `aws login --profile servo`. Confirm the project's region is **us-east-2**: AWS Settings → View all projects → Overview → Additional info → Region.
2. Check the plan and the spend limit in AWS Settings → Billing. Servo runs an always-on RDS database, a Fargate service and a small NAT instance, plus Lambda, CloudFront, S3 and SES by use: estimate it with the AWS Pricing Calculator before the first deploy.
3. **SES:** request production access (SES console → Account dashboard → Request production access). It takes about a day; until then SES only sends to verified addresses.
4. **Bedrock:** in the Bedrock console of us-east-2, turn on model access for Claude Opus 5.5 and Claude Opus 4.8 (the fallback). Without it, pasted flyers go to the crew's inbox instead.
5. **GitHub deploys:** create the deploy role as in [`AWS-GITHUB-OIDC.md`](./AWS-GITHUB-OIDC.md).

**Check:** `aws sts get-caller-identity --profile servo` answers with the project's account.

## 5. Secrets, for each stage (`dev` first, then `production`)

```bash
pnpm sst secret set BetterAuthSecret "$(openssl rand -base64 32)" --stage dev
```

```bash
pnpm sst secret set CrewEmails "you@yourdomain,partner@yourdomain" --stage dev
```

```bash
pnpm sst secret set CrewInbox "crew@yourdomain" --stage dev
```

```bash
pnpm sst secret set TurnstileSiteKey "<site key>" --stage dev
```

```bash
pnpm sst secret set TurnstileSecretKey "<secret>" --stage dev
```

Optional, for "Continue with Google" (Google Cloud console → Credentials → OAuth client ID, web; authorised redirect URI `https://api-dev.<domain>/auth/callback/google`):

```bash
pnpm sst secret set GoogleClientId "<client id>" --stage dev
```

```bash
pnpm sst secret set GoogleClientSecret "<client secret>" --stage dev
```

**Check:** `pnpm sst secret list --stage dev` shows them.

## 6. First deploy, to `dev`

```bash
pnpm sst deploy --stage dev
```

The first deploy takes 15–25 minutes (database, network, certificates). Then:

1. **Load the data once:** run the `Setup` task (seed, FAA census, a first read of every source) from the SST console (`console.sst.dev`, the app's Resources → Setup → Run), or with `aws ecs run-task` using the task definition SST created.
2. **Check:**
   - `https://www-dev.<domain>` loads, and `/events`, `/places` and `/clubs` show data;
   - `https://api-dev.<domain>/health` answers `ok`;
   - signing in at `/sign-in` with a crew address sends an email that arrives, and `/crew` opens;
   - `/places/can-i-fly-here` answers for a point near Miami;
   - in CloudWatch, the `Engine` task's log ends with a `resolve:` line and the `Notify` task's with `notify:`.
3. In `/crew`, approve the RCSignup races and anything else waiting (the engine found 10 Florida races that wait for a person, because RCSignup is a listing, not the organiser).

If CloudFront's certificate is refused (the AWS project only allows us-east-2, and CloudFront certificates live in us-east-1), ask Itaca engineering: the fallback is a Cloudflare origin certificate on the load balancer and the site.

## 7. Production

1. Set the secrets of step 5 with `--stage production` (Google's redirect URI becomes `https://api.<domain>/auth/callback/google`).
2. Merge the pull requests to `main`: the deploy workflow deploys production. Run `Setup` once, as in step 6.
3. **Origin lock:** once everything works, follow "Origin lock" in [`CLOUDFLARE.md`](./CLOUDFLARE.md).
4. **Email reputation:** after two weeks of clean DMARC reports, move DMARC from `p=none` to `p=quarantine`.

## 8. Before you announce it

- Have someone read [`/privacy`](../apps/app/src/app/privacy/page.tsx) and [`/terms`](../apps/app/src/app/terms/page.tsx), ideally a lawyer: they were written in plain language for launch, without legal review.
- Write to the first clubs (AMPS, Markham Park Pilots, Palm Beach RC, the Sarasota clubs): their pages exist already, and claiming them takes a minute (`/organise`).
- Ask DeLand RC and the other Google Calendar clubs for their feeds (C6), and Horizon Hobby and MultiGP for permission to read their calendars (`DECISIONS.md`).
