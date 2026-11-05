# AGENTS.md — `packages/shared`

Zod schemas, types and constants shared by `apps/api`, `apps/app` and a future mobile app. Read the root [`AGENTS.md`](../../AGENTS.md) first.

- One file per domain (`notes.ts`), exported from `src/index.ts`. For each operation, an input schema (what the client sends) and an output schema (what the API returns).
- The API validates requests with these schemas and documents them in OpenAPI; the apps reuse them to validate forms before calling the API.
- No runtime dependencies besides `zod`, no Node.js or browser APIs: this code runs everywhere.
