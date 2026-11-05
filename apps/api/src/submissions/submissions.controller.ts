import { Body, Controller, Post } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  submissionInput,
  type SubmissionInput,
  submissionResult,
  type SubmissionResult,
} from "@workspace/shared";
import { CurrentUser, type Session } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { openApi, ZodPipe } from "../common/zod.js";
import { SubmissionsService } from "./submissions.service.js";

@ApiTags("submissions")
@ApiCookieAuth()
@Controller("submissions")
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post()
  @Bit("submissions.create")
  @ApiBody({ schema: openApi(submissionInput, "input") })
  @ApiOkResponse({ schema: openApi(submissionResult) })
  create(
    @CurrentUser() user: Session["user"],
    @Body(new ZodPipe(submissionInput)) input: SubmissionInput,
  ): Promise<SubmissionResult> {
    return this.submissions.submit(user.id, input);
  }
}
