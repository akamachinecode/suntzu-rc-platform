import { Module } from "@nestjs/common";
import { PlacesController } from "./places.controller.js";
import { PlacesService } from "./places.service.js";

/** Places, clubs and tracks (docs/specs/0002-places.md). */
@Module({ controllers: [PlacesController], providers: [PlacesService], exports: [PlacesService] })
export class PlacesModule {}
