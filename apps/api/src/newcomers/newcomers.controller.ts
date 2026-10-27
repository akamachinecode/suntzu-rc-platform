import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { tryInput, type TryInput, tryResult, type TryResult } from "@workspace/shared";
import type { Request } from "express";
import { CrewOnly, Public } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { checkTurnstile, clientIp } from "../common/turnstile.js";
import { openApi, ZodPipe } from "../common/zod.js";
import { NewcomersService } from "./newcomers.service.js";

@ApiTags("newcomers")
@Controller()
export class NewcomersController {
  constructor(private readonly newcomers: NewcomersService) {}

  @Public()
  @Post("try")
  @Bit("try.request")
  @ApiBody({ schema: openApi(tryInput, "input") })
  @ApiOkResponse({ schema: openApi(tryResult) })
  async request(
    @Req() request: Request,
    @Body(new ZodPipe(tryInput)) input: TryInput,
  ): Promise<TryResult> {
    await checkTurnstile(input.turnstileToken, clientIp(request.headers));
    return this.newcomers.request(input, null);
  }

  @CrewOnly()
  @Get("crew/try")
  @Bit("try.request")
  open() {
    return this.newcomers.openForCrew();
  }

  @CrewOnly()
  @Post("crew/try/:id/sent")
  @Bit("try.request")
  @HttpCode(204)
  async sent(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.newcomers.markSent(id);
  }
}
