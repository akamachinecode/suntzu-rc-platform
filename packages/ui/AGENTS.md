# AGENTS.md — `packages/ui`

Shared shadcn/ui components and theme for `apps/app` (and any future web app). Read the root [`AGENTS.md`](../../AGENTS.md) first.

- `src/components/` — shadcn/ui components (generated — avoid editing). Add new ones from an app: `cd apps/app && pnpm dlx shadcn@latest add <component>`.
- `src/styles/globals.css` — Tailwind + theme tokens (brand colors, radius) for every app. Use the tokens in components (`bg-primary`, `text-muted-foreground`), never raw colors.
- Apps import from here as `@workspace/ui/components/<name>`, `@workspace/ui/lib/utils` and `@workspace/ui/globals.css`.
- Site- or app-specific components don't belong here: keep them in that app's `src/components/`.
