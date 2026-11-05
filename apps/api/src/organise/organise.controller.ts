import { Body, Controller, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  claimInput,
  type ClaimInput,
  claimStatus,
  type ClaimStatus,
  claimVerify,
  type ClaimVerify,
  eventPatch,
  type EventPatchInput,
  hostUpdate,
  type HostUpdate,
  manualEvent,
  type ManualEvent,
  organiserHost,
  type OrganiserHost,
  placeConfirm,
  type PlaceConfirm,
} from "@workspace/shared";
import { z } from "zod";
import { CrewOnly, CurrentUser, type Session } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { openApi, ZodPipe } from "../common/zod.js";
import { OrganiseService } from "./organise.service.js";

const pendingClaim = z.object({
  host: z.object({
    slug: z.string(),
    name: z.string(),
    kind: z.string(),
    url: z.string().nullable(),
  }),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  requestedAt: z.string(),
});

@ApiTags("organise")
@ApiCookieAuth()
@Controller()
export class OrganiseController {
  constructor(private readonly organise: OrganiseService) {}

  @Get("organise")
  @Bit("hosts.claim")
  @ApiOkResponse({ schema: { type: "array", items: openApi(claimStatus) } })
  mine(@CurrentUser() user: Session["user"]): Promise<ClaimStatus[]> {
    return this.organise.mine(user.id);
  }

  @Post("organise/claims")
  @Bit("hosts.claim")
  @ApiBody({ schema: openApi(claimInput, "input") })
  @ApiOkResponse({ schema: openApi(claimStatus) })
  claim(
    @CurrentUser() user: Session["user"],
    @Body(new ZodPipe(claimInput)) input: ClaimInput,
  ): Promise<ClaimStatus> {
    return this.organise.claim(user.id, input);
  }

  @Post("organise/claims/:host/code")
  @Bit("hosts.verify")
  @ApiBody({ schema: openApi(claimVerify, "input") })
  @ApiOkResponse({ schema: openApi(claimStatus) })
  verifyCode(
    @CurrentUser() user: Session["user"],
    @Param("host") host: string,
    @Body(new ZodPipe(claimVerify)) input: ClaimVerify,
  ): Promise<ClaimStatus> {
    return this.organise.verifyCode(user.id, host, input.code);
  }

  @Post("organise/claims/:host/website")
  @Bit("hosts.verify")
  @ApiOkResponse({ schema: openApi(claimStatus) })
  verifyWebsite(
    @CurrentUser() user: Session["user"],
    @Param("host") host: string,
  ): Promise<ClaimStatus> {
    return this.organise.verifyWebsite(user.id, host);
  }

  @Get("organise/:host")
  @Bit("organiser.dashboard")
  @ApiOkResponse({ schema: openApi(organiserHost) })
  dashboard(
    @CurrentUser() user: Session["user"],
    @Param("host") host: string,
  ): Promise<OrganiserHost> {
    return this.organise.dashboard(user.id, host);
  }

  @Patch("organise/:host")
  @Bit("organiser.update-club")
  @HttpCode(204)
  @ApiBody({ schema: openApi(hostUpdate, "input") })
  async updateHost(
    @CurrentUser() user: Session["user"],
    @Param("host") host: string,
    @Body(new ZodPipe(hostUpdate)) input: HostUpdate,
  ): Promise<void> {
    await this.organise.updateHost(user.id, host, input);
  }

  @Post("organise/:host/events")
  @Bit("organiser.publish")
  @ApiBody({ schema: openApi(manualEvent, "input") })
  @ApiOkResponse({ schema: { type: "object", properties: { slug: { type: "string" } } } })
  publish(
    @CurrentUser() user: Session["user"],
    @Param("host") host: string,
    @Body(new ZodPipe(manualEvent)) input: ManualEvent,
  ): Promise<{ slug: string }> {
    return this.organise.publish(user.id, host, input);
  }

  @Patch("organise/:host/events/:slug")
  @Bit("organiser.publish")
  @HttpCode(204)
  @ApiBody({ schema: openApi(eventPatch, "input") })
  async editEvent(
    @CurrentUser() user: Session["user"],
    @Param("host") host: string,
    @Param("slug") slug: string,
    @Body(new ZodPipe(eventPatch)) patch: EventPatchInput,
  ): Promise<void> {
    await this.organise.editEvent(user.id, host, slug, patch);
  }

  @Post("organise/:host/places/:slug/confirm")
  @Bit("places.confirm")
  @HttpCode(204)
  @ApiBody({ schema: openApi(placeConfirm, "input") })
  async confirmPlace(
    @CurrentUser() user: Session["user"],
    @Param("host") host: string,
    @Param("slug") slug: string,
    @Body(new ZodPipe(placeConfirm)) input: PlaceConfirm,
  ): Promise<void> {
    await this.organise.confirmPlace(user.id, host, slug, input);
  }

  @CrewOnly()
  @Get("crew/claims")
  @Bit("hosts.verify")
  @ApiOkResponse({ schema: { type: "array", items: openApi(pendingClaim) } })
  pending() {
    return this.organise.pendingForCrew();
  }

  @CrewOnly()
  @Post("crew/claims/:host/:user/:decision")
  @Bit("hosts.verify")
  @HttpCode(204)
  async decide(
    @Param("host") host: string,
    @Param("user") userId: string,
    @Param("decision") decision: string,
  ): Promise<void> {
    await this.organise.approveByCrew(host, userId, decision === "approve");
  }
}
