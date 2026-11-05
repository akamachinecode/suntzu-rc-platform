import { Module } from "@nestjs/common";
import { NewcomersController } from "./newcomers.controller.js";
import { NewcomersService } from "./newcomers.service.js";

/** "Try it": newcomers reach a nearby club (spec 0003, slice 5). */
@Module({ controllers: [NewcomersController], providers: [NewcomersService] })
export class NewcomersModule {}
