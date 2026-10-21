import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { DbModule } from "./db/db.module.js";
import { HealthController } from "./health/health.controller.js";
import { NotesModule } from "./notes/notes.module.js";

@Module({
  imports: [DbModule, AuthModule, NotesModule],
  controllers: [HealthController],
})
export class AppModule {}
