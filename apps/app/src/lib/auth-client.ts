import { inferAdditionalFields, magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client for the browser (sign in, sign out, current session). It talks to the API's
 * /auth endpoints; the session cookie it receives is then sent with every API call. Servo signs in
 * with an email link or Google, never a password.
 * Docs: https://www.better-auth.com/docs/concepts/client
 */
export const authClient = createAuthClient({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth`,
  plugins: [
    magicLinkClient(),
    inferAdditionalFields({ user: { role: { type: "string", required: false } } }),
  ],
});
