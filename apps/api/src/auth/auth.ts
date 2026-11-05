import { Inject } from "@nestjs/common";
import { eq, schema, type Database } from "@workspace/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { env } from "../env.js";
import { renderEmail, sendMail } from "../mail/mail.js";

export const AUTH = Symbol("AUTH");
/** Injects the Better Auth instance: `constructor(@InjectAuth() private readonly auth: Auth) {}` */
export const InjectAuth = () => Inject(AUTH);

/**
 * Better Auth: sessions stored in the database (revocable), cookies for the web app. Endpoints live
 * under /auth. Servo signs people in without passwords (owner's decision, 2026-10-27): a one-time
 * link by email (POST /auth/sign-in/magic-link) or Google (when GOOGLE_CLIENT_ID is set).
 * Users and permissions are on the "stop and ask Itaca engineering" list.
 */
export function createAuth(db: Database) {
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {};
  return betterAuth({
    appName: "Servo",
    baseURL: env.API_URL,
    basePath: "/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: false },
    socialProviders: google,
    user: {
      additionalFields: {
        // "member" or "crew". Never set from a request: synced from CREW_EMAILS below.
        role: { type: "string", required: false, defaultValue: "member", input: false },
      },
    },
    plugins: [
      magicLink({
        expiresIn: 15 * 60,
        sendMagicLink: async ({ email, url }) => {
          await sendMail({
            to: email,
            subject: "Your Servo sign-in link",
            ...renderEmail({
              heading: "Sign in to Servo",
              paragraphs: [
                "Tap the button to sign in. The link works once, for the next 15 minutes.",
                "If you didn't ask for it, ignore this email: nobody can sign in without it.",
              ],
              button: { label: "Sign in", url },
              footer: "You got this because someone asked for a sign-in link with this address.",
            }),
          });
        },
      }),
    ],
    databaseHooks: {
      session: {
        create: {
          // The crew is whoever CREW_EMAILS lists today: checked at every sign-in.
          after: async (session) => {
            const [person] = await db
              .select({ email: schema.user.email, role: schema.user.role })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId));
            if (!person) return;
            const role = env.CREW_EMAILS.includes(person.email.toLowerCase()) ? "crew" : "member";
            if (person.role !== role) {
              await db.update(schema.user).set({ role }).where(eq(schema.user.id, session.userId));
            }
          },
        },
      },
    },
    advanced: {
      crossSubDomainCookies: env.COOKIE_DOMAIN
        ? { enabled: true, domain: env.COOKIE_DOMAIN }
        : undefined,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
