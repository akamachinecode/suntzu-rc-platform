import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module.js";
import { BitInterceptor } from "./common/trace.js";
import { CrewModule } from "./crew/crew.module.js";
import { DbModule } from "./db/db.module.js";
import { EventsModule } from "./events/events.module.js";
import { HealthController } from "./health/health.controller.js";
import { InboxModule } from "./inbox/inbox.module.js";
import { MembersModule } from "./members/members.module.js";
import { NewcomersModule } from "./newcomers/newcomers.module.js";
import { NotesModule } from "./notes/notes.module.js";
import { OrganiseModule } from "./organise/organise.module.js";
import { PlacesModule } from "./places/places.module.js";

@Module({
  imports: [
    DbModule,
    AuthModule,
    NotesModule,
    EventsModule,
    MembersModule,
    CrewModule,
    InboxModule,
    PlacesModule,
    OrganiseModule,
    NewcomersModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: BitInterceptor }],
})
export class AppModule {}
