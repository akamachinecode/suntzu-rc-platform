# GitHub

Repository: `ITACA-TECHNOLOGIES/rc-landing` (private).

## 1. Create the repository (if `create-itaca` didn't)

```bash
gh auth login
gh repo create ITACA-TECHNOLOGIES/rc-landing --private --source . --remote origin --push
```

## 2. Protect `main`

`main` is production. Require Pull Requests and a green CI before merging:

```bash
gh api -X POST repos/ITACA-TECHNOLOGIES/rc-landing/rulesets --input - <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": { "required_approving_review_count": 0, "dismiss_stale_reviews_on_push": true, "require_code_owner_review": false, "require_last_push_approval": false, "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": { "strict_required_status_checks_policy": false, "required_status_checks": [{ "context": "Format, lint, typecheck, build" }, { "context": "Secret scan" }] } }
  ]
}
JSON
```

Raise `required_approving_review_count` to `1` once an Itaca engineer is assigned to the project.

## 3. Security features

In **Settings → Advanced Security** (or `Code security`):

- Dependabot alerts and Dependabot security updates: **on** (version updates are configured in `.github/dependabot.yml`).
- Secret scanning and push protection: **on** where the plan allows it. CI also runs TruffleHog on every push.
- Code scanning (CodeQL) default setup: **on** where the plan allows it.

## 4. Deployment secrets and variables

Deploys use the GitHub environment `production` (see [`DEPLOY.md`](./DEPLOY.md)):

| Name                    | Type     | Value                                                     |
| ----------------------- | -------- | --------------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN`   | variable | IAM role assumed via OIDC ([guide](./AWS-GITHUB-OIDC.md)) |
| `CLOUDFLARE_ACCOUNT_ID` | variable | Cloudflare account that owns the DNS zone                 |
| `CLOUDFLARE_API_TOKEN`  | secret   | Token with DNS edit permission on the zone                |

## CI

`.github/workflows/ci.yml` runs on every Pull Request and push to `main`:

| Job                            | Blocks merge | What it does                                      |
| ------------------------------ | ------------ | ------------------------------------------------- |
| Format, lint, typecheck, build | yes          | `pnpm install --frozen-lockfile` and `pnpm check` |
| Secret scan                    | yes          | TruffleHog over the git history                   |
| Dependency audit               | no           | `pnpm audit --prod --audit-level high`            |
