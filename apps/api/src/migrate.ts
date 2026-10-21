// Applies database migrations. Runs before the API starts (`pnpm start`, the Docker image)
// and on demand with `pnpm --filter @workspace/api db:migrate`.
import { runMigrations } from "@workspace/db";
import { env } from "./env.js";

await runMigrations(env.DATABASE_URL);
console.log("Database migrations applied");
