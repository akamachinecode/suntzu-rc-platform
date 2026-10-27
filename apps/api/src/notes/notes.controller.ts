import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { note, type Note, noteInput, type NoteInput } from "@workspace/shared";
import { CurrentUser, type Session } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { openApi, ZodPipe } from "../common/zod.js";
import { NotesService } from "./notes.service.js";

// Controllers only translate HTTP to service calls: validate input, pick the user, return data.
// Each route names its bit (docs/bits/) with @Bit(), so its log lines can be found by bit.
@ApiTags("notes")
@ApiCookieAuth()
@Controller("notes")
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  @Bit("notes.list")
  @ApiOkResponse({ schema: { type: "array", items: openApi(note) } })
  list(@CurrentUser() user: Session["user"]): Promise<Note[]> {
    return this.notes.list(user.id);
  }

  @Get(":id")
  @Bit("notes.get")
  @ApiOkResponse({ schema: openApi(note) })
  get(@CurrentUser() user: Session["user"], @Param("id", ParseUUIDPipe) id: string): Promise<Note> {
    return this.notes.get(user.id, id);
  }

  @Post()
  @Bit("notes.create")
  @ApiBody({ schema: openApi(noteInput, "input") })
  @ApiCreatedResponse({ schema: openApi(note) })
  create(
    @CurrentUser() user: Session["user"],
    @Body(new ZodPipe(noteInput)) input: NoteInput,
  ): Promise<Note> {
    return this.notes.create(user.id, input);
  }

  @Delete(":id")
  @Bit("notes.delete")
  @HttpCode(204)
  async remove(
    @CurrentUser() user: Session["user"],
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.notes.remove(user.id, id);
  }
}
