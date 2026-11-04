// OpenTelemetry tracing for the Next.js server, loaded by instrumentation.ts. Next.js already
// traces each request, render and route; this sends those spans to the OpenTelemetry Collector
// next to the app (OTLP on localhost:4318) and adds the `fetch` calls to the API, which carry the
// trace along (`traceparent` header) so one page request can be followed into apps/api.
// Configured only by the standard OTEL_* variables, which infra/ sets in production.
import { context, propagation, SpanKind, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import {
  defaultResource,
  detectResources,
  envDetector,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  SamplingDecision,
  type Sampler,
  TraceIdRatioBasedSampler,
  TracerProvider,
} from "@opentelemetry/sdk-trace";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

// Share of new traces to keep, from 0 to 1 (OTEL_TRACES_SAMPLER_ARG). Default: all of them.
const ratio = Number(process.env.OTEL_TRACES_SAMPLER_ARG ?? "1");
const sampled = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(ratio >= 0 && ratio <= 1 ? ratio : 1),
});

// Only requests are traced. Not traced: health checks (load balancer, Docker and uptime checks
// arrive every few seconds) and the server's own startup work (loading modules), which isn't a
// request.
const requestsOnly: Sampler = {
  shouldSample: (ctx, traceId, name, kind, attributes, links) => {
    const startup = !trace.getSpanContext(ctx) && kind !== SpanKind.SERVER;
    const health = String(attributes["http.target"] ?? "").startsWith("/api/health");
    return startup || health
      ? { decision: SamplingDecision.NOT_RECORD }
      : sampled.shouldSample(ctx, traceId, name, kind, attributes, links);
  },
  toString: () => "RequestsOnly",
};

const provider = new TracerProvider({
  resource: defaultResource()
    .merge(resourceFromAttributes({ [ATTR_SERVICE_NAME]: "app" }))
    .merge(detectResources({ detectors: [envDetector] })),
  sampler: requestsOnly,
  // OTEL_EXPORTER_OTLP_ENDPOINT, default http://localhost:4318.
  spanProcessors: [new BatchSpanProcessor({ exporter: new OTLPTraceExporter() })],
});

context.setGlobalContextManager(new AsyncLocalStorageContextManager());
propagation.setGlobalPropagator(
  new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
  }),
);
trace.setGlobalTracerProvider(provider);

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [new UndiciInstrumentation()],
});
