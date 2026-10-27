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
  // Events engine: where the raw pages and feeds it reads are kept: a folder (local runs) or an
  // S3 bucket once deployed ("s3://<bucket>").
  ENGINE_SNAPSHOT_DIR: z.string().default(".snapshots"),
  // Email: "log" prints each message to the console (local), "ses" sends it with Amazon SES.
  MAIL_TRANSPORT: z.enum(["log", "ses"]).default("log"),
  MAIL_FROM: z.string().default("Servo <hello@example.com>"),
  // The AWS project's region (SES, S3, Bedrock).
  AWS_REGION: z.string().default("us-east-2"),
  // Sign in with Google: set both to turn it on (Google Cloud console → OAuth client ID).
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Comma-separated emails of the crew: those accounts get the crew role at every sign-in.
  CREW_EMAILS: z
    .string()
    .default("")
    .transform((list) =>
      list
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  // Where the crew hears about new messages and "try it" requests nobody else can take.
  CREW_INBOX: z.string().optional(),
  // AI extraction of events from pasted text (Claude on Amazon Bedrock). Off when unset: pasted
  // text then reaches the crew as a message.
  BEDROCK_MODEL_ID: z.string().optional(),
  BEDROCK_FALLBACK_MODEL_ID: z.string().default("anthropic.claude-opus-4-8"),
  // Cloudflare Turnstile: public forms are checked when it's set (production), open when it isn't.
  TURNSTILE_SECRET_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
