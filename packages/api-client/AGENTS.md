# AGENTS.md — `packages/api-client`

Typed client for `apps/api`. Read the root [`AGENTS.md`](../../AGENTS.md) first.

- `src/schema.ts` is generated from `apps/api/openapi.json` by `pnpm build` (git-ignored): never edit it. To change the API's shape, change the API.
- Use it through the app's helper (`getApi()` in `apps/app/src/lib/api.ts`), or `createApiClient({ baseUrl })` from a new client such as a mobile app.
- Calls are typed by path: `api.GET("/notes")`, `api.POST("/notes", { body })`, `api.DELETE("/notes/{id}", { params: { path: { id } } })`.
