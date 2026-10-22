import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller.js";
import { EventsService } from "./events.service.js";

/** The public calendar and places: GET /events, /events/:slug, ICS feeds and GET /places. */
@Module({
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
