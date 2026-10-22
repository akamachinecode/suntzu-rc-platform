import { z } from "zod";

/**
 * Environment variables, validated at startup: the API refuses to start with a missing or invalid
 * value. Add every new variable here AND in .env.example. Import `env` instead of reading process.env.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3001),
  DATABASE_URL: z.url(),
  // Public URL of this API (Better Auth builds its links and cookies from it).
  API_URL: z.url().default("http://localhost:3001"),
  // Origin of the web app: the only browser origin allowed to call the API with cookies.
  APP_URL: z.url().default("http://localhost:3000"),
  // Production only: parent domain shared by the app and the API (e.g. example.com) so the
  // session cookie set by api.example.com is also sent to app.example.com.
  COOKIE_DOMAIN: z.string().optional(),
  // At least 32 random characters: `openssl rand -base64 32`.
  BETTER_AUTH_SECRET: z.string().min(32),
  // Events engine: folder for the raw pages and feeds it reads (local runs; S3 once deployed).
  ENGINE_SNAPSHOT_DIR: z.string().default(".snapshots"),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
