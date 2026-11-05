// Writes openapi.json (run by `pnpm build`). packages/api-client is generated from that file, so
// commit it with your changes: CI fails if the API and the committed contract disagree.
import { writeFile } from "node:fs/promises";

// The document only needs the routes, not a real database or secret.
process.env.DATABASE_URL ??= "postgres://openapi:openapi@localhost:5432/openapi";
process.env.BETTER_AUTH_SECRET ??= "openapi-generation-only-not-a-secret";

const { createApp, createOpenApiDocument } = await import("./app.js");
const app = await createApp({ logger: false });
const document = createOpenApiDocument(app);
await writeFile(
  new URL("../openapi.json", import.meta.url),
  `${JSON.stringify(document, null, 2)}\n`,
);
await app.close();
