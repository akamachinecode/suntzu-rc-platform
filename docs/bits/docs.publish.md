# docs.publish — The docs portal is published

- **Trigger:** a merge to `main` that changes a document (`docs/`, `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `AGENTS.md`), the portal (`apps/docs/`), the theme (`packages/ui/`) or the lockfile; or **Actions → Docs portal → Run workflow**.
- **Who:** maintainers, by merging. Only `main` can publish (the `github-pages` environment's branch rule).
- **Path:** `.github/workflows/docs.yml` → `pnpm --filter @workspace/docs build` with `DOCS_BASE_PATH=/suntzu-rc-platform` → `apps/docs/scripts/content.ts` turns the documents into pages (`scripts/transform.ts`) → Next.js static export to `apps/docs/out/` → `actions/upload-pages-artifact` → `actions/deploy-pages` → https://akamachinecode.github.io/suntzu-rc-platform/.
- **Data:** reads the repository's Markdown documents; writes nothing outside the published site. No secrets, no AWS or Cloudflare access.
- **Rules:** every document needs a `# Title` first line; relative links go to other pages, or to the file on GitHub when it isn't a document; a file in `docs/` that `SECTIONS` doesn't place lands in "More".
- **Errors:** a document that can't become a page fails the build (also in pull requests, through `pnpm check`), and the previous version stays online. The run shows red in **Actions → Docs portal**.
- **Test:** `e2e/docs.publish.e2e.ts` (the folder the workflow uploads, `apps/docs/out`, served as GitHub Pages serves it: the home page and its sections, a link between documents leading to the other page, a link to code going to GitHub, every page reachable from the home page and no broken link); `apps/docs/scripts/transform.test.ts` (links, titles, descriptions). The upload to GitHub Pages itself can't run in a test: after a merge, check **Actions → Docs portal** and open the site.
- **Observe:** the workflow's runs in Actions, and the deployments of the `github-pages` environment. No request logs (GitHub Pages).
- **Status:** verified — 2026-11-18 (end-to-end test of the built portal; the GitHub Pages upload hasn't run from `main` yet)
