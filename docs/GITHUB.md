# GitHub

Repository: `akamachinecode/suntzu-rc-platform` (renamed from `rc-landing`; **public** since 2026-11-09, so the ruleset, environment protection and security features below are on), in the owner's personal GitHub account rather than the Itaca organisation (`DECISIONS.md`, 2026-10-29 and 2026-11-09).

## 1. Create the repository (if `create-itaca` didn't)

```bash
gh auth login
gh repo create akamachinecode/rc-landing --private --source . --remote origin --push
```

## 2. Protect `main`

`main` is production. Require Pull Requests and a green CI before merging. In a personal account, rulesets on a private repository need **GitHub Pro**; on GitHub Free the call below answers 403 and `main` stays unprotected. Applied on 2026-11-09, when the repository went public.

```bash
gh api -X POST repos/akamachinecode/suntzu-rc-platform/rulesets --input - <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": { "required_approving_review_count": 0, "dismiss_stale_reviews_on_push": true, "require_code_owner_review": false, "require_last_push_approval": false, "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": { "strict_required_status_checks_policy": false, "required_status_checks": [{ "context": "Format, lint, typecheck, build" }, { "context": "End-to-end tests" }, { "context": "Static analysis" }, { "context": "Secret scan" }] } }
  ]
}
JSON
```

**After spec 0011 (create-itaca 0.5.1) is merged**, the existing ruleset (ID `26865524`) should also require "End-to-end tests" and "Static analysis", as above. That's a repository setting, so it's the owner's step: the same JSON with `gh api -X PUT repos/akamachinecode/suntzu-rc-platform/rulesets/26865524 --input -`. Consider "Accessibility (axe in four browsers)" too.

Raise `required_approving_review_count` to `1` once an Itaca engineer is assigned to the project.

**Code owners.** `.github/CODEOWNERS` names who reviews the files that judge or deploy every change: `.claude/` (the agents' skills and hooks), `REVIEW.md`, `docs/CHECKS.md`, `.github/`, `infra/`, `pnpm-workspace.yaml` and `.semgrepignore`. The template gives them to `@ITACA-TECHNOLOGIES/engineering`; this repository is in the owner's personal account, so they're the owner's. `require_code_owner_review` stays **off** on purpose: GitHub never counts the author's own approval, and the owner (or an agent working as the owner) opens most pull requests, so turning it on would block them. Turn it on when a second maintainer or an Itaca engineer joins (`docs/DECISIONS.md`, 2026-11-18).

## 3. Security features

In **Settings → Advanced Security** (or `Code security`):

- Dependabot alerts and Dependabot security updates: **on** (version updates are configured in `.github/dependabot.yml`).
- Secret scanning and push protection: **on** where the plan allows it. CI also runs TruffleHog on every push.
- Code scanning (CodeQL) default setup: **on** where the plan allows it.
- Private vulnerability reporting: **on**. `SECURITY.md` sends reporters there.

## 4. Community (spec 0007)

Set up on 2026-11-10 so anyone can take part (`CONTRIBUTING.md`):

- **Licence:** `LICENSE` (MIT); GitHub shows it in the sidebar. Content and brand terms are in the README, "Licence".
- **Discussions: on**, for questions and ideas (`gh api -X PATCH repos/akamachinecode/suntzu-rc-platform -F has_discussions=true`). Issues are for bugs.
- **Issue forms:** `.github/ISSUE_TEMPLATE/` has the bug report; blank issues are off, and questions and security reports are sent to Discussions and private reporting.
- **Reviewers:** `.github/CODEOWNERS` asks `akamachinecode` to review every pull request. It doesn't block merging (`require_code_owner_review` is off in the ruleset).
- **Reported content:** in **Settings → Moderation options → Reported content**, accept reports from everyone, so the code of conduct's "Report to repository admins" reaches the maintainers. There's no API for it: set it by hand.

## 5. Docs portal on GitHub Pages (spec 0007)

Turned on 2026-11-10: **Settings → Pages → Source: GitHub Actions** (`gh api -X POST repos/akamachinecode/suntzu-rc-platform/pages -f build_type=workflow`). That also created the **`github-pages`** environment, which only `main` can deploy. `.github/workflows/docs.yml` builds `apps/docs` and publishes it at https://akamachinecode.github.io/suntzu-rc-platform/. The repository's **About → Website** points there.

## 6. Deployment secrets and variables

Deploys use one GitHub environment per stage: `production` and `staging` (see [`DEPLOY.md`](./DEPLOY.md)):

| Name                   | Type     | Value                                                                                  |
| ---------------------- | -------- | -------------------------------------------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN`  | variable | IAM role assumed via OIDC, output of `infra/bootstrap` ([guide](./AWS-GITHUB-OIDC.md)) |
| `CLOUDFLARE_API_TOKEN` | secret   | Token with Zone Read and DNS Edit on the zone                                          |

## CI

`.github/workflows/ci.yml` runs on every Pull Request and push to `main`:

| Job                            | Blocks merge | What it does                                                                                                |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------- |
| Format, lint, typecheck, build | yes          | `pnpm install --frozen-lockfile` and `pnpm check` (also the bits check and unit tests)                      |
| End-to-end tests               | yes          | `pnpm test:e2e`: one Playwright test per bit, in Chromium                                                   |
| Accessibility                  | no (yet)     | `pnpm test:a11y` in four browsers                                                                           |
| Secret scan                    | yes          | TruffleHog over the git history                                                                             |
| Static analysis                | yes          | Semgrep CE (`p/default`); fix the finding, or mark a false positive with `nosemgrep: <rule>` and the reason |
| Verification stamps            | no           | Lists each commit's `Verified-by:` trailer (how it was verified) in the run summary                         |
| Dependency audit               | no           | `pnpm audit --prod --audit-level high`                                                                      |
