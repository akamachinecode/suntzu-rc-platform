# From code to production

How a change travels from a pull request to the live site, and who does what on the way: GitHub checks and builds, AWS stores and runs. Written for anyone, developer or not. The details live in [`DEPLOY.md`](./DEPLOY.md), [`TERRAFORM.md`](./TERRAFORM.md), [`AWS-GITHUB-OIDC.md`](./AWS-GITHUB-OIDC.md) and [`GITHUB.md`](./GITHUB.md).

```text
 pull request ──► CI checks ──► review ──► merge to main
                                               │
               ┌───────────────────────────────┼──────────────────────────┐
               ▼                               ▼                          ▼
        Deploy workflow                 Docs portal workflow       (nothing else)
   build Docker images (GitHub)        build the portal (GitHub)
   push them to ECR (AWS)              publish on GitHub Pages
   Terraform applies infra/ (AWS)
   ECS swaps to the new version (AWS)
               │
               ▼
   www.suntzurc.com, api.suntzurc.com
   + scheduled jobs started by AWS on their own clock
```

## The words, first

- **CI (continuous integration):** a robot that checks every change before it reaches `main`. On every pull request GitHub starts a clean Linux machine, installs the project and runs the checks. Red means "don't merge".
- **CD (continuous delivery):** a robot that publishes what's on `main`. Here, merging to `main` starts the deploy.
- **GitHub Actions:** the GitHub feature that runs both robots. Each robot is a YAML file in [`.github/workflows/`](../.github/workflows), called a **workflow**; each workflow has **jobs**, and each job runs **steps** on a fresh machine (a **runner**).
- **Environment:** a whole running copy of SunTzu RC (its site, API, database and members). We have three: **local** (your computer), **staging** (`www-staging.suntzurc.com`, for trying things on real AWS) and **production** (`www.suntzurc.com`). On GitHub, an environment is also a named target with its own settings and rules (`production` needs the owner's approval).
- **Docker image:** a sealed package of an app together with everything it needs to run (Node, libraries, the built code). It runs the same on any machine.
- **Terraform:** the tool that creates and changes the AWS pieces (network, database, servers, alarms) from the files in [`infra/`](../infra). It compares the files with what exists and changes only the difference.

## 1. Checks on every pull request (CI)

[`ci.yml`](../.github/workflows/ci.yml) runs three jobs at the same time, in about two minutes:

| Job                            | What it does                                                                                                        | Blocks the merge |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Format, lint, typecheck, build | `pnpm check`: formatting, lint, TypeScript, every test and a full build of the API, the site and the portal         | yes              |
| Secret scan                    | TruffleHog looks for passwords or keys committed by mistake, in the whole history                                   | yes              |
| Dependency audit               | `pnpm audit`: are any of the libraries we use known to be vulnerable? (it reads published advisories, not our code) | no               |

[`infra.yml`](../.github/workflows/infra.yml) adds one more job when a pull request touches `infra/`: `terraform fmt` and `terraform validate`, without any access to AWS.

GitHub also runs, on its own and outside these files:

- **CodeQL** analyses our code for security flaws, on every pull request and once a week.
- **Dependabot** watches our libraries ([`.github/dependabot.yml`](../.github/dependabot.yml)): it opens pull requests with updates (npm weekly, GitHub Actions monthly, Terraform weekly, never versions younger than 7 days) and alerts when one is vulnerable.

`main` only accepts changes through pull requests, and the two blocking checks must be green ([`GITHUB.md`](./GITHUB.md), step 2). Pull requests from forks run CI without any of the project's secrets, so outside code never touches our servers.

## 2. The deploy (CD)

[`deploy.yml`](../.github/workflows/deploy.yml) starts when something is merged to `main` (production, after the owner approves it) or by hand from **Actions → Deploy** (staging). One job, step by step:

1. **Get into AWS** with OIDC (section 3): short-lived credentials, no stored keys.
2. **Read the stage's public settings:** the hostnames from `infra/<stage>.tfvars.json`, and two optional values from AWS Parameter Store (the Turnstile site key, whether Google sign-in is on).
3. **Build two Docker images** on GitHub's machine, following [`apps/app/Dockerfile`](../apps/app/Dockerfile) (the site) and [`apps/api/Dockerfile`](../apps/api/Dockerfile) (the API). The site's public settings are baked into its image, so each stage gets its own. Docker's cache makes rebuilds fast.
4. **Push them to ECR**, AWS's image registry, tagged with the stage and the commit (`staging-1f7781b…`). Tags can't be overwritten; re-running a deploy reuses the images it already pushed.
5. **Apply Terraform:** `terraform plan`, written into the run's summary so anyone can read what changes, then `terraform apply`. On a normal deploy the main change is "the services now run the image with this new tag".
6. **ECS swaps versions.** ECS Fargate (AWS's service that runs containers without us managing servers) starts the new version next to the old one. Only when the new one answers its health check does traffic move and the old one stop. If it never becomes healthy, ECS rolls back to the previous version by itself (the deployment circuit breaker in [`infra/modules/service`](../infra/modules/service)).
7. **Check:** the last step asks ECS which version is really running. If ECS had to roll back, the deploy turns red and points to the logs.

When the API starts, it applies any pending database migrations first, then serves requests.

GitHub never copies code onto a server: it leaves images in ECR and tells AWS which one to run. To undo a change, revert it on `main` and let the deploy run again ([`OPERATIONS.md`](./OPERATIONS.md)).

## 3. How GitHub gets into AWS: OIDC

The old way was to store a permanent AWS access key in GitHub. If it leaked, someone had the AWS account until anybody noticed. SunTzu RC stores no key at all. OIDC (OpenID Connect) works like a single-use ID card:

1. **Once**, when the account was set up ([`infra/bootstrap`](../infra/bootstrap)), AWS was told to trust the ID cards that GitHub signs (`token.actions.githubusercontent.com`), and a role, `rc-landing-github-deploy`, was created with one condition: only this repository, and only from its `production` or `staging` environment, may use it.
2. When a deploy starts, GitHub hands the workflow a signed token that says, in effect, "I am a workflow of `akamachinecode/suntzu-rc-platform`, running in the `staging` environment".
3. The workflow shows that token to AWS (STS). AWS checks GitHub's signature and that the repository and environment match the role's condition.
4. If everything matches, AWS returns credentials that **expire within the hour**. When the run ends they're useless.

That's why a pull request from a fork can't deploy: it doesn't run in either environment, so AWS refuses it. And `production` needs the owner's approval on GitHub before the workflow even asks. Step-by-step setup: [`AWS-GITHUB-OIDC.md`](./AWS-GITHUB-OIDC.md).

## 4. The scheduled jobs: AWS's own clock

Some work runs on its own, without anyone pressing a button. It's defined in [`infra/jobs.tf`](../infra/jobs.tf) (times in Florida):

| Job        | When                            | What it does                                                                      |
| ---------- | ------------------------------- | --------------------------------------------------------------------------------- |
| **engine** | 4 times a day (5, 11, 17, 23 h) | Reads every active source, merges duplicates and publishes events                 |
| **notify** | Every hour, at quarter past     | Change alerts; inside it, the weekly digest (Thursday) and club reports (the 1st) |
| **census** | Once a month (the 2nd, 4 h)     | Reloads the FAA registers and Census ZIP codes                                    |
| **setup**  | Only by hand, once per stage    | The starting data, the census and a first read of every source                    |

**GitHub doesn't run them.** Everything happens inside AWS:

1. **EventBridge Scheduler**, AWS's clock, reaches the time.
2. It asks ECS Fargate to start a container **from the same image as the API**, with a different command (`node dist/engine.js` instead of the server).
3. The container does its work, writes to the database and stops. We only pay for those minutes.
4. If it fails, an EventBridge rule sends a warning alert ([`OPERATIONS.md`](./OPERATIONS.md), "job failed"), and the job runs again at its next time.

GitHub's only part is a button: [`task.yml`](../.github/workflows/task.yml) (**Actions → Run a task**) asks AWS to start one of these jobs now and waits to see whether it finishes well.

**Are the jobs checked?** Yes, when their code changes, not when they run. Their code is part of the API ([`apps/api/src/engine.ts`](../apps/api/src/engine.ts), `notify.ts`, `census.ts`) and ships in the same image, so every change to them goes through a pull request with CI, CodeQL and Dependabot like any other. At 5 in the morning, AWS starts the image that was last deployed, which already passed all of that.

## 5. The docs portal

[`docs.yml`](../.github/workflows/docs.yml) builds this portal ([`apps/docs`](../apps/docs)) from the repository's own documents whenever one changes on `main`, and publishes it on GitHub Pages. It needs no AWS or Cloudflare access. A document that can't be published already fails `pnpm check` in its pull request.

## 6. What it costs

- **GitHub Actions minutes are free** for public repositories, with no limit. SunTzu RC uses about 700–900 minutes a month during busy development (a CI run bills about 4 minutes, a deploy 8–16), which would also fit GitHub Free's 2,000 minutes if the repository were private.
- Dependabot, CodeQL, secret scanning and GitHub Pages are free for public repositories too.
- The real cost is AWS: the servers, the database and the network that run each stage ([`DEPLOY.md`](./DEPLOY.md)). Production has a budget alarm at 150 USD a month.
