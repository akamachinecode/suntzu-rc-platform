import { Module } from "@nestjs/common";
import { MembersController } from "./members.controller.js";
import { MembersService } from "./members.service.js";

/** Members: settings, follows, "going" and the private calendar (docs/specs/0003-community.md). */
@Module({
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
