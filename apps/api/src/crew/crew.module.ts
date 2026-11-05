import { Module } from "@nestjs/common";
import { CrewController } from "./crew.controller.js";
import { CrewService } from "./crew.service.js";

/** The crew's console: review queue, decisions, inbox and feedback (spec 0001, slice 2). */
@Module({ controllers: [CrewController], providers: [CrewService] })
export class CrewModule {}
