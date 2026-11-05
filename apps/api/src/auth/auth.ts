import { Inject } from "@nestjs/common";
import { schema, type Database } from "@workspace/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "../env.js";

export const AUTH = Symbol("AUTH");
/** Injects the Better Auth instance: `constructor(@InjectAuth() private readonly auth: Auth) {}` */
export const InjectAuth = () => Inject(AUTH);

/**
 * Better Auth: sign-up, sign-in, sessions stored in the database (revocable), cookies for the web
 * app. Endpoints live under /auth (e.g. POST /auth/sign-in/email). Add plugins here (email OTP,
 * two-factor, admin, organization…): https://www.better-auth.com/docs/plugins
 * Users and permissions are on the "stop and ask Itaca engineering" list.
 */
export function createAuth(db: Database) {
  return betterAuth({
    appName: "Servo",
    baseURL: env.API_URL,
    basePath: "/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    advanced: {
      crossSubDomainCookies: env.COOKIE_DOMAIN
        ? { enabled: true, domain: env.COOKIE_DOMAIN }
        : undefined,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
