# AGENTS.md — `apps/docs`

The SunTzu RC docs portal (spec 0007): every document of the repository as one website with search, published on GitHub Pages. Read the root [`AGENTS.md`](../../AGENTS.md) first: its golden rules, monorepo rules and "When to stop" apply here too.

- **Don't write documentation here.** The pages are generated from the repository's own documents (`docs/`, `README.md`, `CONTRIBUTING.md`, `AGENTS.md`…) by `scripts/content.ts` before every `dev`, `build` and `typecheck`, into `content/docs/` (git-ignored). Edit the document itself; the portal follows.
- **Where a document goes** in the sidebar is the `SECTIONS` list in `scripts/content.ts`. The home page is `docs/README.md`; the root `README.md` is "The repository" under Project. Guides (`docs/guides/`), specs and bits are picked up by themselves, and a new file in `docs/` that isn't listed lands in "More", so nothing is left out.
- **Every document needs a `# Title` first line**: it becomes the page title, and the build fails without it. A short opening paragraph becomes the description under the title. Relative links become links to other pages, or to the file on GitHub when it isn't a document (`scripts/transform.ts`, tested in `transform.test.ts`).
- **A static site:** `output: "export"` writes plain HTML to `out/`. No server code, no API calls, no environment secrets. Search is an index built at build time (`src/app/api/search/route.ts`) and searched in the browser.
- **Look:** Fumadocs UI (`fumadocs-ui`) on the brand from `packages/ui`: its shadcn preset maps Fumadocs' colours onto our theme tokens, Archivo is loaded in `src/app/layout.tsx`, and `src/app/globals.css` adds the site's ink borders and hard shadows. Light theme only. XT60 yellow is a fill (the open page in the sidebar), never a text colour. Fumadocs UI here instead of shadcn/ui is a recorded exception (`docs/DECISIONS.md`, 2026-11-10); use Fumadocs' components for documentation layout and `@workspace/ui` for anything else.
- **Published** on GitHub Pages at https://akamachinecode.github.io/suntzu-rc-platform/ by `.github/workflows/docs.yml` when the documents change on `main` (bit `docs.publish`). There it lives under `/suntzu-rc-platform`: the workflow sets `DOCS_BASE_PATH`, which `next.config.ts` turns into `basePath`. Links through `next/link` get it by themselves; anything the browser fetches by hand needs `process.env.NEXT_PUBLIC_BASE_PATH` (see `src/components/search.tsx`).
- Add dependencies to this app only: `pnpm --filter @workspace/docs add <pkg>`.

## Stack

Next.js 16 (App Router, static export), React 19, Fumadocs (`fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`), Tailwind CSS 4, TypeScript strict. The content scripts run on Node directly (`node scripts/content.ts`, type stripping), with no extra tooling.

Local dev server: `pnpm dev:docs` from the root → http://localhost:3002 (also started by `pnpm dev`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

### Structure

```text
scripts/content.ts        builds content/docs/ from the repository's documents (sidebar order: SECTIONS)
scripts/transform.ts      one document → one page: title, description, links (tested)
src/app/layout.tsx        <html>, Archivo, the docs layout with the sidebar
src/app/[[...slug]]/      every page
src/app/api/search/       the search index, written at build time
src/lib/source.ts         Fumadocs source over content/docs (front matter schema)
src/lib/site.ts           name, description, repository URL
src/app/globals.css       the shared theme + Fumadocs preset + brand touches
```
