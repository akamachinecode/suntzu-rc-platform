import { randomUUID } from "node:crypto";
import {
  type ArgumentsHost,
  type CallHandler,
  Catch,
  type ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  type NestInterceptor,
  SetMetadata,
} from "@nestjs/common";
import { BaseExceptionFilter, Reflector } from "@nestjs/core";
import { isSpanContextValid, type Span, SpanStatusCode, trace } from "@opentelemetry/api";
import type { NextFunction, Request, Response } from "express";
import type { Observable } from "rxjs";

const BIT = "itaca:bit";
const SAFE_ID = /^[\w-]{1,128}$/;
const logger = new Logger("Http");

/**
 * Names the bit a route implements (`docs/bits/<id>.md`) so its log lines and traces can be found
 * by bit: `@Bit("notes.create")`.
 */
export const Bit = (id: string) => SetMetadata(BIT, id);

/**
 * Gives every request a trace ID, returns it in the `x-request-id` header and writes one log line
 * per request with its bit, status and duration. Health checks aren't logged.
 *
 * With OpenTelemetry on (production), the trace ID is the request's OpenTelemetry trace, which the
 * app passes along in the `traceparent` header. Without it: the caller's `x-request-id`, else
 * Cloudflare's `cf-ray`, else a new one.
 */
export function traceRequests(req: Request, res: Response, next: NextFunction): void {
  const span = trace.getActiveSpan();
  const traceId =
    span && isSpanContextValid(span.spanContext())
      ? span.spanContext().traceId
      : ([req.header("x-request-id"), req.header("cf-ray")].find((id) => id && SAFE_ID.test(id)) ??
        randomUUID());
  res.locals.span = span;
  const auth = authBit(req.path);
  if (auth) span?.setAttribute("itaca.bit", auth);
  const started = performance.now();
  res.setHeader("x-request-id", traceId);
  res.on("finish", () => {
    if (req.path === "/health") return;
    logger.log({
      traceId,
      bit: (res.locals.bit as string | undefined) ?? auth,
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

/** Hands the route's @Bit() name to traceRequests (log line) and to the request's trace. */
@Injectable()
export class BitInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const bit = this.reflector.get<string | undefined>(BIT, context.getHandler());
    if (bit) {
      const res = context.switchToHttp().getResponse<Response>();
      res.locals.bit = bit;
      (res.locals.span as Span | undefined)?.setAttribute("itaca.bit", bit);
    }
    return next.handle();
  }
}

/**
 * Unexpected errors (not HttpException: a bug, the database down) are recorded in the request's
 * trace with their stack, then answered and logged by Nest as usual (500, `level: "error"`).
 */
@Catch()
export class TraceExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    if (!(exception instanceof HttpException)) {
      const span = host.switchToHttp().getResponse<Response>().locals.span as Span | undefined;
      span?.recordException(exception instanceof Error ? exception : String(exception));
      span?.setStatus({ code: SpanStatusCode.ERROR });
    }
    super.catch(exception, host);
  }
}
