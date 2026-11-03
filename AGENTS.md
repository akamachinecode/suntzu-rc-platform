# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, GitHub Copilot, Codex, Gemini…) working in this repository. Humans: this is also the fastest way to understand the project.

## Project

- **Name:** Servo (working brand name)
- **Stack:** `platform` — Itaca Technologies standard stack (details below)
- **Hosting:** AWS (`sst`) with Cloudflare in front (DNS, CDN, WAF)
- **Code:** GitHub `ITACA-TECHNOLOGIES/rc-landing`
- **Created with:** `create-itaca@0.1.0` (`web-app`) on 2026-10-20, moved to the `platform` stack (create-itaca 0.2.0, unreleased branch) on 2026-10-21 and refreshed to `create-itaca@0.2.3` on 2026-10-27 (see `itaca.json` and `docs/DECISIONS.md`)

This project follows the Itaca standard so that any Itaca engineer can take it over without surprises. Staying inside the standard matters more than any single feature.

## Who you are working with

The person prompting you may not be a developer (sales, operations, a client). So:

- Use plain language and reply in the language they write in. After each change, say what changed and how to see it (`pnpm dev`, then open the local URL).
- Don't ask them to pick libraries, frameworks or architecture — this file already decides. Ask about the business need instead (who uses it, what data, what should happen).
- If something can't be done well inside this stack (see "When to stop"), say so plainly and suggest involving Itaca engineering.

## How we work: pick the right skill first

Before acting on a request, decide what kind it is. If a skill fits, suggest it in one plain sentence (what will happen and why) and wait for a yes. You propose, you don't block: if the person says "just do it", do it and note that in the pull request. Skills live in `.claude/skills/<name>/SKILL.md`; if your tool doesn't load skills by itself, open that file and follow it.

| The request is…                                                           | Do this                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| A question, or "how does X work?"                                         | Answer it. Read `docs/SYSTEM.md` and `docs/bits/` first |
| A small, clear change (a text, a colour, a link)                          | Make it, then `/ship`                                   |
| Something new, or it touches data, users, payments or an external service | `/plan` first                                           |
| Something is broken                                                       | `/fix`                                                  |
| A part of the project nobody has documented, or docs that are out of date | `/document`                                             |
| Someone else's pull request, branch or unfinished work                    | `/takeover`                                             |
| Anything on the "When to stop" list below                                 | Stop and ask Itaca engineering                          |
| The person doesn't know where to start, or asks what they can do          | `/guide`                                                |

Example: "This is a new feature and it touches user data, so I suggest doing it with /plan: I'll ask a few questions, show you the plan on one page and build it in parts once you approve it. Shall we?"

## Documentation

Every Itaca project keeps the same documents, so anyone (a person or an agent) can find their way around. Update them in the same pull request as the change they describe.

| File                                                     | What it holds                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `README.md`                                              | What the project is and how to start it                            |
| `docs/SYSTEM.md`                                         | The map: pieces, where they run, integrations and environments     |
| `docs/bits/`                                             | The catalog of **bits**, one file per bit (see below)              |
| `docs/specs/`                                            | Specifications written with `/plan`, one per feature               |
| `docs/DECISIONS.md`                                      | Why things are the way they are. Read it before every task         |
| `docs/OPERATIONS.md`                                     | Running, deploying, rolling back, access, backups and secret names |
| `docs/DEPLOY.md`, `docs/CLOUDFLARE.md`, `docs/GITHUB.md` | Setup guides for hosting, domain and repository                    |

A **bit** is the smallest piece of behaviour someone can trigger and check end to end: "a visitor sends the contact form", "an owner adds a property". Like a trace in a distributed system, it crosses every layer it touches. When a change creates or modifies a bit, create or update `docs/bits/<id>.md` (copy `docs/bits/_template.md`) and its row in `docs/bits/README.md`.

## Golden rules (non-negotiable)

1. **Keep the stack.** Never add PHP, jQuery, Bootstrap, Vue, Angular, WordPress, loose `<script>` files, another CSS framework, or another package manager. Everything is TypeScript + React + Tailwind CSS + shadcn/ui on the framework below.
2. **pnpm only.** Use `pnpm add <pkg>` / `pnpm add -D <pkg>`. Never run `npm install` or `yarn`, and never commit `package-lock.json` or `yarn.lock`. Don't relax the security settings in `pnpm-workspace.yaml`.
3. **TypeScript only**, strict mode. No new `.js` files, no `any` unless unavoidable (and commented), no `@ts-ignore` to silence errors.
4. **UI = shadcn/ui + Tailwind.** Reuse the shadcn/ui components the project already has (see "Structure" below). Need another? `pnpm dlx shadcn@latest add <component>` (catalog: https://ui.shadcn.com/docs/components — or the `shadcn` MCP server in `.mcp.json`). Style only with Tailwind classes and theme tokens (`bg-primary`, `text-muted-foreground`, `border-border`) — no hex colors in components, no new CSS files. Brand colors and fonts live in the theme CSS variables. Icons come from `lucide-react`.
5. **No secrets in code or in git.** Read configuration from environment variables. Every new variable goes into `.env.example` (name + comment, never the real value). Real values live in `.env` locally (git-ignored) and in the hosting provider for production.
6. **Dependencies are a decision.** Prefer what the stack already includes and the "standard choices" below. Every new package must be justified in `docs/DECISIONS.md`. Packages published less than a day ago and install scripts are blocked on purpose — don't work around it.
7. **Don't touch infrastructure** — deployment files (listed under "Deployment") and `.github/` — unless the user explicitly asks. Those changes affect production.
8. **Accessible and indexable by default:** semantic HTML, one `<h1>` per page, `alt` on images, a `<label>` for every input, keyboard-usable controls, a page `title` and `description`.
9. **Finish every task with `pnpm check`** (format, lint, types, build) and fix what fails. Run `pnpm format` for formatting. Never disable lint rules or type checks to make it pass.
10. **Read and record decisions.** `docs/DECISIONS.md` is the project's memory: read it before starting a task. New dependency, environment variable, external service, data model or route structure change → add a dated entry to it. Itaca engineers read it when they take over.

## Servo project notes

- **Why Servo exists:** three RC enthusiasts want the hobby to grow, with a genuinely useful, free, well-made platform people can take part in. **`docs/LANDSCAPE.md`** has what already exists, what other hobbies teach, and the product principles that follow (free to take part, organisers get something back, visible trust, a path for newcomers). Check new features against those principles.
- **Servo 1.0** is planned in `docs/specs/0001`–`0004` (events, places, community, launch) and summarised in `docs/ROADMAP.md`: build slice by slice and tick each one off in its spec.
- **Read `docs/EVENTS-ENGINE.md`** before working on events, sources or ingestion. The plan: an engine that monitors the web for RC events (Florida first), merges duplicates, verifies them and publishes them; the worker that runs it will live in `apps/api`. **`docs/ROADMAP.md`** is the approved build order (what we index, the community ladder, tracks and milestones): tick items off there as they land.
- **Content** is typed data in `apps/app/src/content/` (services, rules, history, guides). Events and places live in the database now (the engine, the census, the crew and organisers). Every factual item carries a source link; keep it that way and re-check dates before editing.
- **Anatomy figures**: use the project skill in `.claude/skills/anatomy` (read its `SKILL.md`). The kit is vendored in `apps/app/src/components/iso/`; figures live in `apps/app/src/components/figures/<name>/` following `references/react.md`. Light theme only, XT60 yellow is the single lit accent (see `.servo-figure` in `apps/app/src/app/globals.css`). Run the line check before shipping a figure.
- **Versions:** always the latest stable release of every dependency, runtime and service. Apply security and important-fix releases promptly; release candidates and betas don't count. Major upgrades get an entry in `docs/DECISIONS.md` (see 2026-10-22).
- **Forms** (`/contact`, builds on `/community`, `/try`, `/submit`) deliver to the crew's inbox at `/crew` (and by email to `CREW_INBOX`); public ones check Cloudflare Turnstile in production.
- **Accounts** have no passwords (email link or Google). The crew is whoever `CREW_EMAILS` lists. Locally, emails are printed in the API's console (`MAIL_TRANSPORT=log`).
- **Search** (`docs/specs/0005-search.md`): all of it lives in `apps/api/src/search/` (PostgreSQL, no extra service), the screens in `apps/app/src/components/search/` and `/search`. A ranking change must keep the golden searches in `golden.test.ts` at 36 of 36; add a pinned answer in `query.ts` rather than bending the ranking for one search.
- **Going live** is the owner's checklist in `docs/LAUNCH.md`; don't deploy on your own.

## Commands

| Command          | What it does                                                      |
| ---------------- | ----------------------------------------------------------------- |
| `pnpm dev`       | Local development server                                          |
| `pnpm build`     | Production build                                                  |
| `pnpm check`     | Format check + lint + typecheck + tests + build. Must pass        |
| `pnpm format`    | Auto-format every file (Prettier)                                 |
| `pnpm lint`      | ESLint                                                            |
| `pnpm typecheck` | TypeScript type checking                                          |
| `pnpm test`      | Unit tests (Vitest)                                               |
| `pnpm db:seed`   | Load the events engine's starting data into the local database    |
| `pnpm engine`    | Run the events engine once (`pnpm engine <source>` for one)       |
| `pnpm census`    | Load the FAA registers and ZIP codes (`pnpm census fria` for one) |

## Stack: product platform (`platform`)

A pnpm monorepo: one Next.js app (the public site and the signed-in screens) on top of one API, ready for a mobile app. Unlike the standard `platform` stack there is no Astro site (`apps/web`): Servo's public pages are the product (dynamic events, SEO per event, interactive figures), so they live in `apps/app`. Each app and package has its own `AGENTS.md` with its stack, structure and recipes — **read it before changing files there.**

```text
apps/app/             public site + web app: Next.js 16 (App Router), UI only    → https://www.example.com
apps/api/             backend: NestJS — auth, business rules, data            → https://api.example.com
packages/db/          database schema and migrations (PostgreSQL + Drizzle), used only by apps/api
packages/shared/      validation schemas (Zod) and types shared by the API and the apps
packages/api-client/  typed API client, generated from apps/api/openapi.json
packages/ui/          shared shadcn/ui components + theme (brand colors, radius)
```

### Which app?

- **`apps/api`** — every business rule and every piece of data: who can see what, what happens when something is created, payments, emails, scheduled work. A future mobile app will use the same API, so nothing that matters may live only in the web app.
- **`apps/app`** — every screen: the public site (home, guides, events, community) and the signed-in screens (logins, crew console, forms). It reads and writes data only through the API (`getApi()` in `apps/app/src/lib/api.ts`).
- When unsure, ask the user: "Should this also work in a mobile app or for another system?" Yes → the rule goes in `apps/api` and the screen in `apps/app`.

### How a feature is built (end to end)

1. **Schema:** add or change tables in `packages/db/src/schema/`, then `pnpm db:generate` (writes a SQL migration) and `pnpm db:migrate`.
2. **Contract:** add the request/response schemas to `packages/shared`.
3. **API:** add a module in `apps/api/src/<domain>/` (controller + service), copying `apps/api/src/notes/`.
4. **Client:** `pnpm build` regenerates `apps/api/openapi.json` and the typed client. Commit both with the change.
5. **Screen:** add the page in `apps/app/src/app/`, copying `apps/app/src/app/notes/`.

### Monorepo rules

- **Run commands from the repository root.** First time: `pnpm db:up && pnpm db:migrate` (local PostgreSQL in Docker), copy each app's `.env.example` to `.env`. Then `pnpm dev` starts everything (site and app http://localhost:3000, API http://localhost:3001, API docs http://localhost:3001/docs). `pnpm check` checks everything.
- **Dependencies belong to one app or package:** `pnpm --filter @workspace/api add <pkg>` (or `@workspace/app`…). Never `pnpm add` at the root (only shared tooling such as Prettier lives there).
- **UI components live in `packages/ui`** and are shared by every app (a future mobile app uses its own UI kit). Import them as `@workspace/ui/components/<name>`. Add a new one from the app that needs it: `cd apps/app && pnpm dlx shadcn@latest add <component>`.
- **One theme:** brand colors, fonts and radius are CSS variables in `packages/ui/src/styles/globals.css`.
- Never import code from one app into another. Shared code goes into a package under `packages/` — ask Itaca engineering before creating one.
- **The API contract is reviewed like code.** A change to `apps/api/openapi.json` in a pull request means web and mobile clients may need to change too.

## Deployment (AWS via SST)

- Infrastructure lives in `sst.config.ts`; deploys run from `.github/workflows/deploy.yml` when `main` changes. See `docs/DEPLOY.md`.
- Don't edit `sst.config.ts` or the workflows, and don't run `sst deploy` / `sst remove`, unless the user explicitly asks — they change real AWS resources and cost money.
- New environment variables: add them to `.env.example`, and tell the user they must also be configured for production (see `docs/DEPLOY.md`).

## Git & GitHub

- `main` is production: what is merged there gets deployed.
- Work on a branch (`feat/contact-form`, `fix/footer-links`) and open a Pull Request. CI (`.github/workflows/ci.yml`) must be green before merging.
- Commit messages follow Conventional Commits: `feat: add pricing page`, `fix: broken footer link`, `chore: update dependencies`.
- Never commit `.env` files, credentials, `node_modules/` or build output.

## When to stop and ask Itaca engineering

- Payments, personal or sensitive data, user roles and permissions, regulated data (HIPAA, PCI DSS, GDPR, SOC 2 scope).
- Integrations with other company systems (ERP, CRM, identity providers, internal APIs).
- Changes to infrastructure, DNS, domains, AWS or Cloudflare settings.

- **Database structure changes that delete or rename data** (dropping columns or tables, changing types) and anything touching user accounts, sessions or permissions in `apps/api/src/auth`.
- **Background jobs, queues, scheduled tasks, websockets or file uploads:** they need new AWS pieces in `sst.config.ts` — ask Itaca engineering.

Explain to the user why the request needs an engineer, write down what you found in `docs/DECISIONS.md`, and don't improvise a workaround.

<!-- BEGIN AWS Agent Toolkit rules -->

> Added by the AWS Agent Toolkit setup (2026-10-22), from `aws/agent-toolkit-for-aws` `rules/aws-starter-rules.md`. The Servo AWS project runs in **us-east-2** with CLI profile `servo`, and `sst.config.ts` targets it since 2026-10-27 (C1). Deploying is the owner's step, following `docs/LAUNCH.md`; treat the rules above this block as the ones that win.

## AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

### Context

#### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes a managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. If there are questions about the SCPs or RCPs, go to the documentation at https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

#### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions
- When developing:
  - MUST create all Regional resources in the project's assigned Region
  - You CAN create AWS WAF and Cloudwatch Logs resources in us-east-1 when there are global resources (like a global WAF instance) that require a connection to dependencies in us-east-1. You should not use these for any other reason, because resources in the selected Region will provide lower cost (due to no cross-Region traffic), increased availability (due to no cross-Region traffic), and easier manageability (due to not needing to look in another Region). When you need to do an inventory of resources, you need to look in both the selected Region and us-east-1 for Cloudwatch Logs or WAF resources.
  - MUST NOT attempt to create Lambda, API Gateway, or other Regional resources in any other Region
  - MUST direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If the user cannot confirm their Region, check in ~/.aws/config
  - MUST NOT use Lambda@Edge — excluded from both Lambda and CloudFront
  - MUST NOT use CloudFormation StackSets — no multi-account or multi-Region deployments
  - MUST NOT attempt cross-Region actions — no cross-Region replication for DynamoDB/S3/RDS, no multi-Region KMS keys
  - MUST NOT use Route 53 cross-Region routing — geolocation, latency-based, and failover routing policies are not available
  - CloudFront is a global service and its actions ARE allowed in `us-east-1`. A user can create a CloudFront distribution pointing to their project-region Lambda function URL or API Gateway. However, Lambda and API Gateway themselves MUST NOT be created in `us-east-1` — they must be in the project Region.
  - Reduced availability in `eu-north-1` specifically: Amazon Rekognition, Amazon Textract, Amazon Personalize, AWS App Runner are not available in that Region.
- IAM permissions for human access are managed by AWS. Don't assign roles to team members unless absolutely necessary
- The user may have a spend limit if they are on the paid plan. The limit that pauses their project if it's exceeded. If resources suddenly become inaccessible, ask if they have a spend limit configured. Only project owners can modify a spend limit.
- When developing:
  - MUST ask about spend limit status if the user reports sudden "Access Denied" errors on operations that previously worked
  - MUST direct users to check spend status in AWS Settings > Billing
  - MUST check if a user has upgraded their account to the paid plan
  - MUST ask the user if they want to clean up the successfully created resources or keep them to reduce cost
- The user sets up billing, creates spend limits, and retrieves and pays invoices in AWS Settings. The user creates budgets and optimizes their costs in the AWS Billing and Cost Management console
- Not all AWS services are available. If a service isn't working, do the following:
  1. Run the command `aws freetier get-account-plan-state`
  2. If accountPlanType": "FREE", check the [Free Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier) next,
  3. If accountPlanType": "PAID", check the [Paid Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan).
  4. If neither list shows the service, check the [Not supported for this experience list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services). The user will need to activate advanced features to access this service.
- Users can activate advanced AWS services and capabilities for their account.
- Before starting a task, check whether a relevant AWS skill is available. Load the skill with retrieve_skill and prefer its guidance over general knowledge.

#### Help level

- help_level (required): LOW, MEDIUM, or HIGH. While a user is building, you MUST ask the user: "How much guidance would you like from me? Low (I only flag security risks), medium (I ask a couple of clarifying questions if something seems off), or high (I explain what I'm doing, suggest alternatives, and flag best practices)."

You CAN update this rule file to save a user's help_level.

Constraints for each level:

**LOW:**

- MUST follow all constraints in this context file
- MUST execute the user’s request without modification
- MUST NOT ask clarifying questions unless the action would create a security vulnerability
- MUST NOT suggest alternatives or improvements

**MEDIUM:**

- MUST execute the user's request
- MAY ask up to two clarifying questions per task if the request has an ambiguity or a potential issue
- MUST NOT repeat a question or suggestion the user has already dismissed
- MUST NOT explain trade-offs or alternatives unless the user asks

**HIGH:**

- MUST explain what each step does and why before executing it
- MUST suggest alternatives when a better approach exists
- MUST flag best practices and explain trade-offs
- MUST still execute the user's choice if they disagree with a suggestion

<!-- END AWS Agent Toolkit rules -->
