import { Inject } from "@nestjs/common";
import { eq, schema, type Database } from "@workspace/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, magicLink } from "better-auth/plugins";
import { env } from "../env.js";
import { renderEmail, sendMail } from "../mail/mail.js";

export const AUTH = Symbol("AUTH");
/** Injects the Better Auth instance: `constructor(@InjectAuth() private readonly auth: Auth) {}` */
export const InjectAuth = () => Inject(AUTH);

// How long the sign-in link and its code work (spec 0006: the same for both).
const SIGN_IN_MINUTES = 15;

// The email-code plugin's other routes: they'd send a code without a link, or deal with passwords
// and email changes, none of which SunTzu RC has. Only POST /auth/sign-in/email-otp stays open.
const UNUSED_CODE_ROUTES = [
  "/email-otp/send-verification-otp",
  "/email-otp/check-verification-otp",
  "/email-otp/verify-email",
  "/email-otp/request-password-reset",
  "/forget-password/email-otp",
  "/email-otp/reset-password",
  "/email-otp/request-email-change",
  "/email-otp/change-email",
];

/**
 * Better Auth: sessions stored in the database (revocable), cookies for the web app. Endpoints live
 * under /auth. SunTzu RC signs people in without passwords (owner's decision, 2026-10-27): one email
 * with a one-time link (POST /auth/sign-in/magic-link) and a 6-digit code for the same sign-in
 * (POST /auth/sign-in/email-otp, spec 0006), or Google (when GOOGLE_CLIENT_ID is set).
 * Users and permissions are on the "stop and ask Itaca engineering" list.
 */
export function createAuth(db: Database) {
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {};
  const auth = betterAuth({
    appName: "SunTzu RC",
    baseURL: env.API_URL,
    basePath: "/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: false },
    disabledPaths: UNUSED_CODE_ROUTES,
    socialProviders: google,
    user: {
      additionalFields: {
        // "member" or "crew". Never set from a request: synced from CREW_EMAILS below.
        role: { type: "string", required: false, defaultValue: "member", input: false },
      },
    },
    plugins: [
      // The code is the same sign-in as the link, for phones: the link opens in whatever browser the
      // mail app picks, the code is typed where the person asked. Stored hashed, 3 tries.
      emailOTP({
        expiresIn: SIGN_IN_MINUTES * 60,
        storeOTP: "hashed",
        allowedAttempts: 3,
        // Codes only travel inside the link's email (below); the route that would call this is closed.
        sendVerificationOTP: async () => {},
      }),
      magicLink({
        expiresIn: SIGN_IN_MINUTES * 60,
        sendMagicLink: async ({ email, url }) => {
          // A new code replaces any earlier one for this address: only the latest email's code works.
          const code = await auth.api.createVerificationOTP({ body: { email, type: "sign-in" } });
          await sendMail({
            to: email,
            subject: "Your SunTzu RC sign-in link",
            ...renderEmail({
              heading: "Sign in to SunTzu RC",
              preview: `Your sign-in link and code, for the next ${SIGN_IN_MINUTES} minutes.`,
              paragraphs: [
                `Tap the button to sign in, or type the code on the page where you asked for it. Both work once, for the next ${SIGN_IN_MINUTES} minutes.`,
                "If you didn't ask for it, ignore this email: nobody can sign in without it.",
              ],
              code,
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
  return auth;
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
