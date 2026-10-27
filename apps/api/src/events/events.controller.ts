import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiProduces, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  calendarQuery,
  type CalendarQuery,
  event,
  eventDetail,
  type EventDetail,
  eventListQuery,
  type EventListQuery,
  place,
  type Place,
  type RcEvent,
  DISCIPLINES,
  EVENT_KINDS,
  REGIONS,
} from "@workspace/shared";
import { Public } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { openApi, ZodPipe } from "../common/zod.js";
import { EventsService } from "./events.service.js";

// Everything here is public and read-only: the calendar is for everyone, signed in or not.
const PUBLIC_CACHE = "public, max-age=300";

const filters = () => (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
  ApiQuery({ name: "discipline", required: false, enum: DISCIPLINES })(target, key, descriptor);
  ApiQuery({ name: "kind", required: false, enum: EVENT_KINDS })(target, key, descriptor);
  ApiQuery({ name: "region", required: false, enum: REGIONS })(target, key, descriptor);
};

@ApiTags("events")
@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Public()
  @Get("events")
  @Bit("events.list")
  @Header("Cache-Control", PUBLIC_CACHE)
  @ApiQuery({ name: "from", required: false, description: "YYYY-MM-DD, default today" })
  @ApiQuery({ name: "to", required: false, description: "YYYY-MM-DD" })
  @filters()
  @ApiOkResponse({ schema: { type: "array", items: openApi(event) } })
  list(@Query(new ZodPipe(eventListQuery)) query: EventListQuery): Promise<RcEvent[]> {
    return this.events.list(query);
  }

  // Declared before events/:slug so "calendar.ics" is never read as a slug.
  @Public()
  @Get("events/calendar.ics")
  @Bit("events.calendar")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @Header("Cache-Control", PUBLIC_CACHE)
  @ApiProduces("text/calendar")
  @filters()
  @ApiOkResponse({ description: "iCalendar feed of upcoming events with exact dates" })
  calendar(@Query(new ZodPipe(calendarQuery)) query: CalendarQuery): Promise<string> {
    return this.events.calendar(query);
  }

  @Public()
  @Get("events/:slug")
  @Bit("events.get")
  @Header("Cache-Control", PUBLIC_CACHE)
  @ApiOkResponse({ schema: openApi(eventDetail) })
  get(@Param("slug") slug: string): Promise<EventDetail> {
    return this.events.get(slug);
  }

  @Public()
  @Get("events/:slug/calendar.ics")
  @Bit("events.event-calendar")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @Header("Cache-Control", PUBLIC_CACHE)
  @ApiProduces("text/calendar")
  @ApiOkResponse({ description: "iCalendar file with this one event" })
  eventCalendar(@Param("slug") slug: string): Promise<string> {
    return this.events.eventCalendar(slug);
  }

  @Public()
  @Get("places")
  @Bit("places.list")
  @Header("Cache-Control", PUBLIC_CACHE)
  @ApiOkResponse({ schema: { type: "array", items: openApi(place) } })
  places(): Promise<Place[]> {
    return this.events.places();
  }
}
