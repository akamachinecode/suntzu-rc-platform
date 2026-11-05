import { Body, Controller, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import {
  correctionInput,
  type CorrectionInput,
  feedbackInput,
  type FeedbackInput,
  messageInput,
  type MessageInput,
} from "@workspace/shared";
import { CurrentUser, Public, type Session } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { checkTurnstile } from "../common/turnstile.js";
import { openApi, ZodPipe } from "../common/zod.js";
import { InboxService } from "./inbox.service.js";

@ApiTags("inbox")
@Controller()
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Public()
  @Post("messages")
  @Bit("messages.create")
  @HttpCode(204)
  @ApiBody({ schema: openApi(messageInput, "input") })
  async message(@Body(new ZodPipe(messageInput)) input: MessageInput): Promise<void> {
    await checkTurnstile(input.turnstileToken);
    await this.inbox.message(input, null);
  }

  @Public()
  @Post("events/:slug/feedback")
  @Bit("events.feedback")
  @HttpCode(204)
  @ApiBody({ schema: openApi(feedbackInput, "input") })
  async feedback(
    @Param("slug") slug: string,
    @Body(new ZodPipe(feedbackInput)) input: FeedbackInput,
  ): Promise<void> {
    await checkTurnstile(input.turnstileToken);
    await this.inbox.feedback(slug, input);
  }

  @Post("events/:slug/corrections")
  @Bit("corrections.create")
  @HttpCode(204)
  @ApiBody({ schema: openApi(correctionInput, "input") })
  async correction(
    @CurrentUser() user: Session["user"],
    @Param("slug") slug: string,
    @Body(new ZodPipe(correctionInput)) input: CorrectionInput,
  ): Promise<void> {
    await this.inbox.correction(slug, input, user.id);
  }
}
