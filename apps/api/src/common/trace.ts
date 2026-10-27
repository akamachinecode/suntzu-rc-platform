import { randomUUID } from "node:crypto";
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { NextFunction, Request, Response } from "express";
import type { Observable } from "rxjs";

const BIT = "itaca:bit";
const SAFE_ID = /^[\w-]{1,128}$/;
const logger = new Logger("Http");

/**
 * Names the bit a route implements (`docs/bits/<id>.md`) so its log lines can be found by bit:
 * `@Bit("notes.create")`.
 */
export const Bit = (id: string) => SetMetadata(BIT, id);

/**
 * Gives every request a trace ID (the caller's `x-request-id`, else Cloudflare's `cf-ray`, else a
 * new one), returns it in the `x-request-id` header and writes one log line per request with its
 * bit, status and duration. Health checks aren't logged.
 */
export function traceRequests(req: Request, res: Response, next: NextFunction): void {
  const traceId =
    [req.header("x-request-id"), req.header("cf-ray")].find((id) => id && SAFE_ID.test(id)) ??
    randomUUID();
  const started = performance.now();
  res.setHeader("x-request-id", traceId);
  res.on("finish", () => {
    if (req.path === "/health") return;
    logger.log({
      traceId,
      bit: (res.locals.bit as string | undefined) ?? authBit(req.path),
      method: req.method,
      path: routePath(req),
      status: res.statusCode,
      ms: Math.round(performance.now() - started),
    });
  });
  next();
}

// The route pattern (/notes/:id) groups requests without logging IDs; Better Auth's catch-all
// route (/auth/*splat) logs the real path instead.
function routePath(req: Request): string {
  const pattern = (req.route as { path?: string } | undefined)?.path;
  return pattern && !pattern.includes("*") ? pattern : req.path;
}

// Better Auth's routes aren't Nest controllers: /auth/sign-in/email → "auth.sign-in".
function authBit(path: string): string | undefined {
  const match = /^\/auth\/([\w-]+)/.exec(path);
  return match ? `auth.${match[1]}` : undefined;
}

/** Hands the route's @Bit() name to traceRequests, which writes the log line. */
@Injectable()
export class BitInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const bit = this.reflector.get<string | undefined>(BIT, context.getHandler());
    if (bit) context.switchToHttp().getResponse<Response>().locals.bit = bit;
    return next.handle();
  }
}
