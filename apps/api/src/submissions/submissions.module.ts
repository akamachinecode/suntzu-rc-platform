import { Module } from "@nestjs/common";
import { SubmissionsController } from "./submissions.controller.js";
import { SubmissionsService } from "./submissions.service.js";

/** Members send events by link or text (spec 0003, slice 3). */
@Module({ controllers: [SubmissionsController], providers: [SubmissionsService] })
export class SubmissionsModule {}
