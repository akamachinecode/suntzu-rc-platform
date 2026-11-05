import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  crewDecision,
  type CrewDecision,
  crewFeedback,
  type CrewFeedback,
  crewMessage,
  type CrewMessage,
  crewReview,
  type CrewReview,
  crewSummary,
  type CrewSummary,
  eventPatch,
  type EventPatchInput,
  manualEvent,
  type ManualEvent,
} from "@workspace/shared";
import { CrewOnly, CurrentUser, type Session } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { openApi, ZodPipe } from "../common/zod.js";
import { CrewService } from "./crew.service.js";

@ApiTags("crew")
@ApiCookieAuth()
@CrewOnly()
@Controller("crew")
export class CrewController {
  constructor(private readonly crew: CrewService) {}

  @Get("summary")
  @Bit("crew.queue")
  @ApiOkResponse({ schema: openApi(crewSummary) })
  summary(): Promise<CrewSummary> {
    return this.crew.summary();
  }

  @Get("reviews")
  @Bit("crew.queue")
  @ApiOkResponse({ schema: { type: "array", items: openApi(crewReview) } })
  reviews(): Promise<CrewReview[]> {
    return this.crew.reviews();
  }

  @Post("reviews/:id/decision")
  @Bit("crew.decide")
  @HttpCode(204)
  @ApiBody({ schema: openApi(crewDecision, "input") })
  async decide(
    @CurrentUser() user: Session["user"],
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(crewDecision)) decision: CrewDecision,
  ): Promise<void> {
    await this.crew.decide(id, decision, user.id);
  }

  @Post("events")
  @Bit("crew.add-event")
  @ApiBody({ schema: openApi(manualEvent, "input") })
  @ApiOkResponse({ schema: { type: "object", properties: { slug: { type: "string" } } } })
  createEvent(@Body(new ZodPipe(manualEvent)) input: ManualEvent): Promise<{ slug: string }> {
    return this.crew.createEvent(input);
  }

  @Patch("events/:slug")
  @Bit("crew.edit-event")
  @HttpCode(204)
  @ApiBody({ schema: openApi(eventPatch, "input") })
  async editEvent(
    @Param("slug") slug: string,
    @Body(new ZodPipe(eventPatch)) patch: EventPatchInput,
  ): Promise<void> {
    await this.crew.editEvent(slug, patch);
  }

  @Get("messages")
  @Bit("crew.inbox")
  @ApiOkResponse({ schema: { type: "array", items: openApi(crewMessage) } })
  messages(): Promise<CrewMessage[]> {
    return this.crew.messages();
  }

  @Post("messages/:id/handled")
  @Bit("crew.inbox")
  @HttpCode(204)
  async handle(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.crew.handleMessage(id);
  }

  @Get("feedback")
  @Bit("crew.feedback")
  @ApiOkResponse({ schema: { type: "array", items: openApi(crewFeedback) } })
  feedback(): Promise<CrewFeedback[]> {
    return this.crew.feedback();
  }

  @Post("feedback/:id/seen")
  @Bit("crew.feedback")
  @HttpCode(204)
  async see(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.crew.seeFeedback(id);
  }
}
