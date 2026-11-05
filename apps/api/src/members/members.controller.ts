import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  followKey,
  following,
  type Following,
  type FollowKey,
  memberProfile,
  type MemberProfile,
  memberUpdate,
  type MemberUpdate,
  peopleCount,
  type PeopleCount,
  viewerState,
  type ViewerState,
  FOLLOW_TARGETS,
} from "@workspace/shared";
import { CurrentUser, Public, type Session } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { openApi, ZodPipe } from "../common/zod.js";
import { MembersService } from "./members.service.js";

const targetParam = () => ApiParam({ name: "target", enum: FOLLOW_TARGETS });
const keyPipe = new ZodPipe(followKey);

@ApiTags("members")
@ApiCookieAuth()
@Controller()
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get("me")
  @Bit("account.get")
  @ApiOkResponse({ schema: openApi(memberProfile) })
  me(@CurrentUser() user: Session["user"]): Promise<MemberProfile> {
    return this.members.profile(user.id);
  }

  @Patch("me")
  @Bit("account.update")
  @ApiBody({ schema: openApi(memberUpdate, "input") })
  @ApiOkResponse({ schema: openApi(memberProfile) })
  update(
    @CurrentUser() user: Session["user"],
    @Body(new ZodPipe(memberUpdate)) input: MemberUpdate,
  ): Promise<MemberProfile> {
    return this.members.update(user.id, input);
  }

  @Delete("me")
  @Bit("account.delete")
  @HttpCode(204)
  async remove(@CurrentUser() user: Session["user"]): Promise<void> {
    await this.members.remove(user.id);
  }

  @Get("me/following")
  @Bit("follows.list")
  @ApiOkResponse({ schema: openApi(following) })
  following(@CurrentUser() user: Session["user"]): Promise<Following> {
    return this.members.following(user.id);
  }

  @Get("me/state/:target/:id")
  @Bit("follows.state")
  @targetParam()
  @ApiOkResponse({ schema: openApi(viewerState) })
  state(
    @CurrentUser() user: Session["user"],
    @Param(keyPipe) key: FollowKey,
  ): Promise<ViewerState> {
    return this.members.state(user.id, key);
  }

  @Put("me/follows/:target/:id")
  @Bit("follows.toggle")
  @targetParam()
  @ApiOkResponse({ schema: openApi(viewerState) })
  follow(
    @CurrentUser() user: Session["user"],
    @Param(keyPipe) key: FollowKey,
  ): Promise<ViewerState> {
    return this.members.follow(user.id, key, true);
  }

  @Delete("me/follows/:target/:id")
  @Bit("follows.toggle")
  @targetParam()
  @ApiOkResponse({ schema: openApi(viewerState) })
  unfollow(
    @CurrentUser() user: Session["user"],
    @Param(keyPipe) key: FollowKey,
  ): Promise<ViewerState> {
    return this.members.follow(user.id, key, false);
  }

  @Put("me/going/:slug")
  @Bit("rsvp.toggle")
  @ApiOkResponse({ schema: openApi(viewerState) })
  go(@CurrentUser() user: Session["user"], @Param("slug") slug: string): Promise<ViewerState> {
    return this.members.going(user.id, slug, true);
  }

  @Delete("me/going/:slug")
  @Bit("rsvp.toggle")
  @ApiOkResponse({ schema: openApi(viewerState) })
  notGoing(
    @CurrentUser() user: Session["user"],
    @Param("slug") slug: string,
  ): Promise<ViewerState> {
    return this.members.going(user.id, slug, false);
  }

  @Public()
  @Get("people/:target/:id")
  @Bit("follows.count")
  @Header("Cache-Control", "public, max-age=60")
  @targetParam()
  @ApiOkResponse({ schema: openApi(peopleCount) })
  people(@Param(keyPipe) key: FollowKey): Promise<PeopleCount> {
    return this.members.people(key);
  }

  // One-click unsubscribe (RFC 8058): mail apps POST here from the List-Unsubscribe header, and
  // the unsubscribe page on the site does the same after a click.
  @Public()
  @Post("unsubscribe")
  @Bit("notify.unsubscribe")
  @HttpCode(204)
  @ApiQuery({ name: "token", required: true })
  @ApiQuery({ name: "what", required: true, enum: ["alerts", "digest", "report"] })
  async unsubscribe(@Query("token") token = "", @Query("what") what = ""): Promise<void> {
    if (!/^[\w-]{20,64}$/.test(token) || !["alerts", "digest", "report"].includes(what)) {
      throw new NotFoundException();
    }
    const done = await this.members.unsubscribe(token, what as "alerts" | "digest" | "report");
    if (!done) throw new NotFoundException();
  }

  // The secret token in the URL is the key: calendar apps can't sign in.
  @Public()
  @Get("me/calendar/:token")
  @Bit("me.calendar")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @Header("Cache-Control", "private, max-age=300")
  @ApiProduces("text/calendar")
  @ApiOkResponse({ description: "iCalendar feed of everything the member follows" })
  calendar(@Param("token") token: string): Promise<string> {
    return this.members.calendar(token.replace(/\.ics$/, ""));
  }
}
