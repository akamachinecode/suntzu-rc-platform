import { Module } from "@nestjs/common";
import { OrganiseController } from "./organise.controller.js";
import { OrganiseService } from "./organise.service.js";

/** The organiser kit: claim, verify, publish, keep places current (spec 0003, slice 4). */
@Module({ controllers: [OrganiseController], providers: [OrganiseService] })
export class OrganiseModule {}
