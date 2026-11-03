import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller.js";
import { SearchService } from "./search.service.js";

/** Search across the whole site (docs/specs/0005-search.md). */
@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
