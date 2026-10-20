import "server-only";
import { z } from "zod";

/**
 * Server-side environment variables, validated at startup.
 * Add every new variable here AND in .env.example. Import `env` instead of reading process.env.
 * Never import this file from a Client Component ("server-only" makes that a build error).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Example: DATABASE_URL: z.url(),
});

export const env = schema.parse(process.env);
