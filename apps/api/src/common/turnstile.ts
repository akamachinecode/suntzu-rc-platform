import { ForbiddenException, Logger } from "@nestjs/common";
import { env } from "../env.js";

const logger = new Logger("Turnstile");

/**
 * Public forms (contact, feedback, "try it") prove a person sent them with a Cloudflare Turnstile
 * token. Without TURNSTILE_SECRET_KEY (local development) every form is accepted.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
// No remote IP is sent: public forms reach the API through the app's server, so the address
// Cloudflare sees is the server's, not the visitor's, and a wrong address is worse than none.
export async function checkTurnstile(token: string | undefined) {
  if (!env.TURNSTILE_SECRET_KEY) {
    // Locally forms are open; in production a missing key must not leave them unprotected.
    if (env.NODE_ENV === "production") {
      logger.error("TURNSTILE_SECRET_KEY is not set: public forms are refused");
      throw new ForbiddenException("This form is closed for a moment. Try again later.");
    }
    return;
  }
  if (!token) throw new ForbiddenException("Please confirm you're not a robot.");
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: boolean };
    if (result.success) return;
  } catch (error) {
    logger.warn(
      `Turnstile check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  throw new ForbiddenException("Please confirm you're not a robot.");
}
