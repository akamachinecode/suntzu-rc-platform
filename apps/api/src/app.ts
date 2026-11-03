import "reflect-metadata";
import type { NestApplicationOptions } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import { toNodeHandler } from "better-auth/node";
import { AppModule } from "./app.module.js";
import { type Auth, AUTH } from "./auth/auth.js";
import { traceRequests } from "./common/trace.js";
import { env } from "./env.js";

/** Builds the configured application (shared by main.ts and openapi.ts). */
export async function createApp(
  options: NestApplicationOptions = {},
): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    ...options,
    bodyParser: false,
  });
  // Order matters: CORS first (it also answers the browser's preflight requests), then Better
  // Auth, which reads the raw request body itself, then the JSON body parser for other routes.
  app.use(traceRequests);
  app.enableCors({ origin: [env.APP_URL], credentials: true, exposedHeaders: ["x-request-id"] });
  const http = app.getHttpAdapter().getInstance();
  http.disable("x-powered-by");
  http.all("/auth/*splat", toNodeHandler(app.get<Auth>(AUTH)));
  app.useBodyParser("json", { limit: "1mb" });
  app.enableShutdownHooks();
  return app;
}

/** The OpenAPI document: the contract that apps (web, mobile) and partners build against. */
export function createOpenApiDocument(app: NestExpressApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("SunTzu RC API")
    .setVersion("1.0.0")
    .addCookieAuth("better-auth.session_token")
    .build();
  return SwaggerModule.createDocument(app, config);
}
