import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { tryInput, type TryInput, tryResult, type TryResult } from "@workspace/shared";
import { CrewOnly, Public } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { checkTurnstile } from "../common/turnstile.js";
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
  async request(@Body(new ZodPipe(tryInput)) input: TryInput): Promise<TryResult> {
    await checkTurnstile(input.turnstileToken);
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
