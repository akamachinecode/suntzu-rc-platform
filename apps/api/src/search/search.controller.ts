import { Body, Controller, Get, Header, HttpCode, Post, Query } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  SEARCH_MILES,
  SEARCH_TYPES,
  searchMiss,
  type SearchMiss,
  searchMissInput,
  type SearchMissInput,
  searchQuery,
  type SearchQuery,
  searchResponse,
  type SearchResponse,
} from "@workspace/shared";
import { CrewOnly, Public } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { openApi, ZodPipe } from "../common/zod.js";
import { SearchService } from "./search.service.js";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  // The same answer for everyone, so it caches like the other public pages. The words searched
  // aren't logged: log lines carry the route only.
  @Public()
  @Get()
  @Bit("search.query")
  @Header("Cache-Control", "public, max-age=300")
  @ApiQuery({ name: "q", required: true, description: "What the visitor typed" })
  @ApiQuery({
    name: "type",
    required: false,
    enum: SEARCH_TYPES,
    isArray: true,
    description: "Only these kinds of result",
  })
  @ApiQuery({
    name: "miles",
    required: false,
    enum: [...SEARCH_MILES],
    description: "Radius around a town or ZIP",
  })
  @ApiQuery({ name: "limit", required: false, description: "1 to 30, 10 by default" })
  @ApiOkResponse({ schema: openApi(searchResponse) })
  find(@Query(new ZodPipe(searchQuery)) query: SearchQuery): Promise<SearchResponse> {
    return this.search.search(query);
  }

  // The browser reports a search that found nothing or little; the API searches again and counts
  // it only if it still does. Never cached, and it keeps nothing about who searched.
  @Public()
  @Post("misses")
  @Bit("search.misses")
  @HttpCode(204)
  @ApiBody({ schema: openApi(searchMissInput, "input") })
  async miss(@Body(new ZodPipe(searchMissInput)) input: SearchMissInput): Promise<void> {
    await this.search.recordMiss(input.q);
  }

  @CrewOnly()
  @ApiCookieAuth()
  @Get("misses")
  @Bit("search.misses")
  @ApiOkResponse({ schema: { type: "array", items: openApi(searchMiss) } })
  misses(): Promise<SearchMiss[]> {
    return this.search.misses();
  }
}
