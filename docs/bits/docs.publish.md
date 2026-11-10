# docs.publish — The docs portal is published

- **Trigger:** a merge to `main` that changes a document (`docs/`, `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `AGENTS.md`), the portal (`apps/docs/`), the theme (`packages/ui/`) or the lockfile; or **Actions → Docs portal → Run workflow**.
- **Who:** maintainers, by merging. Only `main` can publish (the `github-pages` environment's branch rule).
- **Path:** `.github/workflows/docs.yml` → `pnpm --filter @workspace/docs build` with `DOCS_BASE_PATH=/suntzu-rc-platform` → `apps/docs/scripts/content.ts` turns the documents into pages (`scripts/transform.ts`) → Next.js static export to `apps/docs/out/` → `actions/upload-pages-artifact` → `actions/deploy-pages` → https://akamachinecode.github.io/suntzu-rc-platform/.
- **Data:** reads the repository's Markdown documents; writes nothing outside the published site. No secrets, no AWS or Cloudflare access.
- **Rules:** every document needs a `# Title` first line; relative links go to other pages, or to the file on GitHub when it isn't a document; a file in `docs/` that `SECTIONS` doesn't place lands in "More".
- **Errors:** a document that can't become a page fails the build (also in pull requests, through `pnpm check`), and the previous version stays online. The run shows red in **Actions → Docs portal**.
- **Test:** `apps/docs/scripts/transform.test.ts` (links, titles, descriptions); the build itself checks that every page renders.
- **Observe:** the workflow's runs in Actions, and the deployments of the `github-pages` environment. No request logs (GitHub Pages).
- **Status:** read in code — 2026-11-10 (verified once the first publish runs from `main`)
