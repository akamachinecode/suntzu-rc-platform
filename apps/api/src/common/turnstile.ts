import { ForbiddenException, Logger } from "@nestjs/common";
import { env } from "../env.js";

const logger = new Logger("Turnstile");

/**
 * Public forms (contact, feedback, "try it") prove a person sent them with a Cloudflare Turnstile
 * token. Without TURNSTILE_SECRET_KEY (local development) every form is accepted.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function checkTurnstile(token: string | undefined, ip: string | undefined) {
  if (!env.TURNSTILE_SECRET_KEY) return;
  if (!token) throw new ForbiddenException("Please confirm you're not a robot.");
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip) body.set("remoteip", ip);
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

/** The visitor's address as Cloudflare saw it. */
export function clientIp(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const value = headers["cf-connecting-ip"];
  return typeof value === "string" ? value : undefined;
}
