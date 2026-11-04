import { ConsoleLogger } from "@nestjs/common";
import { trace } from "@opentelemetry/api";

/**
 * Production logger: one JSON line per message on stdout, with the trace and span of the request
 * that wrote it (`trace_id`, `span_id`), so CloudWatch can go from a log line to its trace and
 * count lines whose `level` is "error" (the error alarm, docs/OPERATIONS.md).
 */
export class JsonLogger extends ConsoleLogger {
  constructor() {
    super({ json: true });
  }

  protected override getJsonLogObject(
    message: unknown,
    options: Parameters<ConsoleLogger["getJsonLogObject"]>[1],
  ): ReturnType<ConsoleLogger["getJsonLogObject"]> {
    const line = super.getJsonLogObject(message, options);
    const span = trace.getActiveSpan()?.spanContext();
    return span ? { ...line, trace_id: span.traceId, span_id: span.spanId } : line;
  }
}
