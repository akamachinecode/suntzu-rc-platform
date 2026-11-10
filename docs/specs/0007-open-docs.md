# 0007 — Open to the community: licence, contributing and a docs portal

- **Status:** Approved 2026-11-10
- **Requested by:** the owner (Alejandro), 2026-11-10
- **Approved by:** the owner, 2026-11-10

## Problem

The repository has been public since 2026-11-09, but nobody outside the crew can really take part. It has no licence, so legally the code is "all rights reserved": people can read it but not copy, change or reuse it, and an outside pull request sits in a legal grey zone. There is no guide to contributing, no way to report a security problem or bad behaviour, and the 70 documents in `docs/` are only readable as loose Markdown files on GitHub. SunTzu RC exists so the hobby can grow with a platform people take part in (`docs/LANDSCAPE.md`). Its own code should be open in the same way.

## Goals

- Anyone may use, change and share the code (MIT), and reuse the guides and figures with credit (CC BY 4.0). The SunTzu RC name and logo stay with the project.
- A newcomer finds out how to run SunTzu RC on their own computer, how to propose a change and what happens to it, without asking anyone.
- All of the project's documentation can be read as one branded website, the SunTzu RC docs portal, which updates itself when the documents change.
- A new architecture guide explains, in plain language, how code goes from a pull request to production: CI, Docker images, deploys, OIDC and the scheduled jobs.

## Out of scope

- **`docs.suntzurc.com`.** The portal starts on `akamachinecode.github.io/suntzu-rc-platform`. A custom domain needs a DNS record in Cloudflare, managed with Terraform in `infra/`. That's a later change for the owner to apply.
- **Translations.** The portal is in English, like `docs/` and the Florida community.
- **Rewriting the existing documents.** They're published as they are. Only what stops them rendering gets fixed.
- **A public email address** for security or conduct reports. That would need inbound email set up; GitHub's private reporting and the site's contact form cover it.
- **Versioned docs, an API reference page** (the API already serves its own at `/docs`), and a contributor licence agreement (MIT in, MIT out).
- **The pending production deploys** that every merge to `main` leaves waiting for approval. Already noted; a separate change.

## User stories

- As someone who found SunTzu RC on GitHub, I want to know what I'm allowed to do with the code, so I can use it or contribute without legal doubt.
- As a developer who wants to help, I want to run the whole platform on my computer in a few minutes, without an AWS account, so I can try my change before proposing it.
- As a contributor, I want to know how to open a pull request, what CI checks and who reviews it and when, so my work isn't lost.
- As anyone, I want to read the documentation as one website with search, so I can understand how SunTzu RC works without browsing Markdown files.
- As someone who found a security flaw, I want to report it privately, so it gets fixed before anyone exploits it.
- As a member of the community, I want to know the rules of behaviour and how to report a problem, so it feels safe to take part.
- As the owner, I want every pull request to ask me for a review automatically, and questions to go to a forum instead of the issues, so nothing slips through.

## Capabilities touched

- **Front door:** one new public website, the docs portal, on GitHub Pages at `akamachinecode.github.io/suntzu-rc-platform`. No new domain, no forms.
- **Processes:** one new GitHub Actions workflow builds and publishes the portal when `main` changes. Nothing new in AWS.
- **Operations:** costs nothing (GitHub Pages and Actions are free for public repositories). A failed publish shows as a red run in Actions; the previous version stays online.
- Identity, data, business systems, AI, clients and physical: not touched.

## Bits

- New: `docs.publish`: a merge to `main` that changes the documents publishes the portal.

## Acceptance criteria

- When someone opens the repository on GitHub, then the sidebar shows the MIT licence, and the README links to the contributing guide, the code of conduct, the security policy and the portal.
- When someone reads the licence section, then it's clear that the code is MIT, the guides and figures are CC BY 4.0 (except third-party material credited where it appears), and the SunTzu RC name and logo are not licensed.
- When someone opens a new issue, then they choose between a bug report form and a link to Discussions for questions and ideas.
- When anyone opens a pull request, then `akamachinecode` is asked to review it automatically.
- When someone finds a security flaw, then `SECURITY.md` sends them to GitHub's private vulnerability reporting, and says what happens next.
- When someone opens the portal, then they see SunTzu RC's colours and Archivo type, a sidebar with every document in `docs/` (system, operations, decisions, specs and bits) and a search box.
- When a document links to a file in the code (for example `infra/jobs.tf`), then the link opens that file on GitHub.
- When a change to `docs/` is merged to `main`, then the portal shows it within about five minutes, without anyone doing anything else.
- When a document in `docs/` can't be rendered, then `pnpm check` fails, so CI catches it before it reaches `main`.
- When a newcomer follows "Run it locally" on a computer with Node, pnpm and Docker, then they see the site with events and places on `localhost`, without any AWS or Cloudflare account.
- When someone reads the architecture guide, then they can tell what GitHub does (checks, builds the images, starts deploys) and what AWS does (stores and runs the images, and starts the scheduled jobs on time), and how OIDC lets GitHub into AWS without stored keys.
- `pnpm check` passes after every slice.

## Slices

- [x] 1. **Licence and community files:** `LICENSE` (MIT), the content and brand notice, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant), `SECURITY.md`, `.github/CODEOWNERS`, issue forms, Discussions turned on, README updated. (blocked by: —)
- [x] 2. **The portal, built locally:** a new `apps/docs` app (Fumadocs on Next.js) with the SunTzu RC theme. It reads `docs/` as it is, links code paths to GitHub, has search, and is built by `pnpm check`. (blocked by: —)
- [x] 3. **Published on GitHub Pages:** a workflow that publishes the portal when `main` changes, Pages turned on, the portal's address on the repository page. (blocked by: 2)
- [x] 4. **New guides in the portal:** a home page, "Run it locally", "Your first contribution" (including with an AI agent), and the architecture guide (CI, deploys, Docker, OIDC, scheduled jobs). (blocked by: 2)

Each slice updates the documents it affects in the same pull request (`AGENTS.md`, `README.md`, `docs/SYSTEM.md`, `docs/GITHUB.md`, `docs/DECISIONS.md`).

## Open questions

- Do the two partners agree with MIT for the code, CC BY 4.0 for guides and figures, and a reserved name and logo? — the owner, with the partners, before slice 1 is merged.
- ~~The name on the licence's copyright line~~ — answered 2026-11-10: "The SunTzu RC authors".

## Needs Itaca engineering

- Nothing blocking: no AWS, DNS, data or accounts. For Itaca engineering to know (recorded in `docs/DECISIONS.md`): a third app, `apps/docs`, and the Fumadocs UI components used only inside it, a deliberate exception to "UI = shadcn/ui" because Fumadocs is built for documentation on the same Next.js, React and Tailwind stack and takes the brand from the shadcn theme variables in `packages/ui`.
