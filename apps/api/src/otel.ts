// OpenTelemetry tracing, loaded before the API itself (`node --import ./dist/otel.js dist/main.js`)
// so that HTTP, Express, NestJS, PostgreSQL and outgoing fetch calls are traced from the first
// request. Spans go to the OpenTelemetry Collector that runs next to the API (OTLP on
// localhost:4318), which removes personal data and forwards them to CloudWatch (docs/OPERATIONS.md).
//
// Configured only by the standard OTEL_* variables, which infra/ sets in production. Locally,
// OTEL_SDK_DISABLED=true (.env.example) turns it off. It reads process.env directly because it
// runs before env.ts.
import { register } from "node:module";
import { context, propagation, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { ExpressInstrumentation, ExpressLayerType } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
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
  TraceIdRatioBasedSampler,
  TracerProvider,
} from "@opentelemetry/sdk-trace";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

if (process.env.OTEL_SDK_DISABLED !== "true") {
  // Express, NestJS and pg are CommonJS packages imported from this ES module project: this hook
  // lets the instrumentations patch them.
  register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

  // Share of new traces to keep, from 0 to 1 (OTEL_TRACES_SAMPLER_ARG). Default: all of them.
  const ratio = Number(process.env.OTEL_TRACES_SAMPLER_ARG ?? "1");

  const provider = new TracerProvider({
    resource: defaultResource()
      .merge(resourceFromAttributes({ [ATTR_SERVICE_NAME]: "api" }))
      .merge(detectResources({ detectors: [envDetector] })),
    // A request that arrives with a trace (from the app) follows the app's decision.
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(ratio >= 0 && ratio <= 1 ? ratio : 1),
    }),
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
    instrumentations: [
      // Health checks (load balancer, Docker, uptime checks) arrive every few seconds: not traced.
      new HttpInstrumentation({ ignoreIncomingRequestHook: (req) => req.url === "/health" }),
      // Route handlers only: a span per middleware (CORS, body parser…) would only add noise.
      new ExpressInstrumentation({ ignoreLayersType: [ExpressLayerType.MIDDLEWARE] }),
      new NestInstrumentation(),
      // Queries are recorded with their placeholders ($1, $2), never with their values.
      new PgInstrumentation({
        requireParentSpan: true,
        enhancedDatabaseReporting: false,
        ignoreConnectSpans: true,
      }),
      new UndiciInstrumentation(),
    ],
  });
}
