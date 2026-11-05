# Deploy — AWS via SST

Production URL: https://example.com · AWS region `us-east-1` · DNS and proxy in Cloudflare.

Infrastructure is code: [`sst.config.ts`](../sst.config.ts) (SST v4, built on Pulumi). SST keeps its state in the AWS account itself, so anyone with access can deploy from any machine.

**What runs where:** one `sst.config.ts` deploys everything.

| Part       | SST component                         | Production URL                                          | Runs on                                                |
| ---------- | ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `apps/app` | `sst.aws.Nextjs`                      | https://www.example.com (`example.com` redirects there) | AWS Lambda (OpenNext 4) + S3 + CloudFront              |
| `apps/api` | `sst.aws.Service` + `sst.aws.Cluster` | https://api.example.com                                 | Docker container on AWS Fargate behind a load balancer |
| Database   | `sst.aws.Postgres`                    | —                                                       | Amazon RDS for PostgreSQL in private subnets           |
| Network    | `sst.aws.Vpc`                         | —                                                       | private subnets + a small NAT instance                 |

**Domains are required for every stage**, because the app and the API must share a parent domain for the sign-in cookie: production uses `www.` / `api.example.com`, a stage such as `dev` uses `www-dev.` / `api-dev.example.com`. All stages share the cookie domain, so sign in to staging and production in different browser profiles.

**Before the first deploy of a stage**, set the auth secret (once per stage):

```bash
pnpm sst secret set BetterAuthSecret "$(openssl rand -base64 32)" --stage production
```

**Database migrations** run when a new API container starts (`apps/api/src/migrate.ts`), before it accepts traffic. A failed migration stops the new version from starting, and the previous one keeps serving.

**Cost:** unlike a Lambda-only app, this stack has a fixed monthly floor even without users (load balancer, RDS instance, NAT instance and one Fargate task). Remove unused stages with `pnpm sst remove --stage <stage>`.

Known limits for `apps/app` (October 2026): Cache Components aren't supported (disabled in `next.config.ts`), and image optimization (`/_next/image`) has had issues with Next.js 16 — check it after the first deploy ([anomalyco/sst#6867](https://github.com/anomalyco/sst/issues/6867)). OpenNext is pinned with `openNextVersion` in `sst.config.ts`; upgrade it together with Next.js.

**Server secrets:** `pnpm sst secret set <Name> <value> --stage production`, then add the secret to `link` and `environment` of the component that needs it in `sst.config.ts`.

**Origin lock:** the API's load balancer only accepts Cloudflare's IP ranges (fetched from Cloudflare at every deploy), and once `OriginVerifyHeader` is set, it only forwards requests that carry the header and answers 403 to the rest. The app's CloudFront distribution checks the same header. Set the secret per stage, after the Cloudflare transform rule exists (see `CLOUDFLARE.md`).

## How deploys happen

- **Production:** merging to `main` runs [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) → `sst deploy --stage production`.
- **Staging / previews:** `pnpm deploy:staging` from your machine. Non-production stages get a CloudFront URL instead of the domain; remove them with `pnpm sst remove --stage staging`.
- Production is `protect`ed and its resources are `retain`ed, so it can't be deleted by accident.

## One-time setup

1. **AWS account and deploy role:** follow [`AWS-GITHUB-OIDC.md`](./AWS-GITHUB-OIDC.md).
2. **Cloudflare** (see [`CLOUDFLARE.md`](./CLOUDFLARE.md)): the zone for `example.com` must exist in Itaca's Cloudflare account. Create an API token from the **Edit zone DNS** template, restricted to that zone, and copy the account ID.
3. **GitHub environment `production`:**

   ```bash
   gh variable set CLOUDFLARE_ACCOUNT_ID --env production --body "<cloudflare-account-id>"
   gh secret set CLOUDFLARE_API_TOKEN --env production   # paste the token when prompted
   ```

4. **First deploy:** run the **Deploy** workflow from the Actions tab (or push to `main`). The first deploy creates the certificate and DNS records; CloudFront takes ~10 minutes.

### Deploy role permissions

SST creates S3 buckets, CloudFront distributions, Lambda functions, IAM roles, ACM certificates and SSM parameters. In a dedicated AWS account, attach `AdministratorAccess` to the deploy role:

```bash
aws iam attach-role-policy --role-name rc-landing-github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

In a shared account, ask Itaca engineering for a scoped policy instead.

## Deploying from your machine

```bash
aws sso login --profile <profile> && export AWS_PROFILE=<profile>
export CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_DEFAULT_ACCOUNT_ID=<account-id>
pnpm sst diff --stage staging    # preview the changes
pnpm deploy:staging
```

Don't deploy `production` from a laptop except in an emergency — the workflow is the source of truth.

## Upgrading SST

Read the release notes (https://github.com/anomalyco/sst/releases), bump `sst` in `package.json`, then run `pnpm sst diff --stage production` and review it before merging.
