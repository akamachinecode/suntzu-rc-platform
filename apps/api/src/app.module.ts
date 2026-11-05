import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module.js";
import { BitInterceptor } from "./common/trace.js";
import { DbModule } from "./db/db.module.js";
import { EventsModule } from "./events/events.module.js";
import { HealthController } from "./health/health.controller.js";
import { NotesModule } from "./notes/notes.module.js";

@Module({
  imports: [DbModule, AuthModule, NotesModule, EventsModule],
  controllers: [HealthController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: BitInterceptor }],
})
export class AppModule {}
