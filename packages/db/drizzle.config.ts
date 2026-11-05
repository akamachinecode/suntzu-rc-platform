import { defineConfig } from "drizzle-kit";

// `pnpm --filter @workspace/db generate` writes a new SQL migration after you change src/schema.
// Migrations are applied by the API on startup (apps/api/src/migrate.ts) and with `pnpm db:migrate`.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/app",
  },
});
