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
import { openApi, ZodPipe } from "../common/zod.js";
import { NotesService } from "./notes.service.js";

// Controllers only translate HTTP to service calls: validate input, pick the user, return data.
@ApiTags("notes")
@ApiCookieAuth()
@Controller("notes")
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  @ApiOkResponse({ schema: { type: "array", items: openApi(note) } })
  list(@CurrentUser() user: Session["user"]): Promise<Note[]> {
    return this.notes.list(user.id);
  }

  @Get(":id")
  @ApiOkResponse({ schema: openApi(note) })
  get(@CurrentUser() user: Session["user"], @Param("id", ParseUUIDPipe) id: string): Promise<Note> {
    return this.notes.get(user.id, id);
  }

  @Post()
  @ApiBody({ schema: openApi(noteInput, "input") })
  @ApiCreatedResponse({ schema: openApi(note) })
  create(
    @CurrentUser() user: Session["user"],
    @Body(new ZodPipe(noteInput)) input: NoteInput,
  ): Promise<Note> {
    return this.notes.create(user.id, input);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @CurrentUser() user: Session["user"],
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.notes.remove(user.id, id);
  }
}
