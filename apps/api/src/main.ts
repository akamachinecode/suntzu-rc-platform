import { ConsoleLogger, Logger } from "@nestjs/common";
import { SwaggerModule } from "@nestjs/swagger";
import { createApp, createOpenApiDocument } from "./app.js";
import { env } from "./env.js";

const production = env.NODE_ENV === "production";
// Production logs are JSON lines on stdout, so CloudWatch can search them by field.
const app = await createApp(production ? { logger: new ConsoleLogger({ json: true }) } : {});
// Interactive API docs at /docs, outside production only.
if (!production) {
  SwaggerModule.setup("docs", app, createOpenApiDocument(app));
}
await app.listen(env.PORT);
new Logger("Api").log(`Listening on ${env.API_URL}`);
