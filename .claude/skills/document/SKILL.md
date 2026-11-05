---
name: document
description: Documents a project, or part of it, by reading the code (read-only) and writing the standard documents - docs/SYSTEM.md, docs/bits/, docs/OPERATIONS.md, decisions inferred from history and known risks - delivered in a pull request. Use for an inherited or undocumented repository, when docs are missing or out of date, or when someone asks how the system works end to end ("document this", "how does this work?", "documenta", "no hay documentación").
---

# Document

Describe what the system really does, and say how sure you are of each part.

## Rules

- **Read only.** Never deploy, run migrations, change data, call production services or edit code. Running the project locally is fine when it needs no real credentials.
- **No secrets.** Never open `.env` files or print credentials. Configuration and secrets are listed by name only.
- **No guessing presented as fact.** Every bit states how it was verified. Unknowns are written as "Unknown — ask <who>".

## Steps

1. **Inventory.** Languages, frameworks, package manager, entry points, pages and routes, API endpoints, scheduled jobs, webhooks, integrations (from SDKs and environment variable names), infrastructure files (IaC, Dockerfiles, CI) and environments.
2. **Map.** Write `docs/SYSTEM.md`: the pieces, where each one runs, how they connect (a small text diagram), integrations, data stores and environments.
3. **Bits.** List the bits from routes, forms, endpoints, jobs and webhooks. For each one, follow its path through the code and write `docs/bits/<area>.<action>.md` from `docs/bits/_template.md`, then add its row to `docs/bits/README.md`. Set its status:
   - `verified`: you ran it and saw the result.
   - `read in code`: you followed it in the code but didn't run it.
   - `not verified`: you couldn't follow it completely.
4. **Operations.** Fill in `docs/OPERATIONS.md`: running locally, deploying, rolling back, who has access, backups, secret names, monitoring, and known risks.
5. **Decisions.** Add entries to `docs/DECISIONS.md` for the important choices you can infer from the code and the git history, marked "(inferred)".
6. **Risks.** List what an engineer should know (single points of failure, manual steps, missing backups, exposed admin areas, outdated dependencies) in the "Known risks" section of `docs/OPERATIONS.md`. Describe them without details that would help someone exploit them.
7. **Deliver.** Open a pull request titled `docs: baseline documentation` (or `docs: <area>` for a part), with a summary of what's verified and what isn't, and deliver it with `/ship`.

If the project predates this structure, create the missing files and folders; keep any existing documentation and link to it instead of duplicating it.
