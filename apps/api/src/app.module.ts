import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { DbModule } from "./db/db.module.js";
import { EventsModule } from "./events/events.module.js";
import { HealthController } from "./health/health.controller.js";
import { NotesModule } from "./notes/notes.module.js";

@Module({
  imports: [DbModule, AuthModule, NotesModule, EventsModule],
  controllers: [HealthController],
})
export class AppModule {}
