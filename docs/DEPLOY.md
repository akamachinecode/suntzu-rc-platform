# Deploy — AWS via Terraform

Production URL: https://www.example.com · AWS region `us-east-2` (the AWS project's only region) · DNS and proxy in Cloudflare.

Infrastructure is code: [`infra/`](../infra), explained in [`TERRAFORM.md`](./TERRAFORM.md). Nothing is deployed yet: going live is the owner's checklist in [`LAUNCH.md`](./LAUNCH.md).

**What runs where:** `infra/` deploys everything, behind Cloudflare, in `us-east-2` only (no CloudFront, so nothing in us-east-1).

| Part           | Production URL                                          | Runs on                                                                                          | Terraform              |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------- |
| `apps/app`     | https://www.example.com (`example.com` redirects there) | Next.js standalone server in a Docker container on AWS Fargate                                   | `infra/main.tf`        |
| `apps/api`     | https://api.example.com                                 | NestJS in a Docker container on AWS Fargate                                                      | `infra/main.tf`        |
| Scheduled jobs | —                                                       | the API's image on Fargate, started by EventBridge Scheduler: engine, notify, census (and setup) | `infra/jobs.tf`        |
| Database       | —                                                       | Amazon RDS for PostgreSQL 18 in private subnets, reachable only from the API and the jobs        | `infra/main.tf`        |
| Email          | —                                                       | Amazon SES, sending from `example.com` (staging: `staging.example.com`) with DKIM in Cloudflare  | `infra/email.tf`       |
| Snapshots      | —                                                       | a private S3 bucket with the raw pages and feeds the engine reads                                | `infra/storage.tf`     |
| Network        | —                                                       | one VPC; the app and the API share a load balancer that accepts only Cloudflare                  | `infra/modules/`       |
| Permissions    | —                                                       | the API and the jobs may use the snapshots bucket, SES and Claude on Bedrock, and nothing else   | `infra/permissions.tf` |

Images are stored in Amazon ECR (`rc-landing-app`, `rc-landing-api`) and logs go to CloudWatch (`/ecs/rc-landing-<stage>/<app|api|engine|notify|census|setup>`, 30 days).

**Domains are required for every stage**, because the app and the API must share a parent domain for the sign-in cookie (`cookie_domain` in `infra/<stage>.tfvars.json`): production uses `www.` / `api.example.com`, staging uses `www-staging.` / `api-staging.example.com`. All stages share the cookie domain, so sign in to staging and production in different browser profiles.

**Database migrations** run when a new API container starts (`apps/api/src/migrate.ts`), before it accepts traffic. A failed migration stops the new version from starting, the previous one keeps serving, and the deploy fails.

**Scheduled jobs** (times in Florida): the engine at 5:00, 11:00, 17:00 and 23:00; notify every hour at :15 (the digest on Thursdays and club reports on the 1st run inside it); the census at 4:00 on the 2nd of each month. Each one runs the image deployed at that moment. `setup` has no schedule: run it by hand (below).

**Running a job by hand:** **Actions → Run a task → Run workflow**, pick the stage and the task (`setup`, `engine`, `notify` or `census`). It runs with the version deployed now, waits for it to finish and fails if the task fails.

**Email:** each stage sends from its own domain (`email` in `infra/<stage>.tfvars.json`: production `example.com`, staging `staging.example.com`), with its own SES identity and DKIM and DMARC records in Cloudflare. Until SES production access is granted ([`LAUNCH.md`](./LAUNCH.md)), SES only sends to verified addresses.

**Cost:** each stage has a fixed floor even without users: the load balancer, the RDS instance, the app and API containers and their public IPs (roughly 75 USD a month), plus the jobs, SES, S3 and Bedrock by use. Delete stages you don't use.

**More than one app container:** each container keeps its own page cache. Before raising the count, ask Itaca engineering to add a shared cache handler.

## How deploys happen

- **Production:** merging to `main` runs [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml): it builds both images, runs `terraform apply` on `infra/` with `infra/production.tfvars.json`, then checks the new version is running. The plan is in the run's summary.
- **Staging:** **Actions → Deploy → Run workflow** with stage `staging` (`infra/staging.tfvars.json` comes with the project). Other stages: see "Adding a stage" in [`TERRAFORM.md`](./TERRAFORM.md).
- **Production is protected:** the database and the load balancer refuse deletion, a deleted database leaves a final snapshot, and the snapshots bucket is never emptied.
- **Rollback:** revert the commit on `main`. A container that never passes its health check is rolled back automatically, and the run fails with a link to its logs.

## One-time setup

1. **AWS account:** state bucket, deploy role and container registries, steps 1 and 2 of [`TERRAFORM.md`](./TERRAFORM.md).
2. **Cloudflare:** the zone for `example.com` must exist in Itaca's Cloudflare account (see [`CLOUDFLARE.md`](./CLOUDFLARE.md)). Create an account-owned API token with **Zone → Zone → Read** and **Zone → DNS → Edit**, restricted to that zone.
3. **GitHub environments `production` and `staging`** (the same for both, with `--env staging`):

   ```bash
   gh api -X PUT repos/akamachinecode/rc-landing/environments/production
   gh variable set AWS_DEPLOY_ROLE_ARN --env production --body "$(terraform -chdir=infra/bootstrap output -raw deploy_role_arn)"
   gh secret set CLOUDFLARE_API_TOKEN --env production   # paste the token when prompted
   ```

   Optional: in **Settings → Environments → production**, add required reviewers so every production deploy needs an approval.

4. **Settings and secrets** of the stage, below.
5. **First deploy:** run **Actions → Deploy → Run workflow** (or push to `main`). The first deploy creates the certificates, the DNS records and every AWS resource; RDS takes about 10 minutes. If a hostname already has a DNS record in Cloudflare (an old site, for example), delete it first: Terraform won't overwrite records it didn't create. Then run the `setup` task once (**Actions → Run a task**).

## Secrets and configuration

Secrets live in AWS Systems Manager Parameter Store, under `/rc-landing/<stage>/`. Containers read them when they start, so they never appear in the code, the images or the task definitions.

- **Created by Terraform:** `database-url`, `better-auth-secret` and `origin-verify-header` (starts as `off`, see [`CLOUDFLARE.md`](./CLOUDFLARE.md)). These values are also in Terraform's state.
- **Optional, set by you** (`infra/secrets.tf`): each one turns a feature on once it exists, from the next deploy. Their values never pass through Terraform.

  | Parameter              | Type           | Turns on                                                          |
  | ---------------------- | -------------- | ----------------------------------------------------------------- |
  | `crew-emails`          | `SecureString` | the crew role for these comma-separated emails (`CREW_EMAILS`)    |
  | `crew-inbox`           | `SecureString` | email to the crew about new messages and try-it requests          |
  | `turnstile-secret-key` | `SecureString` | Cloudflare Turnstile checks on public forms (the API side)        |
  | `turnstile-site-key`   | `String`       | the Turnstile widget on public forms (public, baked into the app) |
  | `google-client-id`     | `SecureString` | "Continue with Google" (its existence shows the button)           |
  | `google-client-secret` | `SecureString` | "Continue with Google" (the API side)                             |

  ```bash
  aws ssm put-parameter --type SecureString --name /rc-landing/production/crew-emails --value 'ana@example.com,ben@example.com'
  ```

  A new parameter reaches the API at the next deploy. To change the value of one that already exists, add `--overwrite`, then restart the API so it reads it (the jobs read it at their next run):

  ```bash
  aws ecs update-service --cluster rc-landing-production --service api --force-new-deployment
  ```

  The two public values (`turnstile-site-key`, and whether `google-client-id` exists) are baked into the app image when it is built, so they take effect with the next commit deployed.

- **A new secret** (an API key, for example): create it the same way, add it to `optional_secrets` in `infra/secrets.tf` (or `secrets` of the service in `infra/main.tf`), and deploy.
- **Public values** (`NEXT_PUBLIC_*`) are baked into the app image at build time, from the hostnames in `infra/<stage>.tfvars.json` and the two optional public settings above.
