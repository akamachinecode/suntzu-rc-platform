import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Instrumentation } from "next";

// Next.js runs this once when the server starts. Tracing (instrumentation.node.ts) only exists in
// the Node.js server and is off unless OTEL_SDK_DISABLED is false (production sets it in infra/).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.OTEL_SDK_DISABLED !== "true") {
    await import("./instrumentation.node");
  }
}

/**
 * Every error thrown while rendering a page, a Server Action or a route handler: recorded in the
 * request's trace and written as one JSON line with `level: "error"`, which the error alarm counts
 * (docs/OPERATIONS.md). Never put personal data in error messages.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const span = trace.getActiveSpan();
  const err = error instanceof Error ? error : new Error(String(error));
  span?.recordException(err);
  span?.setStatus({ code: SpanStatusCode.ERROR });
  console.error(
    JSON.stringify({
      level: "error",
      timestamp: Date.now(),
      message: err.message,
      digest: (error as { digest?: string }).digest,
      method: request.method,
      route: context.routePath,
      kind: context.routerKind === "App Router" ? context.routeType : "pages",
      trace_id: span?.spanContext().traceId,
      stack: err.stack,
    }),
  );
};
