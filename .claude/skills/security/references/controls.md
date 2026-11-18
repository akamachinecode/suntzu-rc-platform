# Security controls

P0 blocks a release. P1 is how the project is built and run. P2 depends on the feature. Standards: OWASP ASVS 5.0 chapter (V), OWASP API Security Top 10 2023 (API). IDs follow secdev's checklist so findings can be compared across tools.

## P0: blocks release

| ID | Control | How to verify in this stack | Standard |
|----|---------|-----------------------------|----------|
| P0-01 | **Secure authentication** | Better Auth (or another identity provider), never hand-made password handling; passwords of 12+ characters; reset links single-use and short-lived; sign-in errors don't reveal whether an email exists; staff accounts with MFA; re-authentication before changing email or password, deleting the account or paying. | V6, V7 |
| P0-02 | **Authorization on the server, on every request** | Identity comes from the verified session (`@CurrentUser()`, `auth.api.getSession`), never from a header, query or body field (`userId`, `role`). API routes deny by default (`AuthGuard`; `@Public()` only for what anyone may call). Server Actions check the user inside the action. Hiding a button or a page (`proxy.ts`) is not authorization. | V8, API1, API5 |
| P0-03 | **Data isolation between users and customers** | Every query on someone's data is scoped to the caller (`eq(table.ownerId, user.id)`) and a foreign ID answers 404; writes accept an allowlist of fields (a Zod schema), so nobody sets their own `ownerId` or `role` (mass assignment). | V8.2, API1, API3 |
| P0-04 | **Protected secrets** | Nothing privileged in the browser, the repository or its history: search `sk_live`, `-----BEGIN`, `AKIA`, `password=` (also `git log -p -G '<pattern>'`). Secrets are read from validated env files (`env.ts`), server-only; `NEXT_PUBLIC_*`/`PUBLIC_*` are public; `.env` is git-ignored; a committed key counts as leaked until rotated. CI runs TruffleHog. | V13.3, V14 |
| P0-05 | **Input validated on the server; no injection or XSS** | A Zod schema on every input (`ZodPipe`, `safeParse` in Server Actions); Drizzle query builder or parameterized SQL, never string-built SQL; React escaping kept (no `dangerouslySetInnerHTML` or `set:html` with outside data); no `eval`. No hidden Unicode in code. | V1, V2.2 |
| P0-06 | **Secure sessions** | Sessions expire and can be revoked (stored in the database); sign-out and password changes end them; cookies `HttpOnly`, `Secure` in production, `SameSite`; tokens never in `localStorage` or URLs. | V7, V3.3 |
| P0-07 | **HTTPS only** | Cloudflare and the load balancer or CDN redirect HTTP to HTTPS; HSTS header; no `http://` to our own services in production config. | V12 |
| P0-08 | **Abuse protection** | Rate limits on sign-in, sign-up, password reset and expensive or public endpoints (Cloudflare rules, Better Auth rate limit); bots on public forms (Turnstile); spending caps on paid APIs and AI. The client IP comes from the trusted proxy (`CF-Connecting-IP`), never a client-set `X-Forwarded-For`. | V2.4, V6.3, API4, API6 |
| P0-09 | **Protected database** | Not reachable from the internet; its own credentials per environment, from SSM; least privilege; encrypted. | V13.2, API8 |
| P0-10 | **Least-privilege infrastructure** | Deploys use GitHub OIDC roles limited to this project (no long-lived AWS keys); no `*` IAM policies beyond what a module needs; MFA on AWS, Cloudflare and GitHub accounts (`UNVERIFIED` from code). | V13.2 |
| P0-11 | **Separate environments, no real data in development** | Separate stages; seeds and tests use made-up data; no test-only routes or users in production. | V15.2 |
| P0-12 | **Secure configuration** | No debug output or stack traces in production responses; generic error messages; CORS limited to our own origins with credentials; security headers (HSTS, `X-Content-Type-Options`, `frame-ancestors`/`X-Frame-Options`, a CSP where possible); no public source maps; no tokens or personal data in URLs or logs. | V13.4, V14.2, V16.5, V3.4, API8 |
| P0-13 | **CSRF and SSRF** | Cookie sessions only accept mutations from our origin (Server Actions and Better Auth check it; `trustedOrigins`, CORS); outbound requests to URLs that come from users go through an allowlist, never to internal addresses or `169.254.169.254`. | V3.5, V1.3, API7 |
| P0-14 | **Protected files** | Uploads: an allowlist of types checked against the content, size limits, private storage per user, short-lived signed URLs; archives checked before extracting. | V5, API4 |
| P0-15 | **Authorization tests** | For each sensitive resource, an end-to-end test where "another user" and "signed out" (and "lower role", when there are roles) are refused, written to fail without the check. | V8, API1, API5 |
| P0-16 | **Minimal supply chain** | Lockfile committed; `pnpm audit` with no open high or critical advisory (or a written, dated exception in `pnpm-workspace.yaml`); install scripts blocked unless reviewed; versions at least a day old; actions pinned by SHA. | V15.2 |

## P1: building and running

| ID | Control | How to verify | Standard |
|----|---------|---------------|----------|
| P1-01 | **Protected repository** | `main` protected by the ruleset in `docs/GITHUB.md`; code owners review the checks (`.github/CODEOWNERS`); MFA on GitHub (`UNVERIFIED` from code). | — |
| P1-02 | **Automated analysis** | CI runs secrets (TruffleHog), dependencies (`pnpm audit`) and static analysis (Semgrep); findings aren't silenced in bulk. | V15.2 |
| P1-03 | **Current dependencies and runtime** | Dependabot on; Node version still supported; unused packages removed. | V15.1, V15.2 |
| P1-04 | **Controlled deployments** | Deploys only from CI; scripted rollback in `docs/OPERATIONS.md`. | — |
| P1-05 | **Logs and audit trail** | Sign-in failures, denied access and permission changes are logged; logs never contain passwords, tokens or personal data beyond an ID. | V16.2, V16.3 |
| P1-06 | **Monitoring and alerts** | Alarms with runbooks and someone to alert (platform stacks); budget alerts (`UNVERIFIED` from code). | V16.4 |
| P1-07 | **Backups with a tested restore** | Automatic, encrypted backups with deletion protection; a dated restore test in `docs/OPERATIONS.md`. | — |
| P1-08 | **Incident response** | `docs/OPERATIONS.md` says who to call; a leaked secret is rotated first, then the provider's logs checked, then the history cleaned; GDPR breaches reported within 72 hours. | — |
| P1-09 | **Periodic reviews** | Date of the last full security audit and access review in `docs/OPERATIONS.md` ("Security reviews"). | — |
| P1-10 | **Hardened CI/CD** | Code from pull requests never runs with secrets or a write token: `pull_request`, not `pull_request_target`; `permissions: contents: read` by default; actions pinned by SHA; `persist-credentials: false`; deploy secrets only in protected environments. | V15.2 |

## P2: depends on the feature

| ID | Control | When | How to verify | Standard |
|----|---------|------|---------------|----------|
| P2-01 | **Mobile app** | When `apps/mobile` exists | Tokens in secure storage, never plain storage; signed builds and updates. Ask Itaca engineering for the full mobile checklist (OWASP MASVS). | MASVS |
| P2-02 | **Payments** | Payments | The amount comes from the server; webhooks verify the signature on the raw body; idempotency keys; a repeated event has no double effect. Always "stop and ask" (AGENTS.md). | V2.3, API6, API10 |
| P2-03 | **Personal data and GDPR** | Personal data | What is stored and why is written down; deletion reaches backups; retention period; no trackers before consent; extra care (DPIA) for health data or minors. | V14, V11.3 |
| P2-04 | **AI and LLM features** | LLM calls or agents | Outside content is data, not instructions (prompt injection); tools with the least permissions; token and spending caps; output validated before acting on it. | API10 |
| P2-05 | **External integrations** | Third-party APIs or webhooks | Webhook signatures checked; minimal scopes; timeouts; responses validated. | V10, API10 |
| P2-06 | **Secure design** | A new feature | Design mode ran: controls and abuse cases are in the spec before the code. | V15.1, V2.1 |
| P2-08 | **Containers** | A `Dockerfile` | Runs as a non-root `USER`; pinned base image; no secrets in `ENV`, `ARG` or copied files; `.dockerignore` excludes `.env` and `.git`. | — |
